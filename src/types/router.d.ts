import 'vue-router'

declare module 'vue-router' {
    interface RouteMeta {
        /** 浏览器标签页标题 */
        title?: string
        /** 访问该路由所需的最低权限等级 */
        level?: number
    }
}
