/** Date -> 'YYYY-MM-DD'，按本地时区处理 */
export function fromDate(d: Date | null): string {
    if (!d) return ''
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
}

/** 'YYYY-MM-DD' -> Date，空字符串返回 null */
export function toDate(s: string): Date | null {
    return s ? new Date(`${s}T00:00:00`) : null
}
