// 外部命令执行封装

// 注意：Windows 下不要用 shell 执行 ssh / scp / mc
import { spawnSync } from 'node:child_process'

export function die(tag, message) {
    console.error(`[${tag}] ${message}`)
    process.exit(1)
}

// quiet 丢掉子进程 stdout，stderr 保留用于报错
export function run(tag, cmd, args, { cwd, quiet = false } = {}) {
    const result = spawnSync(cmd, args, { stdio: quiet ? ['inherit', 'ignore', 'inherit'] : 'inherit', cwd })
    if (result.error) die(tag, `执行 ${cmd} 失败: ${result.error.message}`)
    if (result.status !== 0) die(tag, `${cmd} 退出码 ${result.status ?? 'null'}`)
}

// 成功时完全静默
export function runSilent(tag, cmd, args, { cwd } = {}) {
    const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
    if (result.error) die(tag, `执行 ${cmd} 失败: ${result.error.message}`)
    if (result.status !== 0) {
        const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
        if (output) console.error(output)
        die(tag, `${cmd} 退出码 ${result.status ?? 'null'}`)
    }
    return result.stdout ?? ''
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

// pnpm 在 Windows 上运行程序需要处理
export function runBuild(root, { logLevel = 'warn' } = {}) {
    if (process.platform === 'win32') {
        const args = ['/d', '/s', '/c', `pnpm --loglevel silent run build --logLevel ${logLevel}`]
        run('deploy', process.env.ComSpec || 'cmd.exe', args, { cwd: root })
        return
    }
    run('deploy', 'pnpm', ['--loglevel', 'silent', 'run', 'build', '--logLevel', logLevel], { cwd: root })
}
