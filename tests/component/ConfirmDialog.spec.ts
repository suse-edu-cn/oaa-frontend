import { describe, expect, it } from 'vitest'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { mountWithPrimeVue } from '../helpers/mount'

function mountDialog(props: { modelValue?: boolean; loading?: boolean } = {}) {
    return mountWithPrimeVue(ConfirmDialog, {
        props: { modelValue: true, ...props },
    })
}

function findConfirmButton(wrapper: ReturnType<typeof mountDialog>) {
    return wrapper.findAll('button').find((button) => button.text() === '确认')!
}

describe('components/ConfirmDialog', () => {
    it('未勾选确认时按钮不可用', () => {
        const wrapper = mountDialog()

        expect(findConfirmButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('勾选后点击确认触发 confirm 事件', async () => {
        const wrapper = mountDialog()

        await wrapper.find('input[type="checkbox"]').setValue(true)
        await wrapper.vm.$nextTick()

        const confirm = findConfirmButton(wrapper)
        expect(confirm.attributes('disabled')).toBeUndefined()
        await confirm.trigger('click')

        expect(wrapper.emitted('confirm')).toHaveLength(1)
    })

    it('关闭再打开会重置勾选状态', async () => {
        const wrapper = mountDialog()
        await wrapper.find('input[type="checkbox"]').setValue(true)

        await wrapper.setProps({ modelValue: false })
        await wrapper.setProps({ modelValue: true })

        const checkbox = wrapper.find('input[type="checkbox"]')
        expect((checkbox.element as HTMLInputElement).checked).toBe(false)
        expect(findConfirmButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('loading 时按钮处于加载状态', () => {
        const wrapper = mountDialog({ loading: true })

        expect(findConfirmButton(wrapper).attributes('data-loading')).toBe('true')
    })
})
