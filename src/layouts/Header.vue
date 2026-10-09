<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Menu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'
import cookies from 'js-cookie'

import { logout } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// 首页不显示 header 下边框
const isIndex = computed(() => route.path == '/')
// 登录状态点击用户头像的下拉菜单
const userMenu = ref<{ toggle: (event: Event) => void } | null>(null)

defineOptions({ name: 'PageHeader' })

onMounted(async () => {
    if (!authStore.isReady) {
        await initAuthStore()
    }
})

async function onLogout() {
    await logout()

    cookies.remove('token', { path: '/' })
    cookies.remove('refresh_token', { path: '/' })
    cookies.remove('user_id', { path: '/' })
    authStore.$patch({ token: '', refreshToken: '', isAuthed: false, userInfo: null })

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
            <div v-if="authStore.userInfo" class="user" @click="userMenu?.toggle($event)">
                <img :src="authStore.userInfo.avatar?.url" alt="用户头像" />
                {{ authStore.userInfo.username }}
            </div>
            <Menu ref="userMenu" :model="userItems" class="header-menu" popup />
            <router-link to="/auth" v-if="!authStore.isAuthed">登录</router-link>
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
    border-bottom: 1px solid #ddd;

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

        .user {
            display: flex;
            align-items: center;
            gap: 0.4em;
            cursor: pointer;
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
