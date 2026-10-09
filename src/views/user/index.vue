<!-- 个人信息页 /user -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'

import { Button, Skeleton } from 'primevue'

import { getAnnouncementList } from '@/api/announcement'
import { fromIso } from '@/utils/date'
import setToast from '@/utils/setToast'
import { initAuthStore } from '@/utils/initAuthStore'
import { useAuthStore } from '@/stores/auth'

import type { AnnouncementItem } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const announcements = ref<AnnouncementItem[]>([])
const loading = ref(true)

async function loadAnnouncements() {
    const resp = await getAnnouncementList({ status: 'active' })
    if (resp?.code == 200) {
        announcements.value = resp.data ?? []
    } else {
        setToast('error', '获取公告失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
    loading.value = false
}

onMounted(async () => {
    // 如果因刷新等原因导致 authStore 未初始化，则先 init
    if (!authStore.isReady) {
        await initAuthStore()
    }

    if (!authStore.isAuthed) {
        setToast('error', '获取用户信息失败', '当前尚未登录！')
        router.push('/auth')
        return
    }

    loadAnnouncements()
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
                    <div class="identity">
                        <span>
                            <i class="pi pi-building"></i>
                            {{ authStore.userInfo.department }}
                        </span>
                        <span>
                            <i class="pi pi-user"></i>
                            {{ authStore.userInfo.role }}
                        </span>
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
        <h1 class="e-title">公告</h1>

        <!-- 加载骨架屏 -->
        <div class="list" v-if="loading">
            <Skeleton v-for="i in 3" :key="i" class="skeleton-item" height="3.75rem" />
        </div>

        <div class="list" v-else-if="announcements.length">
            <div v-for="a in announcements" :key="a.announcement_id" class="announcement-item">
                <router-link :to="`/announcement/${a.announcement_id}`" class="title">{{ a.title }}</router-link>
                <div class="data">
                    <span class="item">
                        <span>{{ a.publisher_name }}</span>
                        <span>{{ a.department_name }}</span>
                    </span>
                    <span v-if="a.published_at">发布于 {{ fromIso(a.published_at) || '—' }}</span>
                </div>
            </div>
        </div>

        <div class="list" v-else>
            <div class="e-table-empty">暂无个人公告，享受美好的一天吧^^</div>
        </div>
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
        padding: 1px;
        border: 1px solid #ddd;
        background-color: #fff;
    }

    .info {
        flex: 1;
        text-align: var(--banner-info-align);

        .title {
            font-size: 32px;
            font-weight: bold;
            margin: 8px var(--banner-h-margin) 16px;
        }

        .subtitle {
            display: flex;
            flex-direction: var(--banner-direction);
            gap: 8px;
            align-items: center;
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

        .identity {
            display: flex;
            gap: 24px;
        }

        .subtitle.skeleton {
            display: flex;
            flex-direction: column;
            gap: 8px;
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
}

.list {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .skeleton-item {
        border-radius: var(--e-border-radius);
    }

    .announcement-item {
        padding: 12px 6px;

        &:not(:first-child) {
            border-top: 1px solid var(--p-content-border-color);
        }

        .title {
            display: block;
            font-size: 18px;
            font-weight: 600;
            line-height: 1.4;
            margin: 2px 0 7px;
        }

        .data {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: var(--p-text-muted-color);

            .item {
                display: flex;
                align-items: center;
                gap: 1em;
            }
        }
    }
}

@media screen and (max-width: 800px) {
    .e-banner {
        --banner-direction: column;
        --banner-info-align: center;
        --banner-h-margin: auto;
    }
}
</style>
