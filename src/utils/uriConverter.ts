// 公告 Markdown 图片链接与 oss:// uri 的互转

const OSS_URL_RE = /!\[([^\]]*)\]\((https:\/\/obj(?:\.in)?\.suseoaa\.com\/[^)\s]+)(?:\s+['"][^'"]*['"])?\)/g
const OSS_URI_RE = /!\[([^\]]*)\]\(oss:\/\/([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g

export function urlToUri(text: string): string {
    return text.replace(OSS_URL_RE, (match, alt: string, link: string) => {
        try {
            return `![${alt}](oss://${new URL(link).pathname.replace(/^\//, '')})`
        } catch {
            return match
        }
    })
}

export function uriToUrl(text: string): string {
    return text.replace(OSS_URI_RE, (_match, alt: string, path: string) => {
        return `![${alt}](https://obj.in.suseoaa.com/${path})`
    })
}
