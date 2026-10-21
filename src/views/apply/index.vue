<!-- 申请信息页 /apply -->
<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { Button, Skeleton } from 'primevue'

import { getMyApplications } from '@/api/application'
import ApplicationCard from '@/components/ApplicationCard.vue'
import OngoingTermCard from '@/components/OngoingTermCard.vue'
import Lightbox from '@/components/ImageLightbox.vue'
import { useOrgStore } from '@/stores/org'
import { toastApiError } from '@/utils/apiError'
import type { ApplicationItem } from '@/types'

const orgStore = useOrgStore()

const applications = ref<ApplicationItem[]>([])
const loading = ref(true)

// 头像灯箱预览，各卡片共用一个实例
const previewVisible = ref(false)
const previewUrl = ref('')
function previewAvatar(url: string) {
    previewUrl.value = url
    previewVisible.value = true
}

// 加载当前用户的申请
async function loadApplications() {
    loading.value = true
    const resp = await getMyApplications()
    loading.value = false

    if (resp?.code == 200) {
        // 无申请时后端返回空的 data 数组
        applications.value = resp.data ?? []
    } else {
        toastApiError('获取申请信息失败', resp)
    }
}

onMounted(() => {
    // 用于把志愿里的部门 / 职位 id 显示为名称
    orgStore.ensureLoaded()
    loadApplications()
})
</script>

<template>
    <main>
        <h1 class="e-title">我的申请</h1>

        <OngoingTermCard />

        <div class="action-bar">
            <router-link to="/apply/new" class="link">
                <Button>
                    <i class="pi pi-plus icon"></i>
                    添加新申请
                </Button>
            </router-link>
        </div>

        <div v-if="loading" class="skeleton-list">
            <div v-for="i in 3" :key="i" class="skeleton-card">
                <Skeleton class="s-head" :width="`${42 + (i % 3) * 9}%`" height="22px" />
                <div class="s-fields">
                    <Skeleton
                        v-for="j in 4"
                        :key="j"
                        height="15px"
                        :width="j === 4 ? '40%' : `${50 + ((i + j) % 3) * 14}%`"
                    />
                </div>
            </div>
        </div>

        <div v-else-if="!applications.length" class="empty">
            <i class="pi pi-times-circle icon"></i>
            <p>当前暂无申请信息</p>
        </div>

        <ApplicationCard v-for="a in applications" :key="a.id" :application="a" @preview="previewAvatar" />

        <!-- 头像灯箱预览 -->
        <Lightbox v-model="previewVisible" :src="previewUrl" alt="用户头像" />
    </main>
</template>

<style lang="less" scoped>
.action-bar {
    text-align: right;
    margin-bottom: 1em;
}

// 无申请信息状态
.empty {
    text-align: center;
    font-size: 18px;
    padding: 5em 0;
    color: var(--p-text-muted-color);

    .icon {
        font-size: 48px;
        display: block;
        color: var(--p-text-muted-color);
    }
}

// 加载中骨架屏，卡片间距与 ApplicationCard 保持一致
.skeleton-card {
    border: 1px solid var(--p-content-border-color);
    border-radius: var(--e-border-radius);
    padding: 16px 18px;
    margin-bottom: 14px;

    .s-head {
        display: block;
        margin-bottom: 14px;
    }

    .s-fields {
        display: flex;
        flex-direction: column;
        gap: 9px;
    }
}
</style>
