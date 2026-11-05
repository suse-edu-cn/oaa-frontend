// 上传构建产物到对象存储

// 配置：minioEndpoint、minioAccessKey、minioSecretKey、minioBucket、minioAlias
// 使用：node scripts/deploy/upload-oss.mjs [--dry-run]
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadDeployConfig } from './load-config.mjs'
import { die, run } from './run.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const dist = resolve(root, 'dist')
const oaaDir = resolve(dist, '_oaa')
const dryRun = process.argv.includes('--dry-run')

const cfg = loadDeployConfig()
const endpoint = cfg.minioEndpoint
const accessKey = cfg.minioAccessKey
const secretKey = cfg.minioSecretKey
const bucket = cfg.minioBucket
const alias = cfg.minioAlias

if (!existsSync(oaaDir)) die('upload-oss', '缺少 dist/_oaa/，请先执行 pnpm build')
if (!dryRun && (!endpoint || !accessKey || !secretKey)) {
    die('upload-oss', '缺少 deploy.local.json 中的 minioEndpoint / minioAccessKey / minioSecretKey 配置')
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const prefix = `v${pkg.version}`
const target = `${alias}/${bucket}/${prefix}`

// 1. 配置别名
if (endpoint) {
    if (dryRun) {
        console.log(`[dry-run] mc alias set ${alias} ${endpoint} ${accessKey ? `${accessKey.slice(0, 4)}****` : '<accessKey>'} ****`)
    } else {
        run('upload-oss', 'mc', ['alias', 'set', alias, endpoint, accessKey, secretKey])
    }
}

// 2. 上传 _oaa/*
run('upload-oss', 'mc', ['mirror', '--overwrite', '--quiet', oaaDir, `${target}/_oaa`], { dryRun })

// 3. 上传页面和 manifest 直接引用的固定文件名图标
const icons = readdirSync(dist, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(png|svg|ico)$/.test(entry.name))
    .map((entry) => entry.name)
if (!icons.length) die('upload-oss', 'dist/ 下没有找到 png/svg/ico 图标，构建可能不完整')
for (const name of icons) {
    run('upload-oss', 'mc', ['cp', '--quiet', resolve(dist, name), `${target}/${name}`], { dryRun })
}

console.log(`[upload-oss] done bucket=${bucket} prefix=${prefix} icons=${icons.length}`)
