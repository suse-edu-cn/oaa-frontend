import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'
import cookies from 'js-cookie'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
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
        {
            path: '/auth',
            component: () => import('@/views/user/auth.vue'),
            meta: { requiresAuth: false, title: '登录' },
        },
        { path: '/user', component: () => import('@/views/user/index.vue'), meta: { title: '个人中心' } },
        { path: '/user/edit', component: () => import('@/views/user/edit.vue'), meta: { title: '编辑个人资料' } },
        // 管理
        { path: '/manage/users', component: () => import('@/views/manage/users.vue'), meta: { title: '用户管理' } },
        { path: '/manage/org', component: () => import('@/views/manage/org.vue'), meta: { title: '组织管理' } },
        { path: '/manage/term', component: () => import('@/views/manage/term.vue'), meta: { title: '招新/换届管理' } },
        // 公告
        {
            path: '/announcement/manage',
            component: () => import('@/views/announcement/manage.vue'),
            meta: { title: '公告管理' },
        },
        {
            path: '/announcement/new',
            component: () => import('@/views/announcement/new.vue'),
            meta: { title: '新建公告' },
        },
        {
            path: '/announcement/edit/:id',
            component: () => import('@/views/announcement/edit.vue'),
            meta: { title: '编辑公告' },
        },
        {
            path: '/announcement/:id',
            component: () => import('@/views/announcement/view.vue'),
            meta: { title: '公告详情' },
        },
        // 招新换届申请
        { path: '/apply', component: () => import('@/views/apply/index.vue'), meta: { title: '我的申请' } },
        { path: '/apply/new', component: () => import('@/views/apply/new.vue'), meta: { title: '添加新申请' } },
        { path: '/apply/edit/:id', component: () => import('@/views/apply/edit.vue'), meta: { title: '编辑申请' } },
        { path: '/apply/review', component: () => import('@/views/apply/review.vue'), meta: { title: '审核申请' } },
        { path: '/apply/staff', component: () => import('@/views/apply/staff.vue'), meta: { title: '面试官管理' } },
        // 设置
        { path: '/settings', component: () => import('@/views/settings/index.vue'), meta: { title: '设置' } },

        // 403
        {
            path: '/403',
            component: () => import('@/views/error/403.vue'),
            meta: { requiresAuth: false, title: '403' },
        },

        // 404
        {
            path: '/:pathMatch(.*)*',
            component: () => import('@/views/error/404.vue'),
            meta: { requiresAuth: false, title: '404' },
        },
    ],
})

router.beforeEach(async (to) => {
    // 预渲染环境无 document，且首页为公开页面，跳过鉴权与进度条
    if (import.meta.env.SSR) return true

    NProgress.start()

    const isAuthed = Boolean(cookies.get('token'))
    if (to.meta.requiresAuth !== false && !isAuthed) {
        setToast('error', '未登录', '请先登录以访问该页面')
        return '/auth'
    }

    // 权限等级校验
    if (to.meta.level && isAuthed) {
        const authStore = useAuthStore()
        if (!authStore.isReady) {
            await initAuthStore()
        }
        if ((authStore.userInfo?.level ?? 0) < to.meta.level) {
            setToast('warn', '无访问权限', '你当前的权限等级不足以访问该页面')
            return '/403'
        }
    }

    return true
})

router.afterEach((to) => {
    if (import.meta.env.SSR) return

    NProgress.done()

    // 标签页标题跟随路由，未配置标题的页面回退为站点名
    document.title = to.meta.title ? `${to.meta.title} - 青蟹` : '青蟹'
})

// chunk 加载失败（如发版后旧 hash 失效）时收起，避免进度条卡住
router.onError(() => {
    NProgress.done()
})

export default router
