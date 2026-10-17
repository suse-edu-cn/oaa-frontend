import cookies from 'js-cookie'

import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'

import type { RouteMeta } from 'vue-router'

export interface GuardRoute {
    meta: RouteMeta
}

export async function authGuard(to: GuardRoute): Promise<true | string> {
    const isAuthed = Boolean(cookies.get('token'))
    if (to.meta.requiresAuth !== false && !isAuthed) {
        setToast('error', '未登录', '请先登录以访问该页面')
        return '/auth'
    }

    const requiredLevel = to.meta.level
    if (requiredLevel && isAuthed) {
        const authStore = useAuthStore()
        if (!authStore.isReady) await initAuthStore()
        if (!cookies.get('token')) {
            return '/auth'
        }
        if ((authStore.userInfo?.role_level ?? 0) < requiredLevel) {
            setToast('warn', '无访问权限', '你当前的权限等级不足以访问该页面')
            return '/403'
        }
    }

    return true
}
