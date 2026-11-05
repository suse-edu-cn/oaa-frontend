// 部署主脚本

// 顺序：预检 -> 构建 -> 校验产物 -> 上传对象存储 -> 推送 Nginx -> 部署后检查

// 使用：
//   pnpm deploy            构建并部署
//   pnpm deploy:check      只执行部署后检查
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadDeployConfig } from './load-config.mjs'
import { die, hasCommand, runBuild } from './run.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run') || argv.includes('dry-run')
const noBuild = argv.includes('--no-build')
const cfg = loadDeployConfig()
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

function missingKeys() {
    const required = {
        minioEndpoint: cfg.minioEndpoint,
        minioAccessKey: cfg.minioAccessKey,
        minioSecretKey: cfg.minioSecretKey,
        sshHost: cfg.sshHost,
        nginxRoot: cfg.nginxRoot,
    }
    return Object.entries(required)
        .filter(([, value]) => !value)
        .map(([key]) => key)
}

function preflight() {
    console.log(`[deploy] preflight${dryRun ? ' (dry-run)' : ''}`)
    const missing = missingKeys()
    if (missing.length) {
        const message = `配置缺失: ${missing.join(', ')}（请填写 ${resolve(here, 'deploy.local.json')}）`
        if (!dryRun) die('deploy', message)
        console.warn(`[deploy] 警告: ${message}`)
    }
    if (!dryRun) {
        const missingCommands = ['mc', 'ssh', 'scp'].filter((cmd) => !hasCommand(cmd))
        if (missingCommands.length) die('deploy', `未找到命令: ${missingCommands.join(', ')}`)
    }
    console.log(
        `[deploy] target ssh=${cfg.sshHost ?? '(未配置)'} nginxRoot=${cfg.nginxRoot ?? '(未配置)'} bucket=${cfg.minioBucket} version=v${pkg.version}`
    )
}

function runNode(script) {
    const scriptPath = resolve(here, script)
    if (!existsSync(scriptPath)) die('deploy', `缺少步骤脚本 ${script}`)
    const passDryRun = dryRun && script !== 'validate-dist.mjs'
    const args = [scriptPath]
    if (passDryRun) args.push('--dry-run')
    console.log(`[deploy] ${script}${passDryRun ? ' (dry-run)' : ''}`)
    const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root })
    if (result.error) die('deploy', `无法执行 ${script}: ${result.error.message}`)
    if (result.status !== 0) die('deploy', `${script} 失败，退出码 ${result.status ?? 'null'}`)
}

preflight()

if (noBuild) {
    console.log('[deploy] 跳过构建 (--no-build)')
} else if (dryRun) {
    console.log('[dry-run] pnpm build')
} else {
    console.log('[deploy] build')
    runBuild(root)
}

// 校验只读，试运行时也真实执行，便于提前发现 dist 与版本号不一致
runNode('validate-dist.mjs')
runNode('upload-oss.mjs')
runNode('deploy-nginx.mjs')
runNode('post-deploy-check.mjs')

console.log(`[deploy] done version=v${pkg.version} site=${cfg.siteUrl}`)
