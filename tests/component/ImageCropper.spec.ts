import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

type FakeCanvas = {
    toBlob: (callback: (blob: Blob | null) => void, type?: string, quality?: number) => void
}

type BlobCall = { type?: string; quality?: number }

// jsdom 没有 canvas 实现，直接模拟 cropper 的输出
const cropperState = vi.hoisted(() => ({
    instances: [] as { destroyed: boolean; getCroppedCanvas: () => FakeCanvas }[],
    blobCalls: [] as BlobCall[],
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
                toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number) {
                    cropperState.blobCalls.push({ type, quality })
                    callback(new Blob(['cropped'], { type: type ?? 'image/png' }))
                },
            }
        }
    },
}))

import setToast from '@/utils/setToast'
import ImageCropper from '@/components/ImageCropper.vue'

import { mountWithPrimeVue } from '../helpers/mount'
import { ButtonStub, DialogStub } from '../helpers/primevueStubs'

const toastMock = vi.mocked(setToast)

beforeEach(() => {
    toastMock.mockReset()
    cropperState.instances.length = 0
    cropperState.blobCalls.length = 0

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

function findButton(wrapper: Wrapper, label: string) {
    const button = wrapper.findAll('button').find((item) => item.text() === label)
    expect(button).toBeDefined()
    return button!
}

async function confirmCrop(wrapper: Wrapper) {
    await findButton(wrapper, '确认并上传').trigger('click')
    await flushPromises()
}

describe('components/ImageCropper', () => {
    it('选择文件后打开弹窗，确认时以 WebP 0.9 编码并抛出 blob', async () => {
        const wrapper = mountWithPrimeVue(ImageCropper)

        await selectFile(wrapper, new File(['raw'], 'avatar.jpg', { type: 'image/jpeg' }))
        expect(wrapper.findComponent(DialogStub).props('visible')).toBe(true)

        await openCrop(wrapper)
        await confirmCrop(wrapper)

        // 编码 WebP + 0.9
        expect(cropperState.blobCalls).toEqual([{ type: 'image/webp', quality: 0.9 }])

        const [blob] = wrapper.emitted('cropped')![0] as [Blob]
        expect(blob).toBeInstanceOf(Blob)
        expect(blob.type).toBe('image/webp')

        // 只抛事件
        expect(wrapper.findComponent(DialogStub).props('visible')).toBe(true)
    })

    it('裁剪生成图片失败时提示重试且不抛事件', async () => {
        const wrapper = mountWithPrimeVue(ImageCropper)

        await selectFile(wrapper, new File(['raw'], 'avatar.png', { type: 'image/png' }))
        await openCrop(wrapper)

        const cropper = cropperState.instances[0]
        expect(cropper).toBeDefined()
        cropper.getCroppedCanvas = () => ({ toBlob: (callback) => callback(null) })

        await confirmCrop(wrapper)

        expect(wrapper.emitted('cropped')).toBeUndefined()
        expect(toastMock).toHaveBeenCalledWith('error', '图片上传失败', '裁剪生成图片失败，请重试')
    })

    it('上传中禁用取消与关闭，确认不会重复触发', async () => {
        const wrapper = mountWithPrimeVue(ImageCropper, { props: { uploading: true } })

        await selectFile(wrapper, new File(['raw'], 'avatar.png', { type: 'image/png' }))
        await openCrop(wrapper)

        expect(wrapper.findComponent(DialogStub).props('closable')).toBe(false)
        expect(findButton(wrapper, '取消').attributes('disabled')).toBeDefined()

        const confirmButton = wrapper.findAllComponents(ButtonStub).find((item) => item.props('label') === '确认并上传')
        expect(confirmButton?.props('loading')).toBe(true)

        await confirmCrop(wrapper)
        expect(wrapper.emitted('cropped')).toBeUndefined()
    })

    it('close() 关闭弹窗并销毁 cropper', async () => {
        const wrapper = mountWithPrimeVue(ImageCropper)

        await selectFile(wrapper, new File(['raw'], 'avatar.png', { type: 'image/png' }))
        await openCrop(wrapper)

        ;(wrapper.vm as unknown as { close: () => void }).close()
        await flushPromises()

        expect(wrapper.findComponent(DialogStub).props('visible')).toBe(false)
        expect(cropperState.instances[0].destroyed).toBe(true)
    })
})
