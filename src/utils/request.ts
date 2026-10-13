import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import cookies from 'js-cookie'

import router from '@/router'
import setToast from './setToast'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from '@/types'

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000,
})

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

    // 注：此处先取 store，再回退到 cookie
    // 否则会变得不幸（逃
    const userId = Number(authStore.userInfo?.user_id ?? cookies.get('user_id'))
    const refreshToken = authStore.refreshToken || cookies.get('refresh_token') || ''
    if (!userId || !refreshToken) {
        return false
    }

    try {
        const resp = await instance.request<ApiResponse<{ token: string; refresh_token: string }>>({
            url: '/auth/refresh',
            method: 'POST',
            data: { refresh_token: refreshToken },
            headers: authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {},
        })

        if (resp.data.code == 200) {
            const { token, refresh_token } = resp.data.data
            cookies.set('token', token, { expires: 20, secure: true, sameSite: 'Lax', path: '/' })
            cookies.set('refresh_token', refresh_token, { expires: 20, secure: true, sameSite: 'Lax', path: '/' })
            authStore.token = token
            authStore.refreshToken = refresh_token
            console.log('[request] 已刷新 token')
            return true
        }
        return false
    } catch {
        return false
    }
}

function clearAuth() {
    cookies.remove('token', { path: '/' })
    cookies.remove('refresh_token', { path: '/' })
    cookies.remove('user_id', { path: '/' })
    try {
        const authStore = useAuthStore()
        authStore.token = ''
        authStore.refreshToken = ''
        authStore.isAuthed = false
        authStore.userInfo = null
    } catch {
        // pinia 尚未就绪时忽略
    }
}

async function refreshAndRetry(config: InternalAxiosRequestConfig): Promise<AxiosResponse | null> {
    const ok = await ensureFreshToken()
    // 刷新失败，清理登录态跳转登录页
    if (!ok) {
        clearAuth()
        setToast('error', '登录已过期', '请重新登录')
        if (router.currentRoute.value.path !== '/auth') {
            router.push('/auth')
        }
        return null
    }

    config.headers.Authorization = `Bearer ${useAuthStore().token}`
    // 仍 401 会再次进入响应拦截器，造成递归刷新
    return axios.request({ ...config, baseURL: import.meta.env.VITE_API_URL })
}

instance.interceptors.response.use(
    // 检测 401
    async (response) => {
        if (response.data?.code === 401 && !response.config?.url?.startsWith('/auth/')) {
            return (await refreshAndRetry(response.config)) ?? response
        }
        return response
    },
    async (error) => {
        const { config, response } = error
        const expired = response?.status === 401 || response?.data?.code === 401
        if (!expired || !config || config.url?.startsWith('/auth/')) {
            return Promise.reject(error)
        }

        return (await refreshAndRetry(config)) ?? Promise.reject(error)
    }
)

/**
 * 统一请求入口：不抛异常，网络 / 超时失败时返回 undefined，调用方需判空
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
                token = authStore.token || ''
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
