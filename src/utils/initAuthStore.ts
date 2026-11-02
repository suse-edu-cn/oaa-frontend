import { getCurrentUser } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { UserInfo } from '@/types'

// 按会话代际区分并共享初始化
let inflight: { epoch: number; promise: Promise<void> } | null = null

export function initAuthStore(): Promise<void> {
    const authStore = useAuthStore()
    // token 变化，清除旧用户信息并递增 epoch
    authStore.hydrate()

    const epoch = authStore.epoch
    if (inflight?.epoch === epoch) return inflight.promise

    const promise = doInitAuthStore(epoch).finally(() => {
        if (inflight?.epoch === epoch) inflight = null
    })
    inflight = { epoch, promise }
    return promise
}

async function doInitAuthStore(epochAtStart: number): Promise<void> {
    const authStore = useAuthStore()

    if (authStore.token) {
        try {
            const stateResp = await getCurrentUser()
            // 期间登录 / 登出过直接丢弃
            if (authStore.epoch !== epochAtStart) return

            if (stateResp?.code == 200) {
                const info: UserInfo = { ...stateResp.data }
                info.avatar = stateResp.data.avatar || { uri: '', url: '' }
                info.department = stateResp.data.department || '未设置职位'

                authStore.setUserInfo(info)
            } else if (stateResp?.code === 401) {
                // 仅后端 401 拒绝再清空登录态
                authStore.clearSession()
                return
            }
        } catch (e) {
            console.warn(e)
        }
    }

    authStore.markReady(epochAtStart)
}
