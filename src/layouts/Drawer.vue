<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Menu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

defineOptions({ name: 'PageDrawer' })

const route = useRoute()

const links: MenuItem[] = [
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
        label: '申请',
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
</script>

<template>
    <Menu :model="links" class="drawer">
        <template #start>
            <div class="header">青蟹 工作台</div>
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
    border-right: 1px solid #ddd;
    border-radius: 0;
}

.drawer {
    width: 18%;
    max-width: 270px;
    font-size: 14px;
    padding: 8px 4px;
    display: flex;
    flex-direction: column;

    .header {
        font-size: 18px;
        padding: 32px;
        font-weight: bold;
        text-align: center;
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
            background: var(--p-emerald-50);
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
</style>
