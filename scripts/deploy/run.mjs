// 外部命令执行封装

// 注意：Windows 下不要用 shell 执行 ssh / scp / mc
import { spawnSync } from 'node:child_process'

export function die(tag, message) {
    console.error(`[${tag}] ${message}`)
    process.exit(1)
}

export function run(tag, cmd, args, { dryRun = false, cwd } = {}) {
    if (dryRun) {
        console.log(`[dry-run] ${cmd} ${args.join(' ')}`)
        return
    }
    const result = spawnSync(cmd, args, { stdio: 'inherit', cwd })
    if (result.error) die(tag, `执行 ${cmd} 失败: ${result.error.message}`)
    if (result.status !== 0) die(tag, `${cmd} 退出码 ${result.status ?? 'null'}`)
}

export function runCapture(tag, cmd, args, { cwd } = {}) {
    const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
    if (result.error) die(tag, `执行 ${cmd} 失败: ${result.error.message}`)
    if (result.status !== 0) {
        die(tag, `${cmd} 退出码 ${result.status ?? 'null'}: ${(result.stderr ?? '').trim()}`)
    }
    return result.stdout ?? ''
}

export function hasCommand(cmd) {
    if (process.platform === 'win32') {
        const result = spawnSync('where', [cmd], { stdio: 'ignore' })
        return !result.error && result.status === 0
    }
    const result = spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' })
    return !result.error && result.status === 0
}

export function runBuild(root) {
    if (process.platform === 'win32') {
        run('deploy', process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'pnpm build'], { cwd: root })
        return
    }
    run('deploy', 'pnpm', ['build'], { cwd: root })
}
