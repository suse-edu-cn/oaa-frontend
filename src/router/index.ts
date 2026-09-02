import { createRouter, createWebHistory } from 'vue-router'
import cookies from 'js-cookie'

import setToast from '@/utils/setToast'
import HomeView from '@/views/AppHome.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: HomeView },

        // 个人
        { path: '/auth', component: () => import('@/views/UserAuth.vue') },
        {
            path: '/user',
            component: () => import('@/views/UserHome.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/user/edit',
            component: () => import('@/views/UserEdit.vue'),
            meta: { requiresAuth: true },
        },
        // 管理
        {
            path: '/manage/users',
            component: () => import('@/views/ManageUsers.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/manage/org',
            component: () => import('@/views/ManageOrg.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/manage/term',
            component: () => import('@/views/ManageTerm.vue'),
            meta: { requiresAuth: true },
        },
        // 设置
        {
            path: '/settings',
            component: () => import('@/views/AppSettings.vue'),
            meta: { requiresAuth: true },
        },
    ],
})

router.beforeEach((to) => {
    const isAuthed = Boolean(cookies.get('token'))
    if (to.meta.requiresAuth && !isAuthed) {
        setToast('error', '未登录', '请先登录以访问该页面')
        return '/auth'
    }

    return true
})

export default router
