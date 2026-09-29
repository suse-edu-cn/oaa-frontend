import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'
import cookies from 'js-cookie'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

import setToast from '@/utils/setToast'
import HomeView from '@/views/home/index.vue'

// 路由切换顶部加载条
NProgress.configure({ showSpinner: false })

const router = createRouter({
    // 注：SSG 需要使用内存路由
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
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
        { path: '/announcement/edit/:id', component: () => import('@/views/announcement/edit.vue') },
        { path: '/announcement/:id', component: () => import('@/views/announcement/view.vue') },
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
    // 预渲染环境无 document，且首页为公开页面，跳过鉴权与进度条
    if (import.meta.env.SSR) return true

    NProgress.start()

    const isAuthed = Boolean(cookies.get('token'))
    if (to.meta.requiresAuth !== false && !isAuthed) {
        setToast('error', '未登录', '请先登录以访问该页面')
        return '/auth'
    }

    return true
})

router.afterEach(() => {
    if (import.meta.env.SSR) return

    NProgress.done()
})

// chunk 加载失败（如发版后旧 hash 失效）时收起，避免进度条卡住
router.onError(() => {
    NProgress.done()
})

export default router
