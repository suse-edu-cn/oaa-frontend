import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/utils/uploader', () => ({ uploadImage: vi.fn() }))

import ImageUploader from '@/components/ImageUploader.vue'
import { uploadImage } from '@/utils/uploader'
import { deferred } from '../helpers/deferred'
import { mountWithPrimeVue } from '../helpers/mount'
import { primevueStubs } from '../helpers/primevueStubs'

const uploadMock = vi.mocked(uploadImage)

/** 记录 open()/close() 调用的裁剪器替身，避免把真实弹窗拖进组件测试 */
function makeCropperStub() {
    const opened = ref(0)
    const closed = ref(0)
    const component = defineComponent({
        name: 'ImageCropper',
        props: { uploading: Boolean },
        emits: ['cropped'],
        setup(_, { expose }) {
            expose({
                open: () => {
                    opened.value += 1
                },
                close: () => {
                    closed.value += 1
                },
            })
            return () => h('div', { 'data-testid': 'cropper' })
        },
    })
    return { component, opened, closed }
}

function makeFile(name = 'avatar.png') {
    return new File(['x'], name, { type: 'image/png' })
}

function makeBlob(name = 'avatar.png') {
    return new Blob([name], { type: 'image/webp' })
}

function mountUploader(props: Record<string, unknown> = {}, cropperStub?: ReturnType<typeof makeCropperStub>) {
    return mountWithPrimeVue(ImageUploader, {
        props: { scene: 'application', ...props },
        global: {
            stubs: cropperStub ? { ...primevueStubs, ImageCropper: cropperStub.component } : { ...primevueStubs },
        },
    })
}

