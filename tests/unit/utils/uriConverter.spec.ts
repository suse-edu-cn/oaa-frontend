import { describe, expect, it } from 'vitest'

import { uriToUrl, urlToUri } from '@/utils/uriConverter'

const OSS_ORIGIN = 'https://obj.suseoaa.com'
const OSS_IN_ORIGIN = 'https://obj.in.suseoaa.com'

describe('utils/uriConverter', () => {
    it('从 .env.test 读取 OSS 域名', () => {
        expect(import.meta.env.VITE_OSS_ORIGIN).toBe(OSS_ORIGIN)
    })

    describe('urlToUri', () => {
        it('公网 OSS 图片转为 oss://', () => {
            expect(urlToUri('![图](https://obj.suseoaa.com/oaa/2026/01.png)')).toBe('![图](oss://oaa/2026/01.png)')
        })

        it('内网 OSS 图片同样转换', () => {
            expect(urlToUri(`![图](${OSS_IN_ORIGIN}/oaa/a.png)`)).toBe('![图](oss://oaa/a.png)')
        })

        it('保留 alt、丢弃 title', () => {
            expect(urlToUri('![照片](https://obj.suseoaa.com/oaa/a.png "标题")')).toBe('![照片](oss://oaa/a.png)')
        })

        it('非 OSS 图片原样返回', () => {
            const text = '![图](https://example.com/a.png)'
            expect(urlToUri(text)).toBe(text)
        })

        it('普通链接与畸形链接原样返回', () => {
            const text = '[链接](https://obj.suseoaa.com/a) ![图](not-a-url)'
            expect(urlToUri(text)).toBe(text)
        })

        it('只替换图片，不影响正文与多图', () => {
            const text = '正文 ![一](https://obj.suseoaa.com/a.png) 中间 ![二](https://obj.suseoaa.com/b.png) 结尾'
            expect(urlToUri(text)).toBe('正文 ![一](oss://a.png) 中间 ![二](oss://b.png) 结尾')
        })
    })

    describe('uriToUrl', () => {
        it('补上 OSS 域名', () => {
            expect(uriToUrl('![图](oss://oaa/2026/01.png)')).toBe(`![图](${OSS_ORIGIN}/oaa/2026/01.png)`)
        })

        it('非 oss:// 图片原样返回', () => {
            const text = '![图](https://example.com/a.png)'
            expect(uriToUrl(text)).toBe(text)
        })

        it('多图全部替换', () => {
            expect(uriToUrl('![一](oss://a.png)![二](oss://b.png)')).toBe(
                `![一](${OSS_ORIGIN}/a.png)![二](${OSS_ORIGIN}/b.png)`
            )
        })

        it('与 urlToUri 往返一致', () => {
            const text = '正文 ![图](https://obj.suseoaa.com/oaa/a.png) 结尾'
            expect(uriToUrl(urlToUri(text))).toBe(text)
        })
    })
})
