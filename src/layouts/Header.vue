<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Menu, Skeleton } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

import { logout } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// 首页不显示 header 下边框
const isIndex = computed(() => route.path == '/')
// 登录状态下拉菜单
const userMenu = ref<{ toggle: (event: Event) => void } | null>(null)

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
            <router-link to="/">青蟹</router-link>
        </div>
        <div class="right">
            <router-link to="#">比赛中心</router-link>
            <div v-if="showAuthSkeleton" class="user-skeleton" aria-hidden="true">
                <Skeleton shape="circle" size="2.25rem" />
                <Skeleton width="4rem" height="1rem" />
            </div>
            <template v-else>
                <div v-if="authStore.userInfo" class="user" @click="userMenu?.toggle($event)">
                    <img v-if="authStore.userInfo.avatar?.url" :src="authStore.userInfo.avatar.url" alt="用户头像" />
                    <i v-else class="pi pi-user avatar-placeholder"></i>
                    {{ authStore.userInfo.username }}
                </div>
                <router-link to="/auth" v-if="!authStore.isAuthed">登录</router-link>
            </template>
            <Menu ref="userMenu" :model="userItems" class="header-menu" popup />
        </div>
    </header>
</template>

<style lang="less" scoped>
header {
    display: flex;
    justify-content: space-between;
    line-height: 3.75rem;
    font-size: 1rem;
    padding: 0 var(--e-content-h-padding);
    border-bottom: 1px solid var(--e-border-color);

    &.index {
        padding: 8px var(--e-content-h-padding);
        border-bottom: none;
    }

    .left {
        font-weight: 600;
    }

    .right {
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 2rem;

        a {
            display: flex;
            align-items: center;
        }

        img {
            width: 2.25em;
            height: 2.25em;
            border-radius: 50%;
        }

        .avatar-placeholder {
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
            cursor: pointer;
        }

        .user-skeleton {
            display: flex;
            align-items: center;
            gap: 0.4em;
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
