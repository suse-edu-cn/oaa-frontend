import { getCurrentUser } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { UserInfo } from '@/types'

// 共享同一次初始化
let initPromise: Promise<void> | null = null

export function initAuthStore(): Promise<void> {
    // 初始化完成后清空；调用方通常在 isReady=false 时才会进来
    if (!initPromise) {
        initPromise = doInitAuthStore().finally(() => {
            initPromise = null
        })
    }
    return initPromise
}

async function doInitAuthStore() {
    const authStore = useAuthStore()
    // hydrate 在 token 变化时会清掉旧用户信息，后续请求才能带上正确的 Authorization
    authStore.hydrate()

    if (authStore.token) {
        try {
            const stateResp = await getCurrentUser()
            if (stateResp?.code == 200) {
                const info: UserInfo = { ...stateResp.data }
                info.avatar = stateResp.data.avatar || { uri: '', url: '' }
                info.department = stateResp.data.department || '未设置职位'

                authStore.setUserInfo(info)
            } else if (stateResp) {
                // 仅在后端明确拒绝时清空登录态，网络失败时保留 token
                authStore.clearSession()
            }
        } catch (e) {
            console.warn(e)
        }
    }

    authStore.markReady()
}
