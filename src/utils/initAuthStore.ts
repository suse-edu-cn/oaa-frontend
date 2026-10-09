import cookies from 'js-cookie'

import { getCurrentUser } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { UserInfo } from '@/types'

// 共享同一次初始化
let initPromise: Promise<void> | null = null

export function initAuthStore(): Promise<void> {
    // 初始化完成后清空
    if (!initPromise) {
        initPromise = doInitAuthStore().finally(() => {
            initPromise = null
        })
    }
    return initPromise
}

async function doInitAuthStore() {
    const authStore = useAuthStore()
    const token = cookies.get('token')

    // 如果 cookie 里有 token，则尝试获取用户信息
    if (token) {
        authStore.token = token
        authStore.refreshToken = cookies.get('refresh_token') || ''
        try {
            const stateResp = await getCurrentUser()
            if (stateResp?.code == 200) {
                const info: UserInfo = { ...stateResp.data }
                info.avatar = stateResp.data.avatar || { uri: '', url: '' }
                info.department = stateResp.data.department || '未设置职位'

                authStore.isAuthed = true
                authStore.userInfo = info
                // cookie 存储 user_id，以防 token 过期后刷新
                cookies.set('user_id', String(info.user_id), {
                    expires: 20,
                    secure: true,
                    sameSite: 'Lax',
                    path: '/',
                })
            } else if (stateResp) {
                // 仅在后端明确拒绝时清空登录态，网络失败时保留 token 以便下次重试
                authStore.token = ''
                cookies.remove('token')
            }
        } catch (e) {
            console.warn(e)
        }
    }

    // 设置 isReady，此时 authStore 已经初始化完成
    authStore.isReady = true
}
