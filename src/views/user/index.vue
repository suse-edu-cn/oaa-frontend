<!-- 个人信息页 /user -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
const visibleAnnouncements = computed(() => announcements.value.slice(0, 10))
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

function formatPublishedAt(a: AnnouncementItem): string {
    if (a.published_at) return `发布于 ${fromIso(a.published_at) || '—'}`
    return `创建于 ${fromIso(a.created_at) || '—'}`
}

onMounted(async () => {
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
    <div class="e-banner" style="background-color: var(--e-accent-soft)" v-if="authStore.userInfo">
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
    <div class="e-banner" style="background-color: var(--e-accent-soft)" v-else>
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
        <div class="section-header">
            <h1 class="e-title">公告</h1>
            <router-link to="/announcement/list" class="more-link">
                查看更多
                <i class="pi pi-arrow-right"></i>
            </router-link>
        </div>

        <!-- 加载骨架屏 -->
        <div class="announcement-grid" v-if="loading">
            <Skeleton v-for="i in 3" :key="i" class="skeleton-card" height="9.5rem" />
        </div>

        <div class="announcement-grid" v-else-if="visibleAnnouncements.length">
            <router-link
                v-for="a in visibleAnnouncements"
                :key="a.announcement_id"
                :to="`/announcement/${a.announcement_id}`"
                class="e-card card"
            >
                <div class="title">{{ a.title }}</div>
                <div class="info">
                    <span>{{ a.publisher_name }}</span>
                    <span>{{ a.department_name }}</span>
                </div>
                <div class="date">{{ formatPublishedAt(a) }}</div>
            </router-link>
        </div>

        <div v-else class="e-table-empty">暂无公告，享受美好的一天吧^^</div>
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
        border: 1px solid var(--e-border-color);
        background-color: var(--e-surface);
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
            color: var(--p-text-muted-color);

            .pi {
                font-family: 'primeicons', 'Inter';
            }

            .grow {
                flex-grow: 1;
            }

            .p-button {
                border: 1px solid var(--p-content-border-color) !important;
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

.section-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;

    .e-title {
        margin-bottom: 1.5rem;
    }

    .more-link {
        font-size: 14px;
        color: var(--p-text-muted-color);

        &:hover {
            color: var(--e-color-theme);
        }
    }
}

.announcement-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;

    .skeleton-card {
        border-radius: var(--e-border-radius);
    }

    .card {
        min-height: 120px;
        gap: 12px;

        .title {
            display: -webkit-box;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            font-size: 17px;
            font-weight: 600;
            line-height: 1.45;
        }

        .info {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25em 1em;
            margin-top: auto;
            font-size: 13px;
            color: var(--p-text-muted-color);
        }

        .date {
            font-size: 13px;
            color: var(--p-text-muted-color);
        }
    }
}

@media screen and (max-width: 800px) {
    .e-banner {
        --banner-direction: column;
        --banner-info-align: center;
        --banner-h-margin: auto;
    }

    .announcement-grid {
        grid-template-columns: 1fr;
    }
}
</style>
