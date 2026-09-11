import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
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

// https://vite.dev/config/
export default defineConfig({
    define: {
        __GIT_VERSION__: JSON.stringify(gitVersion),
    },
    plugins: [vue()],
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
