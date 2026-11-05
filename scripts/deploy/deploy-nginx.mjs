// 推送入口文件到 Nginx 服务器
//
// 推送内容：index.html / sw.js / manifest.webmanifest 三个固定文件
// 配置：sshHost、nginxRoot、nginxBackupRoot、nginxUser、nginxGroup、nginxReloadCmd
// 使用：node scripts/deploy/deploy-nginx.mjs [--dry-run]
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadDeployConfig } from './load-config.mjs'
import { die, run, runCapture } from './run.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const dist = resolve(root, 'dist')
const dryRun = process.argv.includes('--dry-run')
const FILES = ['index.html', 'sw.js', 'manifest.webmanifest']

const cfg = loadDeployConfig()
const host = cfg.sshHost
const remote = cfg.nginxRoot
const user = cfg.nginxUser
const group = cfg.nginxGroup
const reloadCmd = cfg.nginxReloadCmd
const backupBase = cfg.nginxBackupRoot || `${remote}.backup`
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const backupDir = `${backupBase}/${stamp}`

if (!host || !remote) die('deploy-nginx', '缺少 deploy.local.json 中的 nginx.host / nginx.root 配置')
for (const file of FILES) {
    if (!existsSync(resolve(dist, file))) die('deploy-nginx', `缺少 dist/${file}，请先执行 pnpm build`)
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
console.log(`[deploy-nginx] target ${host}:${remote} version v${pkg.version}`)

function ssh(command) {
    return run('deploy-nginx', 'ssh', [host, command], { dryRun })
}

function sha256(file) {
    return createHash('sha256').update(readFileSync(file)).digest('hex')
}

// 1. 备份旧入口文件
ssh(
    `set -e; sudo -n mkdir -p ${backupDir}; for f in ${FILES.join(' ')}; do if [ -f ${remote}/$f ]; then sudo -n cp -a ${remote}/$f ${backupDir}/; fi; done; sudo -n ls -l ${backupDir}`
)

// 2. 逐个上传
for (const file of FILES) {
    const local = resolve(dist, file)
    const tmp = `/tmp/oaa-deploy-${stamp}-${file}`
    run('deploy-nginx', 'scp', ['-q', local, `${host}:${tmp}`], { dryRun })
    ssh(`sudo -n install -o ${user} -g ${group} -m 644 ${tmp} ${remote}/${file} && sudo -n rm -f ${tmp}`)
}

// 3. 回读校验
//    避免 scp/install 悄悄失败后仍去 reload
if (!dryRun) {
    const output = runCapture('deploy-nginx', 'ssh', [host, `sha256sum ${FILES.map((file) => `${remote}/${file}`).join(' ')}`])
    const actual = new Map()
    for (const line of output.trim().split(/\r?\n/)) {
        const [hash, file] = line.trim().split(/\s+/)
        if (hash && file) actual.set(file.replace(/^\*/, ''), hash)
    }
    for (const file of FILES) {
        const expected = sha256(resolve(dist, file))
        if (actual.get(`${remote}/${file}`) !== expected) {
            die(
                'deploy-nginx',
                `${remote}/${file} 校验失败（本地 ${expected}，远端 ${actual.get(`${remote}/${file}`) ?? '缺失'}）`
            )
        }
    }
    console.log('[deploy-nginx] sha256 校验通过')
}

// 4. reload
ssh(`sudo -n nginx -t && (${reloadCmd})`)

console.log('[deploy-nginx] done')
