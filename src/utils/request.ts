import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/stores/auth'
import { clearSessionCookies, readSession } from './session'
import type { RouteMeta } from 'vue-router'
import type { ApiResponse } from '@/types'

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000,
})

interface RetryableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean
}

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

// 并发的 401 共享刷新避免竞态
let refreshing: Promise<boolean> | null = null
// 刷新入口
function ensureFreshToken(): Promise<boolean> {
    refreshing = refreshing || doRefresh()
    return refreshing.finally(() => {
        refreshing = null
    })
}

async function doRefresh(): Promise<boolean> {
    const authStore = useAuthStore()
    const session = readSession()

    const userId = Number(authStore.userInfo?.user_id ?? session.userId)
    const refreshToken = authStore.refreshToken || session.refreshToken
    if (!userId || !refreshToken) {
        return false
    }

    try {
        const requestToken = authStore.token || session.token
        const resp = await instance.request<ApiResponse<{ token: string; refresh_token: string }>>({
            url: '/auth/refresh',
            method: 'POST',
            data: { refresh_token: refreshToken },
            headers: requestToken ? { Authorization: `Bearer ${requestToken}` } : {},
        })

        if (resp.data.code == 200) {
            const { token, refresh_token } = resp.data.data
            authStore.applyTokens({ token, refreshToken: refresh_token })
            return true
        }
        return false
    } catch {
        return false
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

// /auth/* 以及已经重试过的请求不再触发刷新
function shouldRefresh(config?: InternalAxiosRequestConfig): boolean {
    if (!config) return false
    if (config.url?.startsWith('/auth/')) return false
    return !(config as RetryableConfig)._retry
}

async function refreshAndRetry(config: InternalAxiosRequestConfig): Promise<AxiosResponse | null> {
    const ok = await ensureFreshToken()
    if (!ok) {
        clearAuth()
        handleAuthExpired()
        return null
    }

    const retryConfig = config as RetryableConfig
    retryConfig._retry = true
    retryConfig.headers.Authorization = `Bearer ${useAuthStore().token}`
    return instance.request(retryConfig)
}

instance.interceptors.response.use(
    // 检测 401
    async (response) => {
        if (response.data?.code === 401 && shouldRefresh(response.config)) {
            return (await refreshAndRetry(response.config)) ?? response
        }
        return response
    },
    async (error) => {
        const { config, response } = error
        const expired = response?.status === 401 || response?.data?.code === 401
        if (!expired || !shouldRefresh(config)) {
            return Promise.reject(error)
        }

        return (await refreshAndRetry(config)) ?? Promise.reject(error)
    }
)

/**
 * 统一请求入口
 *
 * 不抛异常，网络 / 超时失败时返回 undefined，调用方需判空
 */
const request = async function <T = any>(config: {
    url: string
    method?: 'GET' | 'POST'
    data?: any
    params?: any
    token?: string
    timeout?: number
}): Promise<T | undefined> {
    try {
        // 优先使用调用时提供的 token
        let token = config.token || ''
        if (!token) {
            try {
                const authStore = useAuthStore()
                if (!authStore.token) authStore.hydrate()
                token = authStore.token
                // token 过期时静默刷新
                if (token && isTokenExpired(token)) {
                    const ok = await ensureFreshToken()
                    if (ok) token = useAuthStore().token
                }
            } catch (e) {
                console.warn(e)
            }
        }
        const response = await instance.request<T>({
            url: config.url,
            method: config.method || 'GET',
            data: config.data || {},
            params: config.params || {},
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            timeout: config.timeout,
        })
        return response.data
    } catch (error: any) {
        return error.response?.data
    }
}

export default request
