import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'

import type { RouteMeta } from 'vue-router'

export interface GuardRoute {
    meta: RouteMeta
}

export async function authGuard(to: GuardRoute): Promise<true | string> {
    const authStore = useAuthStore()
    if (!authStore.isReady || !authStore.token) {
        authStore.hydrate()
    }

    if (to.meta.requiresAuth !== false && !authStore.hasSession) {
        setToast('error', '未登录', '请先登录以访问该页面')
        return '/auth'
    }

    const requiredLevel = to.meta.level
    if (requiredLevel && authStore.hasSession) {
        // 权限等级需要用户信息，须等初始化完成
        if (!authStore.isReady) await initAuthStore()
        if (!authStore.hasSession) {
            return '/auth'
        }
        if ((authStore.userInfo?.role_level ?? 0) < requiredLevel) {
            setToast('warn', '无访问权限', '你当前的权限等级不足以访问该页面')
            return '/403'
        }
    }

    return true
}
