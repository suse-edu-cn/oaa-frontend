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
    if (!requiredLevel || !authStore.hasSession) {
        return true
    }

    // 等级判断依赖用户信息，如果缺失就需要加载
    if (!authStore.userInfo) {
        await initAuthStore()
    }
    if (!authStore.hasSession) {
        return '/auth'
    }

    const level = authStore.userInfo?.role_level
    // 仍拿不到用户信息时不按 0 级处理
    if (typeof level !== 'number') {
        return true
    }
    if (level < requiredLevel) {
        setToast('warn', '无访问权限', '你当前的权限等级不足以访问该页面')
        return '/403'
    }

    return true
}
