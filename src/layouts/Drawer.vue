<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

import { useAuthStore } from '@/stores/auth'

defineOptions({ name: 'PageDrawer' })

const props = withDefaults(
    defineProps<{
        /** 移动端侧滑抽屉是否展开，桌面端忽略 */
        mobileOpen?: boolean
    }>(),
    { mobileOpen: false }
)

const emit = defineEmits<{ close: [] }>()

interface DrawerItem extends MenuItem {
    to?: string
    /** 可见所需最低等级，默认取目标路由的 meta.level */
    level?: number
    items?: DrawerItem[]
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const roleLevel = computed(() => authStore.userInfo?.role_level ?? 0)

const menuGroups: DrawerItem[] = [
    {
        separator: true,
    },
    {
        label: '个人',
        items: [
            {
                label: '主页',
                icon: 'pi pi-home',
                to: '/user',
            },
            {
                label: '编辑资料',
                icon: 'pi pi-pencil',
                to: '/user/edit',
            },
            {
                label: '公告',
                icon: 'pi pi-bell',
                to: '/announcement/list',
            },
        ],
    },
    {
        separator: true,
    },
    {
        label: '管理',
        items: [
            {
                label: '用户管理',
                icon: 'pi pi-users',
                to: '/manage/users',
            },
            {
                label: '组织管理',
                icon: 'pi pi-sitemap',
                to: '/manage/org',
            },
            {
                label: '招新/换届管理',
                icon: 'pi pi-calendar',
                to: '/manage/term',
            },
        ],
    },
    {
        separator: true,
    },
    {
        label: '招新换届',
        items: [
            {
                label: '我的申请',
                icon: 'pi pi-file-edit',
                to: '/apply',
            },
            {
                label: '审核申请',
                icon: 'pi pi-block-quote',
                to: '/apply/review',
            },
            {
                label: '面试管理',
                icon: 'pi pi-lightbulb',
                to: '/apply/staff',
            },
        ],
    },
    {
        label: '设置',
        items: [
            {
                label: '工作台设置',
                icon: 'pi pi-cog',
                to: '/settings',
            },
        ],
    },
]

function requiredLevel(item: DrawerItem): number {
    if (item.level !== undefined) return item.level
    if (!item.to) return 0
    return router.resolve(item.to).meta.level ?? 0
}

function filterByLevel(items: DrawerItem[]): DrawerItem[] {
    const visible: DrawerItem[] = []

    for (const item of items) {
        if (item.separator) {
            // 整组被隐藏后避免出现相邻分隔线；首条保留，作为菜单顶部分隔
            const last = visible[visible.length - 1]
            if (!last || !last.separator) visible.push(item)
            continue
        }

        if (item.items) {
            if (item.level !== undefined && roleLevel.value < item.level) continue
            const children = filterByLevel(item.items)
            if (children.length) visible.push({ ...item, items: children })
            continue
        }

        if (roleLevel.value >= requiredLevel(item)) visible.push(item)
    }

    // 最后一组被隐藏时不要留下悬空分隔线
    while (visible[visible.length - 1]?.separator) visible.pop()

    return visible
}

const links = computed(() => filterByLevel(menuGroups))

// 移动端抽屉按 Esc 收起
function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && props.mobileOpen) emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
    <Menu :model="links" class="drawer" :class="{ open: mobileOpen }">
        <template #start>
            <div class="header">
                <span>青蟹 工作台</span>
                <button type="button" class="close" aria-label="关闭导航菜单" @click="emit('close')">
                    <i class="pi pi-times" aria-hidden="true"></i>
                </button>
            </div>
        </template>
        <template #submenulabel="{ item }">
            <span class="title">{{ item.label }}</span>
        </template>
        <template #item="{ item }">
            <RouterLink v-if="item.to" :to="item.to" class="item" :class="{ active: item.to === route.path }">
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
            </RouterLink>
            <span v-else class="item">
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
            </span>
        </template>
    </Menu>
</template>

<style lang="less">
// 移除 menu 自身样式
.p-menu.drawer {
    border: none;
    border-right: 1px solid var(--e-border-color);
    border-radius: 0;
}

.drawer {
    width: clamp(208px, 18%, 270px);
    max-width: 270px;
    min-height: 0;
    overflow-y: auto;
    font-size: 14px;
    padding: 8px 4px;
    display: flex;
    flex-direction: column;

    .header {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        font-size: 18px;
        padding: 32px;
        font-weight: bold;
        text-align: center;
    }

    .close {
        display: none;
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        padding: 0;
        border: none;
        border-radius: var(--e-border-radius);
        background: transparent;
        color: var(--e-text-color);
        font-size: 1.1rem;
        cursor: pointer;

        &:active {
            background-color: var(--e-surface-hover);
        }
    }

    // 列表撑满剩余空间，把最后一组菜单推到底部
    .p-menu-list {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }

    li:nth-last-child(2) {
        margin-top: auto;
    }

    .item {
        display: flex;
        align-items: center;
        gap: 0.6em;
        border-radius: var(--e-border-radius);
        padding: 10px 12px;
        cursor: pointer;
        transition: all 0.2s ease;

        &.active {
            background: var(--e-accent-soft);
            color: var(--e-color-theme);
        }

        &:not(.active):hover {
            color: var(--p-menu-submenu-label-color);
        }

        span {
            font-size: 15px;
        }
    }

    .footer {
        font-size: 15px;
        color: var(--p-menu-submenu-label-color);
    }
}

// 移动端：抽屉从左侧滑出，桌面端保持常驻
@media screen and (max-width: 800px) {
    .p-menu.drawer {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: calc(var(--e-mobile-overlay-z) + 1);
        width: var(--e-mobile-nav-width);
        max-width: none;
        height: 100dvh;
        padding-top: calc(8px + env(safe-area-inset-top));
        overflow-y: auto;
        border-radius: 0;
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.2);
        transform: translateX(-105%);
        visibility: hidden;
        transition:
            transform 0.25s ease,
            visibility 0.25s ease;

        &.open {
            transform: none;
            visibility: visible;
        }

        .header {
            justify-content: flex-start;
            padding: 20px 16px;
            font-size: 17px;

            .close {
                display: inline-flex;
                right: 8px;
            }
        }

        // 移动端菜单更宽松的触控高度
        .item {
            padding: 13px 12px;

            span {
                font-size: 16px;
            }
        }
    }
}
</style>
