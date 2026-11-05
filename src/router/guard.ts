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
    const requiresInterviewer = to.meta.requiresInterviewer === true
    if ((!requiredLevel && !requiresInterviewer) || !authStore.hasSession) {
        return true
    }

    // 等级 / 面试官判断都依赖用户信息，如果缺失就需要加载
    if (!authStore.userInfo) {
        await initAuthStore()
    }
    if (!authStore.hasSession) {
        return '/auth'
    }

    const level = authStore.userInfo?.role_level
    // 仍拿不到用户信息时不按 0 级处理
    if (typeof level === 'number' && requiredLevel && level < requiredLevel) {
        setToast('warn', '无访问权限', '你当前的权限等级不足以访问该页面')
        return '/403'
    }
    // 面试官限制可被高等级管理员绕过
    // 80 为副会长权限等级，即副会长及以上即使没有分配 isInterviewer 也能访问
    const canInterview = authStore.isInterviewer || (typeof level === 'number' && level >= 80)
    if (requiresInterviewer && !canInterview) {
        setToast('warn', '无访问权限', '仅面试官可访问该页面')
        return '/403'
    }

    return true
}
