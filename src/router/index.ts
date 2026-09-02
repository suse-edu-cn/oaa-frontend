import { createRouter, createWebHistory } from 'vue-router'
import cookies from 'js-cookie'

import setToast from '@/utils/setToast'
import HomeView from '@/views/AppHome.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: HomeView, meta: { requiresAuth: false } },

        // 个人
        { path: '/auth', component: () => import('@/views/UserAuth.vue'), meta: { requiresAuth: false } },
        { path: '/user', component: () => import('@/views/UserHome.vue') },
        { path: '/user/edit', component: () => import('@/views/UserEdit.vue') },
        // 管理
        { path: '/manage/users', component: () => import('@/views/ManageUsers.vue') },
        { path: '/manage/org', component: () => import('@/views/ManageOrg.vue') },
        { path: '/manage/term', component: () => import('@/views/ManageTerm.vue') },
        // 设置
        { path: '/settings', component: () => import('@/views/AppSettings.vue') },
    ],
})

router.beforeEach((to) => {
    const isAuthed = Boolean(cookies.get('token'))
    // requiresAuth 缺省视为需要登录，仅公开路由显式声明 false
    if (to.meta.requiresAuth !== false && !isAuthed) {
        setToast('error', '未登录', '请先登录以访问该页面')
        return '/auth'
    }

    return true
})

export default router
