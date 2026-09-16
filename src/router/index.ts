import { createRouter, createWebHistory } from 'vue-router'
import cookies from 'js-cookie'

import setToast from '@/utils/setToast'
import HomeView from '@/views/home/index.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: HomeView, meta: { requiresAuth: false } },

        // 个人
        { path: '/auth', component: () => import('@/views/user/auth.vue'), meta: { requiresAuth: false } },
        { path: '/user', component: () => import('@/views/user/index.vue') },
        { path: '/user/edit', component: () => import('@/views/user/edit.vue') },
        // 管理
        { path: '/manage/users', component: () => import('@/views/manage/users.vue') },
        { path: '/manage/org', component: () => import('@/views/manage/org.vue') },
        { path: '/manage/term', component: () => import('@/views/manage/term.vue') },
        // 公告
        { path: '/announcement/manage', component: () => import('@/views/announcement/manage.vue') },
        { path: '/announcement/new', component: () => import('@/views/announcement/new.vue') },
        // 招新换届申请
        { path: '/apply', component: () => import('@/views/apply/index.vue') },
        { path: '/apply/new', component: () => import('@/views/apply/new.vue') },
        { path: '/apply/edit/:id', component: () => import('@/views/apply/edit.vue') },
        { path: '/apply/review', component: () => import('@/views/apply/review.vue') },
        { path: '/apply/staff', component: () => import('@/views/apply/staff.vue') },
        // 设置
        { path: '/settings', component: () => import('@/views/settings/index.vue') },
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
