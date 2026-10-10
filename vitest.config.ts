import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Node 的本地时区在 worker 启动前固定，日期相关断言才能跨本地 / CI 复现
process.env.TZ = 'Asia/Shanghai'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    define: {
        // placeholder
        __BUILD_INFO__: JSON.stringify({
            version: 'test',
            repo: '',
            hash: 'test',
            build: '0',
            date: '2026-01-01T00:00:00.000Z',
            env: 'test',
        }),
    },
    test: {
        environment: 'jsdom',
        environmentOptions: {
            jsdom: { url: 'https://localhost/' },
        },
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/{unit,integration,component}/**/*.spec.ts'],
        restoreMocks: true,
        clearMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/utils/date.ts'],
            // thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
        },
    },
})
