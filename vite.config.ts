import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync, spawnSync } from 'child_process'

import pkgInfo from './package.json' with { type: 'json' }

// 获取编译版本
let gitVersion = 'unknown'
try {
    const gitHash = execSync('git rev-parse --short=7 HEAD').toString().trim()
    const gitCommitCount = execSync('git rev-list --count HEAD').toString().trim()
    gitVersion = `${gitHash} (build ${gitCommitCount})`
} catch {
    console.warn('无法获取 git 版本信息')
}

// https://vite.dev/config/
export default defineConfig(({ command, mode, isSsrBuild }) => {
    const env = loadEnv(mode, import.meta.dirname, '')
    const ossOrigin = env.VITE_OSS_ORIGIN || 'https://obj.suseoaa.com'
    const ossBase = command === 'serve' ? '/' : `${ossOrigin}/oaa-fe/v${pkgInfo.version}/`
    // 注：sw 的 urlPattern 会被序列化进 sw.js，此处在构建期写成正则字面量
    const ossOriginRe = ossOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    return {
        define: {
            __GIT_VERSION__: JSON.stringify(gitVersion),
        },
        base: ossBase,
        plugins: [
            vue(),
            // SSG 需要生成 sw.js 之前注入 dist/index.html
            {
                name: 'ssg-prerender-home',
                apply: 'build',
                writeBundle() {
                    if (isSsrBuild) return
                    spawnSync('node', ['scripts/prerender.mjs', '--mode', mode], {
                        cwd: import.meta.dirname,
                        stdio: 'inherit',
                    })
                },
            },
            VitePWA({
                base: '/',
                buildBase: '/',
                scope: '/',
                registerType: 'autoUpdate',
                includeAssets: [],
                manifest: {
                    name: '青蟹',
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
                    runtimeCaching: [
                        {
                            // 当前环境 OSS 上带 hash 的构建资源，内容不可变
                            urlPattern: new RegExp(`^${ossOriginRe}/.*\\/_oaa\\/`),
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'oss-assets',
                                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
                                cacheableResponse: { statuses: [200] },
                            },
                        },
                        {
                            urlPattern: new RegExp(`^${ossOriginRe}/.*\\.(svg|png|ico)$`),
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
                    target: env.VITE_PROXY_API_TARGET,
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
    }
})
