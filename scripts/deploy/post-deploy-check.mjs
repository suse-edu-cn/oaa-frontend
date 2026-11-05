// 部署后检查

// 检查项：
//   - 首页 200 且引用的是本次版本号
//   - 首页入口脚本能从对象存储取到
//   - manifest 200，图标为绝对地址且可访问
//   - sw.js 200，若它引用了外部 workbox 文件，该文件也必须存在
//   - 入口文件的 Cache-Control / manifest 的 Content-Type 不达标时告警

// 使用：node scripts/deploy/post-deploy-check.mjs
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadDeployConfig } from './load-config.mjs'
import { die } from './run.mjs'
import { externalWorkboxFiles } from './sw-runtime.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const cfg = loadDeployConfig()
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const version = `v${pkg.version}`
const timeout = 15000

const siteUrl = cfg.siteUrl
if (!siteUrl) die('post-deploy-check', '缺少 deploy.local.json 中的 site 配置')
const base = siteUrl.replace(/\/+$/, '')
const warnings = []

async function request(path) {
    const url = new URL(path.replace(/^\/+/, ''), `${base}/`)
    // 绕过 CDN / 浏览器缓存，确保读到的是刚切换的文件
    url.searchParams.set('deploy-check', String(Date.now()))
    try {
        const response = await fetch(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(timeout),
            headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
        })
        return { response, url: url.href }
    } catch (error) {
        die(
            'post-deploy-check',
            `请求 ${url.href} 失败: ${error.message}（若本机需要代理，请设置 HTTPS_PROXY 与 NODE_USE_ENV_PROXY=1）`
        )
    }
}

// 1. 首页必须已经是本次版本
const home = await request('/')
if (home.response.status !== 200) die('post-deploy-check', `首页返回 ${home.response.status}`)
const html = await home.response.text()
if (!html.includes('<div id="app">')) die('post-deploy-check', '首页缺少 #app 容器')
if (!html.includes(`/oaa-fe/${version}/`)) {
    die('post-deploy-check', `首页引用的不是 ${version} 的产物（Nginx 未切换或 CDN 缓存未失效）`)
}
const entry = html.match(/https?:\/\/[^"' ]+\/_oaa\/[^"' ]+\.js/)
if (!entry) die('post-deploy-check', '首页未找到入口脚本')

// 2. 入口脚本必须能从对象存储取到
const entryResponse = await fetch(entry[0], { signal: AbortSignal.timeout(timeout) })
if (!entryResponse.ok) die('post-deploy-check', `入口脚本 ${entry[0]} 返回 ${entryResponse.status}`)

// 3. manifest 必须是合法 JSON，图标是绝对地址且可访问
const manifestResponse = await request('/manifest.webmanifest')
if (manifestResponse.response.status !== 200) {
    die('post-deploy-check', `manifest.webmanifest 返回 ${manifestResponse.response.status}`)
}
const contentType = manifestResponse.response.headers.get('content-type') ?? ''
if (!contentType.includes('application/manifest+json')) {
    warnings.push(`manifest.webmanifest 的 Content-Type 是 ${contentType || '(空)'}，应为 application/manifest+json`)
}
const manifestBody = await manifestResponse.response.text()
let manifest
try {
    manifest = JSON.parse(manifestBody)
} catch {
    die('post-deploy-check', 'manifest.webmanifest 不是合法 JSON')
}
// 线上内容与本次构建不一致时多半是 CDN 还缓存着旧文件
// 它会继续把用户导向旧的图标地址，所以这里只告警，并把刷新提示带出来。
const localManifestPath = resolve(root, 'dist/manifest.webmanifest')
const localManifest = existsSync(localManifestPath) ? JSON.parse(readFileSync(localManifestPath, 'utf8')) : null
if (!localManifest) {
    warnings.push('本地没有 dist/manifest.webmanifest，无法比对线上 manifest 是否最新')
} else if (JSON.stringify(manifest) !== JSON.stringify(localManifest)) {
    warnings.push('线上 manifest 与 dist 不一致，可能是 CDN 缓存未刷新（需刷新 /manifest.webmanifest）')
}
for (const icon of manifest.icons ?? []) {
    const src = String(icon.src)
    if (!/^https?:\/\//.test(src)) {
        warnings.push(`manifest 图标不是绝对地址: ${src}`)
        continue
    }
    const iconResponse = await fetch(src, { method: 'HEAD', signal: AbortSignal.timeout(timeout) })
    if (!iconResponse.ok) warnings.push(`manifest 图标不可访问: ${src} (${iconResponse.status})`)
}

// 4. Service Worker 能取到；引用了外部 workbox 时，该文件也必须能取到
const swResponse = await request('/sw.js')
if (swResponse.response.status !== 200) die('post-deploy-check', `sw.js 返回 ${swResponse.response.status}`)
const sw = await swResponse.response.text()
for (const file of externalWorkboxFiles(sw)) {
    const workboxResponse = await fetch(`${base}/${file}`, { signal: AbortSignal.timeout(timeout) })
    if (!workboxResponse.ok) {
        die('post-deploy-check', `sw.js 引用了 ${file}，但站点根没有该文件（Service Worker 会加载失败）`)
    }
}

// 5. 缓存头不达标只告警：属于 Nginx 静态站点配置，不影响本次切换是否成功
for (const [path, response] of [
    ['/', home.response],
    ['/sw.js', swResponse.response],
    ['/manifest.webmanifest', manifestResponse.response],
]) {
    const cacheControl = response.headers.get('cache-control') ?? ''
    if (!/no-cache|no-store|max-age=0/.test(cacheControl)) {
        warnings.push(`${path} 的 Cache-Control 是 ${cacheControl || '(空)'}，建议配置 no-cache`)
    }
}

for (const warning of warnings) console.warn(`[post-deploy-check] 警告: ${warning}`)
console.log(`[post-deploy-check] OK ${base} version=${version}`)
