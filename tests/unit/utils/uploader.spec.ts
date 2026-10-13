import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/request', () => ({ default: vi.fn() }))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import request from '@/utils/request'
import setToast from '@/utils/setToast'
import { uploadFile, uploadImage } from '@/utils/uploader'

const requestMock = vi.mocked(request)
const toastMock = vi.mocked(setToast)

const MIME = 'image/png'
const FOUR_MB = 4 * 1024 * 1024

/** 用 defineProperty 伪造大小 */
function makeFile(type = MIME, size = 1024): File {
    const file = new File(['x'], 'test.png', { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
}

function mockResponse(response: unknown) {
    requestMock.mockResolvedValue(response as never)
}

beforeEach(() => {
    requestMock.mockReset()
    toastMock.mockReset()
})

describe('utils/uploader', () => {
    describe('uploadImage', () => {
        it('拒绝非图片类型', async () => {
            const file = makeFile('text/plain')

            await expect(uploadImage(file, 'application')).resolves.toBeNull()
            expect(toastMock).toHaveBeenCalledWith('warn', '格式错误', expect.stringContaining('图片'))
            expect(requestMock).not.toHaveBeenCalled()
        })

        it('拒绝超过 4MB 的文件', async () => {
            const file = makeFile(MIME, FOUR_MB + 1)

            await expect(uploadImage(file, 'application')).resolves.toBeNull()
            expect(toastMock).toHaveBeenCalledWith('warn', '文件过大', expect.stringContaining('4MB'))
            expect(requestMock).not.toHaveBeenCalled()
        })

        it('恰好 4MB 允许上传', async () => {
            mockResponse({ code: 200, message: 'ok', data: { uri: 'oss://a.png', url: 'https://obj/a.png' } })

            await expect(uploadImage(makeFile(MIME, FOUR_MB), 'application')).resolves.toEqual({
                uri: 'oss://a.png',
                url: 'https://obj/a.png',
            })
        })

        it('空 uri / url 需要 fallback 为空串', async () => {
            mockResponse({ code: 200, message: 'ok', data: {} })

            await expect(uploadImage(makeFile(), 'application')).resolves.toEqual({ uri: '', url: '' })
        })

        it('业务失败提示后端 message 并返回 null', async () => {
            mockResponse({ code: 500, message: '文件服务不可用', data: null })

            await expect(uploadImage(makeFile(), 'application')).resolves.toBeNull()
            expect(toastMock).toHaveBeenCalledWith('error', '上传失败', '文件服务不可用')
        })

        it('网络失败返回 null 并使用兜底文案', async () => {
            mockResponse(undefined)

            await expect(uploadImage(makeFile(), 'application')).resolves.toBeNull()
            expect(toastMock).toHaveBeenCalledWith('error', '上传失败', expect.stringContaining('未知错误'))
        })

        it('请求异常时返回 null 并提示后端 message', async () => {
            requestMock.mockRejectedValue({ response: { data: { message: '网关异常' } } } as never)

            await expect(uploadImage(makeFile(), 'application')).resolves.toBeNull()
            expect(toastMock).toHaveBeenCalledWith('error', '上传失败', '网关异常')
        })

        it('请求形态正确', async () => {
            mockResponse({ code: 200, message: 'ok', data: { uri: 'oss://a.png', url: 'https://obj/a.png' } })
            const file = makeFile()

            await uploadImage(file, 'application')

            expect(requestMock).toHaveBeenCalledTimes(1)
            const config = requestMock.mock.calls[0][0]
            expect(config.url).toBe('/upload/image')
            expect(config.method).toBe('POST')
            expect(config.timeout).toBe(120_000)

            const body = config.data as FormData
            expect(body).toBeInstanceOf(FormData)
            expect(body.get('file')).toBe(file)
            expect(body.get('scene')).toBe('application')
        })
    })

    describe('uploadFile', () => {
        it('默认允许 100MB 且不限制类型', async () => {
            mockResponse({ code: 200, message: 'ok', data: { uri: 'oss://a.bin', url: 'https://obj/a.bin' } })

            await expect(uploadFile(makeFile('application/octet-stream', 100 * 1024 * 1024), 'doc')).resolves.toEqual({
                uri: 'oss://a.bin',
                url: 'https://obj/a.bin',
            })
            expect(requestMock.mock.calls[0][0].url).toBe('/upload/file')
        })

        it('支持自定义大小上限与类型白名单', async () => {
            await expect(uploadFile(makeFile('text/plain', 2 * 1024 * 1024), 'doc', 1)).resolves.toBeNull()
            expect(toastMock).toHaveBeenCalledWith('warn', '文件过大', expect.stringContaining('1MB'))

            await expect(uploadFile(makeFile('image/png', 1024), 'doc', 1, ['text/plain'])).resolves.toBeNull()
            expect(toastMock).toHaveBeenCalledWith('warn', '格式错误', expect.stringContaining('文件'))
        })
    })
})
