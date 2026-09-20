import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

// 获取编译版本
let gitVersion = 'unknown'
try {
    const gitHash = execSync('git rev-parse --short=7 HEAD').toString().trim()
    const gitCommitCount = execSync('git rev-list --count HEAD').toString().trim()
    gitVersion = `${gitHash} (build ${gitCommitCount})`
} catch {
    console.warn('无法获取 git 版本信息')
}

// 静态资源 OSS
const OSS_BASE = 'https://obj.in.suseoaa.com/oaa-fe/v0.3.0/'

// https://vite.dev/config/
export default defineConfig({
    define: {
        __GIT_VERSION__: JSON.stringify(gitVersion),
    },
    base: OSS_BASE,
    plugins: [
        vue(),
        VitePWA({
            // 页面在 fe.in，资源 base 在 OSS：
            // - sw.js / registerSW.js / manifest / PWA 图标 → 必须同源（fe.in），不要传 OSS
            // - _oaa 构建资源 → 传 OSS；预缓存只收同源外壳，OSS 走 runtimeCaching
            base: '/',
            buildBase: '/',
            scope: '/',
            registerType: 'autoUpdate',
            // oaa.svg / apple-touch-icon 在 HTML 里已是 OSS 绝对地址，不参与同源预缓存
            includeAssets: [],
            manifest: {
                name: '四川轻化工大学 开放原子开源协会',
                short_name: '青蟹',
                description:
                    '由本校大学生运营的计算机协会，专注于算法学习和项目实践，涉及前后端、嵌入式、操作系统等多个领域，让同学们敢于探索新技术',
                lang: 'zh-CN',
                theme_color: '#fefefe',
                background_color: '#fefefe',
                display: 'standalone',
                start_url: '/',
                icons: [
                    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{html,js}'],
                globIgnores: ['_oaa/**', 'oaa.svg', 'apple-touch-icon.png', 'workbox-*.js', 'pwa-*.png'],
                // katex & primeicons 通过 CDN 加载
                // 首次在线加载后缓存，离线可用
                runtimeCaching: [
                    {
                        // OSS 构建资源，内容不可变
                        urlPattern: ({ url }) =>
                            url.origin === 'https://obj.in.suseoaa.com' && url.pathname.includes('/_oaa/'),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'oss-assets',
                            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [200] },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/obj\.in\.suseoaa\.com\/oaa-fe\/.*\.(svg|png|ico)$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'oss-assets-icons',
                            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            cacheableResponse: { statuses: [200] },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/registry\.npmmirror\.com\/.*\.(woff2?|ttf)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'cdn-fonts',
                            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [200] },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/registry\.npmmirror\.com\/.*\.css$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'cdn-styles',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            cacheableResponse: { statuses: [200] },
                        },
                    },
                ],
            },
        }),
    ],
    server: {
        port: 3011,
        proxy: {
            '/v2': {
                target: 'https://api.in.suseoaa.com',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        assetsInlineLimit: 6144,
        rollupOptions: {
            output: {
                assetFileNames: '_oaa/[name]-[hash].[ext]',
                chunkFileNames: '_oaa/[name]-[hash].js',
                entryFileNames: '_oaa/[name]-[hash].js',
                minifyInternalExports: true,
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(import.meta.dirname, './src'),
        },
    },
})
