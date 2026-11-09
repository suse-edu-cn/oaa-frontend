import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'

import type { RouteLocationRaw, RouteMeta } from 'vue-router'

export interface GuardRoute {
    meta: RouteMeta
    /** 当前完整路径，用于登录后回跳；测试可省略 */
    fullPath?: string
}

/** 跳转登录页并带上回跳参数 */
function toAuthLocation(to: GuardRoute): RouteLocationRaw {
    const redirect = to.fullPath && to.fullPath !== '/auth' ? to.fullPath : ''
    return redirect ? { path: '/auth', query: { redirect } } : '/auth'
}

export async function authGuard(to: GuardRoute): Promise<true | RouteLocationRaw> {
    const authStore = useAuthStore()
    if (!authStore.isReady || !authStore.token) {
        authStore.hydrate()
    }

    if (to.meta.requiresAuth !== false && !authStore.hasSession) {
        setToast('error', '未登录', '请先登录以访问该页面')
        return toAuthLocation(to)
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
        return toAuthLocation(to)
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
