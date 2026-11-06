import { beforeEach, describe, expect, it } from 'vitest'

import { THEME_STORAGE_KEY } from '@/utils/theme'
import SettingsView from '@/views/settings/index.vue'
import { mountWithPrimeVue } from '../helpers/mount'

function mountSettings() {
    return mountWithPrimeVue(SettingsView)
}

function themeTrigger(wrapper: ReturnType<typeof mountSettings>) {
    return wrapper.get('button.section.clickable')
}

function menuItem(wrapper: ReturnType<typeof mountSettings>, label: string) {
    return wrapper.findAll('[data-testid="menu-item"]').find((item) => item.text() === label)
}

describe('views/settings 主题', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    it('主题行是整行可点的按钮，显示当前主题文字', () => {
        const trigger = themeTrigger(mountSettings())

        expect(trigger.attributes('type')).toBe('button')
        expect(trigger.attributes('aria-haspopup')).toBe('menu')
        expect(trigger.attributes('aria-expanded')).toBe('false')
        expect(trigger.text()).toContain('跟随系统')
    })

    it('点击整行弹出菜单，选中后收起并更新文字', async () => {
        const wrapper = mountSettings()
        const trigger = themeTrigger(wrapper)

        await trigger.trigger('click')
        expect(trigger.attributes('aria-expanded')).toBe('true')
        expect(wrapper.find('[data-testid="menu"]').exists()).toBe(true)

        await menuItem(wrapper, '深色')!.trigger('click')

        expect(wrapper.find('[data-testid="menu"]').exists()).toBe(false)
        expect(trigger.attributes('aria-expanded')).toBe('false')
        expect(trigger.text()).toContain('深色')
        expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    })

    it('再次点击整行收起菜单', async () => {
        const wrapper = mountSettings()
        const trigger = themeTrigger(wrapper)

        await trigger.trigger('click')
        await trigger.trigger('click')

        expect(trigger.attributes('aria-expanded')).toBe('false')
        expect(wrapper.find('[data-testid="menu"]').exists()).toBe(false)
    })
})
