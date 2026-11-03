/**
 * 触发浏览器下载已获取的文件流
 *
 * 由于本项目的所有导出接口要求 Bearer Token，无法直接在新标签页中打开，故需先请求文件流再交给浏览器下载。
 */
export function saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()

    // 立即 revoke 在部分浏览器会中断还没开始的下载
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 去掉文件名中 Windows / POSIX 不允许的字符 */
export function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim()
}
