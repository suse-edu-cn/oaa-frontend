// Service Worker 外部依赖识别

// 非内联 Workbox 时，sw.js 开头是 define(["./workbox-xxxx"], ...)，
// 这些文件必须一起发到站点根，否则 Service Worker 加载失败。
export function externalWorkboxFiles(source) {
    const files = new Set()
    const patterns = [/define\(\[([^\]]*)\]/g, /importScripts\(([^)]*)\)/g]
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            for (const ref of match[1].matchAll(/["'](?:\.\/)?(workbox-[A-Za-z0-9_-]+)(?:\.js)?["']/g)) {
                files.add(`${ref[1]}.js`)
            }
        }
    }
    return [...files]
}
