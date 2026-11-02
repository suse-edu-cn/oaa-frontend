<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Menu, Skeleton } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

import { logout } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'

withDefaults(
    defineProps<{
        /** 当前页面是否有抽屉 */
        showDrawerToggle?: boolean
        /** 抽屉是否展开 */
        drawerOpen?: boolean
    }>(),
    {
        showDrawerToggle: false,
        drawerOpen: false,
    }
)

const emit = defineEmits<{ toggleDrawer: [] }>()

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// 首页不显示 header 下边框
const isIndex = computed(() => route.path == '/')
// 登录状态下拉菜单
const userMenu = ref<{ toggle: (event: Event) => void } | null>(null)
// 菜单展开状态
const menuOpen = ref(false)

// 启动阶段有 token 时才需要 skeleton
const showAuthSkeleton = computed(() => authStore.hasSession && !authStore.isReady)

defineOptions({ name: 'PageHeader' })

onMounted(async () => {
    if (!authStore.isReady) {
        await initAuthStore()
    }
})

async function onLogout() {
    await logout()

    authStore.clearSession()

    setToast('success', '已登出', '')
    router.push('/auth')
}

const userItems: MenuItem[] = [
    {
        label: '个人主页',
        icon: 'pi pi-user',
        command: () => router.push('/user'),
    },
    {
        label: '登出',
        icon: 'pi pi-sign-out',
        command: onLogout,
    },
]
</script>

<template>
    <header :class="{ index: isIndex }">
        <div class="left">
            <button
                v-if="showDrawerToggle"
                type="button"
                class="nav-toggle"
                aria-label="打开导航菜单"
                :aria-expanded="drawerOpen"
                @click="emit('toggleDrawer')"
            >
                <i class="pi pi-bars" aria-hidden="true"></i>
            </button>
            <RouterLink to="/" class="brand">青蟹</RouterLink>
        </div>
        <div class="right">
            <div v-if="showAuthSkeleton" class="user-skeleton" aria-hidden="true">
                <Skeleton shape="circle" size="2.25rem" />
                <Skeleton width="4rem" height="1rem" />
            </div>
            <template v-else>
                <button
                    v-if="authStore.userInfo"
                    type="button"
                    class="user"
                    aria-haspopup="menu"
                    :aria-expanded="menuOpen"
                    @click="userMenu?.toggle($event)"
                >
                    <img v-if="authStore.userInfo.avatar?.url" :src="authStore.userInfo.avatar.url" alt="用户头像" />
                    <i v-else class="pi pi-user avatar-placeholder"></i>
                    <span class="username">{{ authStore.userInfo.username }}</span>
                </button>
                <RouterLink to="/auth" v-if="!authStore.isAuthed">登录</RouterLink>
            </template>
            <Menu
                ref="userMenu"
                :model="userItems"
                class="header-menu"
                popup
                @show="menuOpen = true"
                @hide="menuOpen = false"
            />
        </div>
    </header>
</template>

<style lang="less" scoped>
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    line-height: var(--e-header-height);
    font-size: 1rem;
    padding: 0 var(--e-content-h-padding);
    border-bottom: 1px solid var(--e-border-color);

    &.index {
        padding: 8px var(--e-content-h-padding);
        border-bottom: none;
    }

    .left {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;

        button i.pi {
            font-size: 20px;
        }
    }

    .brand {
        flex-shrink: 0;
        font-weight: 600;
    }

    // 移动端显示，桌面端用常驻抽屉
    .nav-toggle {
        display: none;
        align-items: center;
        justify-content: center;
        width: var(--e-icon-button-size);
        height: var(--e-icon-button-size);
        margin-left: -0.4rem;
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

    .right {
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 2rem;
        min-width: 0;

        a {
            display: flex;
            align-items: center;
        }

        img {
            flex-shrink: 0;
            width: 2.25em;
            height: 2.25em;
            border-radius: 50%;
        }

        .avatar-placeholder {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.25em;
            height: 2.25em;
            border-radius: 50%;
            background-color: var(--e-surface-subtle);
            color: var(--p-text-muted-color);
        }

        .user {
            display: flex;
            align-items: center;
            gap: 0.4em;
            min-width: 0;
            // 用 button 承载，保证键盘可操作；这里抹掉按钮默认样式
            padding: 0;
            border: none;
            background: none;
            color: inherit;
            font: inherit;
            cursor: pointer;

            &:focus-visible {
                outline: 2px solid var(--e-color-theme);
                outline-offset: 2px;
                border-radius: var(--e-border-radius);
            }
        }

        .username {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .user-skeleton {
            display: flex;
            align-items: center;
            gap: 0.4em;
        }
    }
}

@media screen and (max-width: 800px) {
    header {
        &.index {
            padding-top: 0;
            padding-bottom: 0;
        }

        .nav-toggle {
            display: inline-flex;
        }

        .right {
            gap: 0.75rem;

            .user {
                max-width: 10rem;
            }
        }
    }
}
</style>

<style lang="less">
.header-menu {
    .p-menu-item-link {
        padding: 8px 10px;
        font-size: 15px;
    }
}
</style>
