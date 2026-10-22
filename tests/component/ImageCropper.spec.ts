import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/utils/request', () => ({ default: vi.fn() }))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

type FakeCanvas = {
    toBlob: (callback: (blob: Blob | null) => void, type?: string) => void
}

// jsdom 没有 canvas 实现，直接模拟 cropper 的输出
const cropperState = vi.hoisted(() => ({
    instances: [] as { destroyed: boolean; getCroppedCanvas: () => FakeCanvas }[],
}))

vi.mock('cropperjs', () => ({
    default: class {
        destroyed = false

        constructor() {
            cropperState.instances.push(this)
        }

        destroy() {
            this.destroyed = true
        }

        getCroppedCanvas() {
            return {
                toBlob(callback: (blob: Blob | null) => void, type?: string) {
                    callback(new Blob(['cropped'], { type: type ?? 'image/png' }))
                },
            }
        }
    },
}))

import request from '@/utils/request'
import setToast from '@/utils/setToast'
import ImageCropper from '@/components/ImageCropper.vue'

import { mountWithPrimeVue } from '../helpers/mount'

const requestMock = vi.mocked(request)
const toastMock = vi.mocked(setToast)

const UPLOAD_OK = { code: 200, message: 'ok', data: { uri: 'oss://avatar.png', url: 'https://obj/avatar.png' } }

beforeEach(() => {
    requestMock.mockReset()
    toastMock.mockReset()
    cropperState.instances.length = 0

    // jsdom 未实现 object URL
    Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:mock', configurable: true, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true, writable: true })
})

type Wrapper = ReturnType<typeof mountWithPrimeVue>

async function selectFile(wrapper: Wrapper, file: File) {
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
}

async function openCrop(wrapper: Wrapper) {
    await wrapper.get('img').trigger('load')
    await flushPromises()
}

async function confirmCrop(wrapper: Wrapper) {
    const button = wrapper.findAll('button').find((item) => item.text() === '确认并上传')
    expect(button).toBeDefined()
    await button!.trigger('click')
    await flushPromises()
}

describe('components/ImageCropper', () => {
    it('裁剪结果带上 MIME 后上传，不被格式白名单拦截', async () => {
        requestMock.mockResolvedValue(UPLOAD_OK)
        const wrapper = mountWithPrimeVue(ImageCropper, { props: { imgScene: 'avatar' } })

        await selectFile(wrapper, new File(['raw'], 'avatar.jpg', { type: 'image/jpeg' }))
        await openCrop(wrapper)
        await confirmCrop(wrapper)

        expect(requestMock).toHaveBeenCalledTimes(1)
        const config = requestMock.mock.calls[0][0]
        expect(config.url).toBe('/upload/image')

        const body = config.data as FormData
        const file = body.get('file') as File
        // 回归：new File 不传 type 时为空串，会被 uploadImage 判为「格式错误」
        expect(file.type).toBe('image/png')
        expect(file.size).toBeGreaterThan(0)
        expect(body.get('scene')).toBe('avatar')

        expect(wrapper.emitted('uploaded')?.[0]).toEqual([{ uri: 'oss://avatar.png', url: 'https://obj/avatar.png' }])
        expect(toastMock).not.toHaveBeenCalledWith('warn', '格式错误', expect.anything())
    })

    it('上传失败时不抛事件，并提示后端消息', async () => {
        requestMock.mockResolvedValue({ code: 500, message: '文件服务不可用', data: null })
        const wrapper = mountWithPrimeVue(ImageCropper, { props: { imgScene: 'avatar' } })

        await selectFile(wrapper, new File(['raw'], 'avatar.png', { type: 'image/png' }))
        await openCrop(wrapper)
        await confirmCrop(wrapper)

        expect(wrapper.emitted('uploaded')).toBeUndefined()
        expect(toastMock).toHaveBeenCalledWith('error', '上传失败', '文件服务不可用')
    })

    it('裁剪生成图片失败时提示重试且不发请求', async () => {
        const wrapper = mountWithPrimeVue(ImageCropper, { props: { imgScene: 'avatar' } })

        await selectFile(wrapper, new File(['raw'], 'avatar.png', { type: 'image/png' }))
        await openCrop(wrapper)

        const cropper = cropperState.instances[0]
        expect(cropper).toBeDefined()
        cropper.getCroppedCanvas = () => ({ toBlob: (callback) => callback(null) })

        await confirmCrop(wrapper)

        expect(requestMock).not.toHaveBeenCalled()
        expect(wrapper.emitted('uploaded')).toBeUndefined()
        expect(toastMock).toHaveBeenCalledWith('error', '图片上传失败', '裁剪生成图片失败，请重试')
    })
})
