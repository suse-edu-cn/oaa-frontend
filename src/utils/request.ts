import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/stores/auth'
import { clearSessionCookies, readSession } from './session'
import type { RouteMeta } from 'vue-router'
import type { ApiResponse } from '@/types'

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000,
})

/** 挂在 axios config 上的鉴权元信息，用于判断 401 是否仍属于当前会话 */
interface AuthMeta {
    _retry?: boolean
    _token?: string
    _epoch?: number
}

type RetryableConfig = InternalAxiosRequestConfig & AuthMeta

/** ok 刷新成功，stale 会话已变，rejected 后端 401 拒绝，failed 暂时由网络或 5xx 失败 */
type RefreshResult = 'ok' | 'stale' | 'rejected' | 'failed'

export interface RequestAuthConfig {
    /** 当前路由，用于判断是否在公开页 / 登录页 */
    getCurrentRoute: () => { path: string; meta: RouteMeta; matched: readonly unknown[] }
    redirectToAuth: () => void
    notify: (summary: string, detail: string) => void
}

let authConfig: RequestAuthConfig | null = null

export function configureRequestAuth(config: RequestAuthConfig | null): void {
    authConfig = config
}

// 校验 token 是否过期
function isTokenExpired(token: string): boolean {
    let exp: number | null
    try {
        const b64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')
        const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))))
        exp = typeof payload.exp === 'number' ? payload.exp : null
    } catch {
        exp = null
    }
    return exp !== null && Date.now() / 1000 >= exp
}

// 按 epoch 隔离同一次会话的并发 401 共享刷新
let refreshTask: { epoch: number; promise: Promise<RefreshResult> } | null = null

function ensureFreshToken(epoch: number): Promise<RefreshResult> {
    if (refreshTask?.epoch === epoch) return refreshTask.promise

    const promise = doRefresh(epoch).finally(() => {
        if (refreshTask?.epoch === epoch) refreshTask = null
    })
    refreshTask = { epoch, promise }
    return promise
}

async function doRefresh(epoch: number): Promise<RefreshResult> {
    const authStore = useAuthStore()

    const refreshToken = authStore.refreshToken || readSession().refreshToken
    if (!refreshToken) return 'rejected'

    try {
        const resp = await instance.request<ApiResponse<{ token: string; refresh_token: string }>>({
            url: '/auth/refresh',
            method: 'POST',
            data: { refresh_token: refreshToken },
        })

        if (authStore.epoch !== epoch) return 'stale'
        if (resp.data.code == 200) {
            const { token, refresh_token } = resp.data.data
            authStore.applyTokens({ token, refreshToken: refresh_token })
            return 'ok'
        }
        return resp.data.code === 401 || resp.data.code === 403 ? 'rejected' : 'failed'
    } catch (error) {
        if (authStore.epoch !== epoch) return 'stale'
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        return status === 401 || status === 403 ? 'rejected' : 'failed'
    }
}

function clearAuth(): void {
    try {
        useAuthStore().clearSession()
    } catch {
        // pinia 尚未就绪时至少把 cookie 清掉
        clearSessionCookies()
    }
}

// 只在需要登录且刷新 token 失败才跳转 /auth
function handleAuthExpired(): void {
    if (!authConfig) return

    const current = authConfig.getCurrentRoute()
    if (!current.matched.length) return
    if (current.meta.requiresAuth === false) return
    if (current.path === '/auth') return

    authConfig.notify('登录已过期', '请重新登录')
    authConfig.redirectToAuth()
}

/** 会话失效，仅限仍处于发起时的 epoch */
function expireSession(epoch: number): void {
    if (useAuthStore().epoch !== epoch) return
    clearAuth()
    handleAuthExpired()
}

// /auth/* 以及已经重试过的请求不再触发刷新
function shouldRefresh(config?: InternalAxiosRequestConfig): boolean {
    if (!config) return false
    if (config.url?.startsWith('/auth/')) return false
    return !(config as RetryableConfig)._retry
}

/** 用当前会话的 token 重放一次 */
function replayWithCurrentToken(config: RetryableConfig): Promise<AxiosResponse> {
    const authStore = useAuthStore()
    config._retry = true
    config._token = authStore.token
    config._epoch = authStore.epoch
    config.headers.Authorization = `Bearer ${authStore.token}`
    return instance.request(config)
}

async function refreshAndRetry(config: RetryableConfig): Promise<AxiosResponse | null> {
    const authStore = useAuthStore()
    const requestToken = config._token ?? ''

    // 如果请求发出后会话已更换
    if (requestToken !== authStore.token) {
        return authStore.token ? replayWithCurrentToken(config) : null
    }
    // 匿名请求的 401 与任何会话无关
    if (!requestToken) return null

    const epoch = authStore.epoch
    const result = await ensureFreshToken(epoch)

    if (result === 'stale') {
        return authStore.token ? replayWithCurrentToken(config) : null
    }
    if (result === 'ok') {
        return replayWithCurrentToken(config)
    }
    if (result === 'rejected') {
        expireSession(epoch)
    }
    // rejected / failed
    return null
}

instance.interceptors.response.use(
    // 检测 401
    async (response) => {
        if (response.data?.code === 401 && shouldRefresh(response.config)) {
            return (await refreshAndRetry(response.config as RetryableConfig)) ?? response
        }
        return response
    },
    async (error) => {
        const { config, response } = error
        const expired = response?.status === 401 || response?.data?.code === 401
        if (!expired || !shouldRefresh(config)) {
            return Promise.reject(error)
        }

        return (await refreshAndRetry(config as RetryableConfig)) ?? Promise.reject(error)
    }
)

/**
 * 统一 API 请求入口
 *
 * 网络 / 超时失败时返回 undefined，调用方需自行判空
 * 失败提示交给 utils/apiError.ts 的 toastApiError
 */
const request = async function <T = any>(config: {
    url: string
    method?: 'GET' | 'POST'
    data?: any
    params?: any
    token?: string
    timeout?: number
    responseType?: 'json' | 'blob'
}): Promise<T | undefined> {
    try {
        // 优先使用调用时提供的 token
        let token = config.token || ''
        let epoch = 0
        if (!token) {
            try {
                const authStore = useAuthStore()
                if (!authStore.token) authStore.hydrate()
                token = authStore.token
                // token 过期时静默刷新
                if (token && isTokenExpired(token)) {
                    const expireEpoch = authStore.epoch
                    const result = await ensureFreshToken(expireEpoch)
                    if (result === 'rejected') {
                        expireSession(expireEpoch)
                        return undefined
                    }
                    token = authStore.token || token
                }
                epoch = authStore.epoch
            } catch (e) {
                console.warn(e)
            }
        }
        const axiosConfig: AxiosRequestConfig & AuthMeta = {
            url: config.url,
            method: config.method || 'GET',
            data: config.data || {},
            params: config.params || {},
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            timeout: config.timeout,
            responseType: config.responseType,
            _token: token,
            _epoch: epoch,
        }
        const response = await instance.request<T>(axiosConfig)
        return response.data
    } catch (error: unknown) {
        // HTTP 错误仍把后端响应体交给调用方
        return axios.isAxiosError(error) ? (error.response?.data as T | undefined) : undefined
    }
}

export default request
