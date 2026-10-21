<!-- 公告详情 /announcement/:id -->
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Skeleton, Tag } from 'primevue'

import { getAnnouncement } from '@/api/announcement'
import MarkdownPreview from '@/components/MarkdownPreview.vue'
import { toastApiError } from '@/utils/apiError'
import { fromIso } from '@/utils/date'

import type { AnnouncementItem } from '@/types'

const route = useRoute()
const router = useRouter()

const announcement = ref<AnnouncementItem | null>(null)
const loading = ref(true)
const loadFailed = ref(false)

async function loadAnnouncement() {
    loading.value = true
    loadFailed.value = false

    try {
        const resp = await getAnnouncement(String(route.params.id))
        if (resp?.code == 200) {
            announcement.value = resp.data ?? null
            document.title = announcement.value?.title + ' - 公告详情 - 青蟹' || '公告详情 - 青蟹'
        } else if (resp?.code == 404) {
            router.replace('/404')
        } else {
            loadFailed.value = true
            toastApiError('获取公告详情失败', resp)
        }
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadAnnouncement()
})
</script>

<template>
    <main :aria-busy="loading">
        <!-- 加载中骨架屏 -->
        <template v-if="loading">
            <Skeleton class="title-skeleton" width="55%" height="2.25rem" />
            <div class="description" aria-hidden="true">
                <Skeleton width="6rem" height="14px" />
                <Skeleton width="4.5rem" height="14px" />
                <Skeleton width="9rem" height="14px" />
            </div>
            <div class="skeleton-content" aria-hidden="true">
                <div v-for="i in 4" :key="i" class="s-para">
                    <Skeleton width="100%" height="16px" />
                    <Skeleton :width="`${70 + (i % 3) * 9}%`" height="16px" />
                    <Skeleton width="45%" height="16px" />
                </div>
            </div>
            <Skeleton class="update-skeleton" width="12rem" height="14px" />
        </template>

        <template v-else>
            <h1 class="e-title title">{{ announcement?.title || '公告详情' }}</h1>
            <template v-if="announcement">
                <div class="description">
                    <Tag v-if="!announcement.is_active" value="草稿" severity="warn" />
                    <span>{{ announcement.department_name }}</span>
                    <span>{{ announcement.publisher_name }}</span>
                    <span>{{
                        announcement.published_at
                            ? '发布于 ' + fromIso(announcement.published_at)
                            : '创建于 ' + fromIso(announcement.created_at)
                    }}</span>
                </div>
                <MarkdownPreview :content="announcement.content" />
                <div class="update">最近更新时间：{{ fromIso(announcement.updated_at) }}</div>
            </template>
            <div v-else class="e-table-empty">
                {{ loadFailed ? '公告加载失败，请稍后重试' : '公告不存在或已被删除' }}
            </div>
        </template>
    </main>
</template>

<style lang="less" scoped>
.title {
    margin-bottom: 1em;
}

.title-skeleton {
    display: block;
    margin: 2em 0;
}

.description {
    display: flex;
    align-items: center;
    gap: 1em;
    font-size: 14px;
    color: var(--p-text-muted-color);
    padding-bottom: 1em;
    border-bottom: 1px solid var(--p-content-border-color);
    margin-bottom: 1em;
}

// 正文骨架，行距与 Markdown 正文接近
.skeleton-content {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .s-para {
        display: flex;
        flex-direction: column;
        gap: 10px;

        & + .s-para {
            margin-top: 1em;
        }
    }
}

.update {
    margin-top: 1em;
    font-size: 14px;
    color: var(--p-text-muted-color);
}

.update-skeleton {
    display: block;
    margin-top: 1em;
}
</style>
