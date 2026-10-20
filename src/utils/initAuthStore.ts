import { getCurrentUser } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { UserInfo } from '@/types'

// 共享同一次初始化
let initPromise: Promise<void> | null = null
// 初始化版本与身份版本，用于丢弃旧登录态返回的过期响应
let initVersion = 0
let initSessionVersion = -1

export function initAuthStore(): Promise<void> {
    const authStore = useAuthStore()
    // hydrate 在 token 变化时会清掉旧用户信息，必须先于下面的版本比较执行
    authStore.hydrate()
    const sessionVersion = authStore.sessionVersion

    // 同一身份版本的并发调用共享同一次请求
    // 登录 / 登出会递增版本，必须重新初始化
    if (initPromise && sessionVersion === initSessionVersion) {
        return initPromise
    }

    const version = ++initVersion
    initSessionVersion = sessionVersion
    const promise = doInitAuthStore(version, sessionVersion).finally(() => {
        // 旧初始化完成时不要清掉新初始化的 promise
        if (initPromise === promise) initPromise = null
    })
    initPromise = promise
    return promise
}

async function doInitAuthStore(version: number, sessionVersion: number) {
    const authStore = useAuthStore()

    if (authStore.token) {
        try {
            const stateResp = await getCurrentUser()
            if (version !== initVersion) return

            // 身份变动旧响应不能再写回 store，token 刷新不会改变 sessionVersion
            if (authStore.sessionVersion === sessionVersion) {
                if (stateResp?.code == 200) {
                    const info: UserInfo = { ...stateResp.data }
                    info.avatar = stateResp.data.avatar || { uri: '', url: '' }
                    info.department = stateResp.data.department || '未设置职位'

                    authStore.setUserInfo(info)
                } else if (stateResp) {
                    // 仅在后端明确拒绝时清空登录态，网络失败时保留 token
                    authStore.clearSession()
                }
            }
        } catch (e) {
            console.warn(e)
        }
    }

    if (version === initVersion) {
        authStore.markReady()
    }
}
