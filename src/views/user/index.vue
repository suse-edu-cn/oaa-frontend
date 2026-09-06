<!-- 个人信息页 /user -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'

import { Button, Skeleton } from 'primevue'

import setToast from '@/utils/setToast'
import { initAuthStore } from '@/utils/initAuthStore'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
    // 如果因刷新等原因导致 authStore 未初始化，则先 init
    if (!authStore.isReady) {
        await initAuthStore()
    }

    if (!authStore.isAuthed) {
        setToast('error', '获取用户信息失败', '当前尚未登录！')
        router.push('/auth')
    }
})
</script>

<template>
    <!-- 登录状态正常就显示信息 banner -->
    <div class="e-banner" style="background-color: var(--p-emerald-50)" v-if="authStore.userInfo">
        <img :src="authStore.userInfo.avatar?.url" alt="用户头像" srcset="" />
        <div class="info">
            <div class="title">{{ authStore.userInfo.username }}</div>
            <div class="subtitle">
                <span class="left">
                    <div>
                        {{ authStore.userInfo.name }}&nbsp;·&nbsp;{{ authStore.userInfo.role }}&nbsp;·&nbsp;{{
                            authStore.userInfo.department
                        }}
                    </div>
                    <div class="pi pi-users">&nbsp;{{ authStore.userInfo.student_id }}</div>
                </span>
                <span class="grow"></span>
                <router-link to="/user/edit">
                    <Button label="编辑个人信息" icon="pi pi-pencil" severity="secondary" />
                </router-link>
            </div>
        </div>
    </div>
    <!-- 否则显示加载中骨架屏 -->
    <div class="e-banner" style="background-color: var(--p-emerald-50)" v-else>
        <Skeleton shape="circle" size="129px" />
        <!-- 8rem + border -->
        <div class="info">
            <Skeleton class="title" width="12rem" height="2.25rem" />
            <div class="subtitle skeleton">
                <Skeleton width="20rem" height="1.25rem" />
                <Skeleton width="20rem" height="1.25rem" />
            </div>
        </div>
    </div>

    <main>
        <div class="list">测试信息</div>
    </main>
</template>

<style lang="less" scoped>
.e-banner {
    flex-direction: var(--banner-direction);
    gap: 2rem;

    img {
        width: 8rem;
        height: 8rem;
        border-radius: 50%;
        padding: 2px;
        border: 1px solid #ddd;
        background-color: #fff;
    }

    .info {
        flex: 1;
        text-align: var(--banner-info-align);

        .title {
            font-size: 2.25rem;
            font-weight: bold;
            margin: 0.5rem var(--banner-h-margin) 1rem;
        }

        .subtitle {
            display: flex;
            flex-direction: var(--banner-direction);
            gap: 0.5rem;
            align-items: center;
            font-size: 1rem;
            line-height: 2;
            color: #555;

            .pi {
                font-family: 'primeicons', 'Inter';
            }

            .grow {
                flex-grow: 1;
            }

            .p-button {
                border: 1px solid #ccc !important;
            }
        }

        .subtitle.skeleton {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            align-items: start;
        }
    }

    --banner-direction: row;
    --banner-info-align: left;
    --banner-h-margin: 0;
}

main {
    display: flex;
    flex-direction: column;
    gap: 3rem;
}

@media screen and (max-width: 800px) {
    .e-banner {
        --banner-direction: column;
        --banner-info-align: center;
        --banner-h-margin: auto;
    }
}
</style>
