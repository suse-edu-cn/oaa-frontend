/*
 * 构建期预渲染
 * 将首页 '/' 渲染为静态 HTML
 */
import { build } from 'vite'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 与 pnpm build / build:internal 传参保持一致（如 --mode internal）
function getArg(name, fallback) {
    const i = process.argv.indexOf(name)
    return i > -1 ? process.argv[i + 1] : fallback
}

const mode = getArg('--mode', 'production')
const ssrOutDir = 'dist-ssr'

// 1. 打包 SSR 渲染入口（复用 vite.config.ts 的 alias / define 等配置）
let entryFile
try {
    const result = await build({
        root,
        mode,
        logLevel: 'warn',
        build: {
            ssr: 'src/entry-ssg.ts',
            outDir: ssrOutDir,
            emptyOutDir: true,
        },
    })
    entryFile = result.output.find((f) => f.isEntry)?.fileName
    if (!entryFile) throw new Error('SSR 构建产物中未找到入口文件')
} catch (e) {
    console.error('[prerender] SSR 构建失败:', e)
    process.exit(1)
}

// 2. 渲染首页
const { render } = await import(
    new URL(`file://${resolve(root, ssrOutDir, entryFile).replace(/\\/g, '/')}`).href
).catch((e) => {
    console.error('[prerender] 渲染入口加载失败:', e)
    process.exit(1)
})

const homeHtml = await render()

// 3. 注入 dist/index.html
//    附带的内联脚本用于：SPA fallback 把该文件返回给其它路由时清空首页外壳，避免闪现主页内容
const distIndex = resolve(root, 'dist', 'index.html')
const shell = readFileSync(distIndex, 'utf8')

if (!shell.includes('<div id="app"></div>')) {
    console.error('[prerender] dist/index.html 中未找到 <div id="app"></div>，注入中止')
    process.exit(1)
}

const guard = `<script>if(location.pathname!=='/'&&location.pathname!=='/index.html'){var a=document.getElementById('app');if(a)a.innerHTML='';}</script>`
writeFileSync(
    distIndex,
    shell.replace('<div id="app"></div>', `<div id="app">${homeHtml}</div>${guard}`),
)

// 4. 清理临时产物
rmSync(resolve(root, ssrOutDir), { recursive: true, force: true })

console.log(`[prerender] 首页已预渲染并注入 dist/index.html (${homeHtml.length} 字节)`)
