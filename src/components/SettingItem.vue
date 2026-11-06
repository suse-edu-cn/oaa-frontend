<!-- 设置页单项 -->
<script lang="ts" setup generic="T extends string | number">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Menu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

const props = withDefaults(
    defineProps<{
        /** primeicons 类名 */
        icon: string
        /** 左侧字段名 */
        label: string
        /** text 右侧渲染插槽内容，dropdown 右侧显示当前选项并展开菜单，link 右侧显示箭头并跳转链接 */
        variant?: 'text' | 'dropdown' | 'link'
        /** 外链地址，需 variant='link' */
        href?: string
        /** dropdown 的选项 */
        options?: { label: string; value: T }[]
        /** dropdown 当前选中的值 */
        modelValue?: T
    }>(),
    { variant: 'text', options: () => [] }
)

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const rootEl = ref<HTMLElement | null>(null)
const menu = ref<{ toggle: (event: Event) => void } | null>(null)
const menuOpen = ref(false)

const currentLabel = computed(() => props.options.find((option) => option.value === props.modelValue)?.label ?? '')

const menuItems = computed<MenuItem[]>(() =>
    props.options.map((option) => {
        // 勾选图标固定占位
        const active = option.value === props.modelValue

        return {
            label: option.label,
            icon: 'pi pi-check',
            class: active ? 'setting-item-active' : '',
            command: () => emit('update:modelValue', option.value),
        }
    })
)

// 组件根节点是两个分支（a / button）+ 弹层，属性需显式转发到可点击的那一行
defineOptions({ inheritAttrs: false })

function onRootClick(event: Event) {
    if (props.variant !== 'dropdown') return
    menu.value?.toggle(event)
}

// 统一把弹层贴到整行右边缘
function syncMenuRight() {
    const overlay = document.querySelector<HTMLElement>('.p-menu.setting-item-menu')
    const trigger = rootEl.value
    if (!overlay || !trigger) return

    const gap = document.documentElement.clientWidth - trigger.getBoundingClientRect().right - window.scrollX
    overlay.style.setProperty('inset-inline-start', 'auto')
    overlay.style.setProperty('inset-inline-end', `${Math.max(8, gap)}px`)
}

function onMenuShow() {
    menuOpen.value = true
    syncMenuRight()
    // 展开期间 viewport 变化时重新计算
    window.addEventListener('resize', syncMenuRight)
}

function onMenuHide() {
    menuOpen.value = false
    window.removeEventListener('resize', syncMenuRight)
}

onBeforeUnmount(() => window.removeEventListener('resize', syncMenuRight))
</script>

<template>
    <a v-if="href" v-bind="$attrs" :href="href" class="section clickable" target="_blank" rel="noopener noreferrer">
        <i :class="icon" aria-hidden="true"></i>
        <span class="key">{{ label }}</span>
        <span class="value">
            <slot v-if="variant !== 'link'" />
            <i v-else class="pi pi-arrow-right" aria-hidden="true"></i>
        </span>
    </a>
    <button
        v-else
        ref="rootEl"
        v-bind="$attrs"
        type="button"
        class="section clickable"
        :aria-haspopup="variant === 'dropdown' ? 'menu' : undefined"
        :aria-expanded="variant === 'dropdown' ? menuOpen : undefined"
        @click="onRootClick"
    >
        <i :class="icon" aria-hidden="true"></i>
        <span class="key">{{ label }}</span>
        <span class="value">
            <template v-if="variant === 'dropdown'">{{ currentLabel }}</template>
            <slot v-else />
            <i v-if="variant === 'dropdown'" class="pi pi-chevron-down" aria-hidden="true"></i>
            <i v-else-if="variant === 'link'" class="pi pi-arrow-right" aria-hidden="true"></i>
        </span>
    </button>
    <Menu
        v-if="variant === 'dropdown'"
        ref="menu"
        :model="menuItems"
        class="setting-item-menu"
        popup
        @show="onMenuShow"
        @hide="onMenuHide"
    />
</template>

<style lang="less" scoped>
.section {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 16px 24px;
    font-size: 15px;
    border-radius: var(--e-border-radius);
    border: 0;
    background: none;
    color: inherit;
    font-family: inherit;
    text-align: left;

    &:focus-visible {
        outline: 2px solid var(--e-color-theme);
        outline-offset: -2px;
    }

    // 只描行首图标
    & > i {
        font-size: 18px;
        margin-right: 0.5em;
        color: var(--p-menu-submenu-label-color);
    }

    .key {
        color: var(--p-menu-submenu-label-color);
    }

    .value {
        display: inline-flex;
        align-items: center;
        gap: 0.35em;
        margin-left: auto;
        color: var(--p-menu-item-color);

        & > i {
            font-size: 18px;
            transition: transform 0.2s;
        }
    }

    &[aria-expanded='true'] .value .pi-chevron-down {
        transform: rotate(180deg);
    }
}

.section.clickable {
    transition: all 0.3s;
    cursor: pointer;

    &:hover {
        background-color: var(--p-menu-item-focus-background);
    }
}

@media screen and (max-width: 800px) {
    .section {
        flex-wrap: wrap;
        padding: 14px 16px;
    }
}
</style>

<style lang="less">
.setting-item-menu {
    // PrimeVue 会把触发行的宽度写成内联 min-width，这里还原成随内容收缩
    width: max-content;
    min-width: 0 !important;
    max-width: calc(100vw - 2 * var(--e-content-h-padding));

    .p-menu-item-icon {
        font-size: 0.8rem;
    }

    .p-menu-item:not(.setting-item-active) .p-menu-item-icon {
        visibility: hidden;
    }

    .setting-item-active .p-menu-item-icon {
        color: var(--p-primary-color);
    }
}
</style>
