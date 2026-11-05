// 本地校验 dist 产物是否可部署

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { externalWorkboxFiles } from './sw-runtime.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const dist = resolve(root, 'dist')

function fail(message) {
    console.error(`[validate-dist] ${message}`)
    process.exit(1)
}

function countFiles(dir) {
    if (!existsSync(dir)) return 0
    return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile()).length
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const version = `v${pkg.version}`

for (const file of ['index.html', 'sw.js', 'manifest.webmanifest']) {
    if (!existsSync(resolve(dist, file))) fail(`缺少 dist/${file}，请先执行 pnpm build`)
}

const indexHtml = readFileSync(resolve(dist, 'index.html'), 'utf8')
if (!indexHtml.includes('<div id="app">')) fail('dist/index.html 未包含 #app 容器')
if (/<div id="app">\s*<\/div>/.test(indexHtml)) fail('dist/index.html 未注入预渲染首页，请先执行 pnpm build')

// 版本号必须和 package.json 一致
if (!indexHtml.includes(`/oaa-fe/${version}/`)) {
    fail(`dist/index.html 的资源不是 ${version}（package.json 已改版本但未重新构建？）`)
}

// index 里引用的 _oaa 资源必须都在本地，避免上传后 404
const refs = new Set()
for (const match of indexHtml.matchAll(/https?:\/\/[^"' ]+\/_oaa\/([^"'?#\s]+)/g)) refs.add(match[1])
if (!refs.size) fail('dist/index.html 未引用任何 _oaa 资源')
for (const ref of refs) {
    if (!existsSync(resolve(dist, '_oaa', ref))) fail(`dist/index.html 引用了不存在的资源 _oaa/${ref}`)
}

const oaaCount = countFiles(resolve(dist, '_oaa'))
if (oaaCount === 0) fail('dist/_oaa/ 为空，疑似未构建')

// Service Worker 若引用外部 workbox 文件，该文件必须跟着发到站点根
const sw = readFileSync(resolve(dist, 'sw.js'), 'utf8')
for (const file of externalWorkboxFiles(sw)) {
    if (!existsSync(resolve(dist, file))) {
        fail(`dist/sw.js 引用了 ${file}，但 dist/ 里没有它，Service Worker 会加载失败`)
    }
}

const manifestRaw = readFileSync(resolve(dist, 'manifest.webmanifest'), 'utf8')
let manifest
try {
    manifest = JSON.parse(manifestRaw)
} catch {
    fail('dist/manifest.webmanifest 不是合法 JSON')
}
for (const icon of manifest.icons ?? []) {
    if (!String(icon.src).startsWith('http')) {
        fail(`manifest 图标不是绝对地址: ${icon.src}`)
    }
}

console.log(`[validate-dist] OK version=${version} _oaaFiles=${oaaCount} indexRefs=${refs.size}`)
