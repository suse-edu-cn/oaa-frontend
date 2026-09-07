/** Date -> 'YYYY-MM-DD'，按本地时区处理 */
export function fromDate(d: Date | null): string {
    if (!d) return ''
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
}

/** 'YYYY-MM-DD' -> Date，空值返回 null */
export function toDate(s: string | null | undefined): Date | null {
    return s ? new Date(`${s}T00:00:00`) : null
}

/** ISO 时间串 -> 'YYYY-MM-DD HH:mm'，按本地时区处理 */
export function fromIso(s: string): string {
    if (!s) return ''
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return ''
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day} ${h}:${min}`
}
