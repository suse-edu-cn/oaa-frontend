<!-- 公告详情 /announcement/:id -->
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { Tag } from 'primevue'

import MarkdownPreview from '@/components/MarkdownPreview.vue'
import { fromIso } from '@/utils/date'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

import type { AnnouncementItem, ApiResponse } from '@/types'

const route = useRoute()

const announcement = ref<AnnouncementItem | null>(null)
const loading = ref(false)

async function loadAnnouncement() {
    loading.value = true
    try {
        const resp = await request<ApiResponse<AnnouncementItem>>({
            url: '/announcement/get',
            method: 'GET',
            params: { announcement_id: String(route.params.id) },
        })
        if (resp?.code == 200) {
            announcement.value = resp.data ?? null
        } else {
            setToast('error', '获取公告详情失败', resp?.message || '未知错误，请联系负责后端的同学')
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
    <main>
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
        <div v-else-if="loading" class="e-table-empty">正在加载......</div>
        <div v-else class="e-table-empty">公告不存在或已被删除</div>
    </main>
</template>

<style lang="less" scoped>
.title {
    margin-bottom: 1em;
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

.update {
    margin-top: 1em;
    font-size: 14px;
    color: var(--p-text-muted-color);
}
</style>
