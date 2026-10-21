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
        // 变量 placeholder
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
            // secure cookie
            jsdom: { url: 'https://localhost/' },
        },
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/{unit,integration,component}/**/*.spec.ts'],
        restoreMocks: true,
        clearMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: [
                'src/utils/date.ts',
                'src/utils/uriConverter.ts',
                'src/utils/setToast.ts',
                'src/utils/uploader.ts',
                'src/utils/request.ts',
                'src/utils/initAuthStore.ts',
                'src/utils/applicationFormValidation.ts',
                'src/utils/theme.ts',
                'src/utils/session.ts',
                'src/stores/auth.ts',
                'src/stores/org.ts',
                'src/stores/term.ts',
                'src/stores/settings.ts',
                'src/router/guard.ts',
                'src/components/ApplicationForm.vue',
                'src/components/ConfirmDialog.vue',
                'src/api/**/*.ts',
            ],
            thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
        },
    },
})
