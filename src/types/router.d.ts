import 'vue-router'

declare module 'vue-router' {
    interface RouteMeta {
        /** 浏览器标签页标题 */
        title?: string
    }
}
