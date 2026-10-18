import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    outputDir: 'test-results',
    expect: { timeout: 10_000 },
    use: {
        baseURL,
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `pnpm exec vite --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
})
