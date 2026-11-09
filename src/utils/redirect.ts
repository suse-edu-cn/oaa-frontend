/**
 * 登录后回跳地址归一化
 *
 * 只接受站内绝对路径，回跳目标由 guard 与登录页写入。
 */
export function resolveRedirect(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0 || value.length > 512) return ''
    // 注：//host、/\host 会被部分浏览器当作协议相对地址
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return ''
    // 控制字符可能干扰地址解析
    for (const char of value) {
        const code = char.charCodeAt(0)
        if (code < 0x20 || code === 0x7f) return ''
    }
    if (value === '/auth' || value.startsWith('/auth?')) return ''
    return value
}