async function chooseFile(wrapper: ReturnType<typeof mountUploader>, name = 'avatar.png') {
    const input = wrapper.find<HTMLInputElement>('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [makeFile(name)], configurable: true })
    await input.trigger('change')
}

beforeEach(() => {
    uploadMock.mockReset()
})

describe('components/ImageUploader', () => {
    it('有地址时渲染图片，无地址时渲染占位图标', () => {
        const withImage = mountUploader({ url: 'https://obj.suseoaa.com/a.png', alt: '照片' })
        expect(withImage.find('img').attributes('src')).toBe('https://obj.suseoaa.com/a.png')
        expect(withImage.find('img').attributes('alt')).toBe('照片')

        const empty = mountUploader()
        expect(empty.find('img').exists()).toBe(false)
        expect(empty.find('.placeholder i.pi-user').exists()).toBe(true)
    })

    it('点击或按 Enter 打开文件选择', async () => {
        const wrapper = mountUploader()
        const input = wrapper.find<HTMLInputElement>('input[type="file"]')
        const picker = vi.spyOn(input.element, 'click')

        await wrapper.find('.image-uploader').trigger('click')
        expect(picker).toHaveBeenCalledTimes(1)

        await wrapper.find('.image-uploader').trigger('keydown.enter')
        expect(picker).toHaveBeenCalledTimes(2)
    })

    it('上传中展示遮罩与加载图标，且不再响应点击', async () => {
        const wrapper = mountUploader()
        const gate = deferred<{ uri: string; url: string } | null>()
        uploadMock.mockReturnValue(gate.promise)

        await chooseFile(wrapper)

        const box = wrapper.find('.image-uploader')
        expect(box.attributes('aria-busy')).toBe('true')
        expect(box.attributes('aria-disabled')).toBe('true')
        expect(box.classes()).toContain('uploading')
        expect(box.find('.pi-spinner').exists()).toBe(true)

        const picker = vi.spyOn(wrapper.find<HTMLInputElement>('input[type="file"]').element, 'click')
        await box.trigger('click')
        expect(picker).not.toHaveBeenCalled()

        gate.resolve({ uri: 'oss://a.png', url: 'https://obj.suseoaa.com/a.png' })
        await flushPromises()

        expect(box.attributes('aria-busy')).toBe('false')
        expect(box.classes()).not.toContain('uploading')
    })

    it('上传成功时回写 uri / url 并抛出 uploaded', async () => {
        const wrapper = mountUploader()
        uploadMock.mockResolvedValue({ uri: 'oss://a.png', url: 'https://obj.suseoaa.com/a.png' })

        await chooseFile(wrapper)
        await flushPromises()

        expect(wrapper.emitted('update:uri')![0]).toEqual(['oss://a.png'])
        expect(wrapper.emitted('update:url')![0]).toEqual(['https://obj.suseoaa.com/a.png'])
        expect(wrapper.emitted('uploaded')![0]).toEqual([{ uri: 'oss://a.png', url: 'https://obj.suseoaa.com/a.png' }])
    })

    it('上传中再次选择文件会被忽略，不会发起第二次上传', async () => {
        const wrapper = mountUploader()
        const gate = deferred<{ uri: string; url: string } | null>()
        uploadMock.mockReturnValue(gate.promise)

        await chooseFile(wrapper, 'first.png')
        await chooseFile(wrapper, 'second.png')

        expect(uploadMock).toHaveBeenCalledTimes(1)
    })

    it('上传失败时不清空已有地址', async () => {
        const wrapper = mountUploader({ url: 'https://obj.suseoaa.com/old.png' })
        uploadMock.mockResolvedValue(null)

        await chooseFile(wrapper)
        await flushPromises()

        expect(wrapper.find('.image-uploader').classes()).not.toContain('uploading')
        expect(wrapper.emitted('update:uri')).toBeUndefined()
        expect(wrapper.find('img').attributes('src')).toBe('https://obj.suseoaa.com/old.png')
    })

    it('服务端未返回 url 时清空预览，避免预览与提交的 uri 不一致', async () => {
        const wrapper = mountUploader({ url: 'https://obj.suseoaa.com/old.png' })
        uploadMock.mockResolvedValue({ uri: 'oss://new.png', url: '' })

        await chooseFile(wrapper)
        await flushPromises()

        // uri 已换成新图，预览不能还停在旧图
        expect(wrapper.emitted('update:uri')![0]).toEqual(['oss://new.png'])
        expect(wrapper.emitted('update:url')![0]).toEqual([''])
        expect(wrapper.find('img').exists()).toBe(false)
        expect(wrapper.find('.placeholder').exists()).toBe(true)
    })

    it('cropper 模式下点击交给裁剪器，裁剪完成后由组件上传并关闭弹窗', async () => {
        const cropper = makeCropperStub()
        const wrapper = mountUploader({ cropper: true, scene: 'avatar' }, cropper)
        uploadMock.mockResolvedValue({ uri: 'oss://c.png', url: 'https://obj.suseoaa.com/c.png' })

        // 裁剪模式下不再渲染直传用的 input
        expect(wrapper.find('input[type="file"]').exists()).toBe(false)

        await wrapper.find('.image-uploader').trigger('click')
        expect(cropper.opened.value).toBe(1)
        expect(uploadMock).not.toHaveBeenCalled()

        wrapper.findComponent(cropper.component).vm.$emit('cropped', makeBlob())
        await flushPromises()

        expect(uploadMock).toHaveBeenCalledTimes(1)
        const [file, scene] = uploadMock.mock.calls[0]
        // 回归：new File 不传 type 时为空串，会被 uploadImage 判为「格式错误」
        expect((file as File).type).toBe('image/webp')
        expect((file as File).name).toBe('image.webp')
        expect(scene).toBe('avatar')
        expect(wrapper.emitted('update:uri')![0]).toEqual(['oss://c.png'])
        expect(cropper.closed.value).toBe(1)
    })

    it('cropper 模式上传失败时保持弹窗打开，可原地重试', async () => {
        const cropper = makeCropperStub()
        const wrapper = mountUploader({ cropper: true, scene: 'avatar' }, cropper)
        uploadMock
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ uri: 'oss://c.png', url: 'https://obj.suseoaa.com/c.png' })

        wrapper.findComponent(cropper.component).vm.$emit('cropped', makeBlob())
        await flushPromises()

        expect(cropper.closed.value).toBe(0)
        expect(wrapper.emitted('update:uri')).toBeUndefined()

        // 弹窗没关，裁剪结果还在，再确认一次就能重传
        wrapper.findComponent(cropper.component).vm.$emit('cropped', makeBlob())
        await flushPromises()

        expect(cropper.closed.value).toBe(1)
        expect(wrapper.emitted('update:uri')![0]).toEqual(['oss://c.png'])
    })
})
