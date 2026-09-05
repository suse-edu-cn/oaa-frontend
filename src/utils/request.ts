import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import cookies from 'js-cookie'
import router from '@/router'

import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from '@/types'
import setToast from './setToast'

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000,
})

function isAuth(url?: string) {
    return Boolean(url?.startsWith('/auth/'))
}

// 并发的 401 共享同一次刷新，避免竞态
let refreshing: Promise<boolean> | null = null
const retried = new WeakSet()

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
            data: {
                refresh_token: refreshToken,
                user_id: userId,
                device: 'web',
            },
            headers: authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {},
        })

        if (resp.data.code == 200) {
            const { token, refresh_token } = resp.data.data
            cookies.set('token', token, { expires: 20, secure: true, sameSite: 'Lax', path: '/' })
            cookies.set('refresh_token', refresh_token, { expires: 20, secure: true, sameSite: 'Lax', path: '/' })
            authStore.token = token
            authStore.refreshToken = refresh_token
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
    // 刷新成功
    retried.add(config)
    refreshing = refreshing || doRefresh()
    const ok = await refreshing.finally(() => {
        refreshing = null
    })
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
    return instance.request(config)
}

instance.interceptors.response.use(
    // 以下是检测 401 的业务代码
    async (response) => {
        if (response.data?.code === 401 && !isAuth(response.config?.url) && !retried.has(response.config)) {
            return (await refreshAndRetry(response.config)) ?? response
        }
        return response
    },
    async (error) => {
        const { config, response } = error
        const expired = response?.status === 401 || response?.data?.code === 401
        if (!expired || !config || retried.has(config) || isAuth(config.url)) {
            return Promise.reject(error)
        }

        return (await refreshAndRetry(config)) ?? Promise.reject(error)
    }
)

const request = async function <T = any>(config: {
    url: string
    method?: 'GET' | 'POST'
    data?: any
    params?: any
    token?: string
}): Promise<T> {
    try {
        // 优先使用调用时提供的 token
        let token = config.token || ''
        if (!token) {
            try {
                const authStore = useAuthStore()
                token = authStore.token || ''
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
        })
        return response.data
    } catch (error: any) {
        return error.response?.data
    }
}

export default request
