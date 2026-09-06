<!-- 申请表审核页 /apply/review -->
<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'

import { Select } from 'primevue'

import ApplicationCard from '@/components/ApplicationCard.vue'
import Lightbox from '@/components/ImageLightbox.vue'
import { useOrgStore } from '@/stores/org'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

import type { ApiResponse, ApplicationItem, TermInfo } from '@/types'

const orgStore = useOrgStore()

// ================= 周期 =================
const terms = ref<TermInfo[]>([])
const termId = ref<number | null>(null)

// 加载可供选择的活动周期
async function loadTerms() {
    const resp = await request<ApiResponse<TermInfo[]>>({
        url: '/term/list',
        method: 'GET',
    })
    if (resp?.code == 200) {
        terms.value = resp.data ?? []
        // 打开页面时默认选中第一个活动周期
        // 由 watch 触发申请列表加载
        termId.value = terms.value[0]?.id ?? null
    } else {
        setToast('error', '获取活动周期列表失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

// ================= 申请列表 =================
const applications = ref<ApplicationItem[]>([])
const loading = ref(false)
// 请求序号，快速切换过滤项时丢弃旧响应
let listRequests = 0
const deptId = ref<number | null>(null)
async function loadApplications() {
    if (!termId.value) return

    const params: Record<string, number> = { term_id: termId.value }
    if (deptId.value) params.department_id = deptId.value

    const seq = ++listRequests
    loading.value = true
    try {
        const resp = await request<ApiResponse<ApplicationItem[]>>({
            url: '/application/list',
            method: 'GET',
            params,
        })
        if (seq !== listRequests) return
        if (resp?.code == 200) {
            applications.value = resp.data ?? []
        } else {
            setToast('error', '获取申请列表失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        if (seq === listRequests) loading.value = false
    }
}
watch([termId, deptId], loadApplications)

// 头像灯箱预览，各卡片共用一个实例
const previewVisible = ref(false)
const previewUrl = ref('')
function previewAvatar(url: string) {
    previewUrl.value = url
    previewVisible.value = true
}

onMounted(() => {
    // 用于把志愿里的部门 / 职位 id 显示为名称
    orgStore.ensureLoaded()
    loadTerms()
})
</script>

<template>
    <main>
        <h1 class="e-title">审核申请</h1>

        <div class="filter-bar">
            <label for="review-term">活动周期</label>
            <Select
                v-model="termId"
                input-id="review-term"
                :options="terms"
                option-label="title"
                option-value="id"
                placeholder="请选择活动周期"
            />
            <label for="review-dept">部门</label>
            <Select
                v-model="deptId"
                input-id="review-dept"
                :options="orgStore.departments"
                option-label="name"
                option-value="id"
                placeholder="全部部门"
                show-clear
            />
        </div>

        <div v-if="loading" class="empty">
            <i class="pi pi-spin pi-spinner icon"></i>
            <p>正在加载信息......</p>
        </div>

        <div v-else-if="!applications.length" class="empty">
            <i class="pi pi-times-circle icon"></i>
            <p>暂无符合条件的申请</p>
        </div>

        <template v-else>
            <ApplicationCard
                v-for="a in applications"
                :key="a.id"
                :application="a"
                review-mode
                @preview="previewAvatar"
            />
        </template>

        <!-- 头像灯箱预览 -->
        <Lightbox v-model="previewVisible" :src="previewUrl" alt="用户头像" />
    </main>
</template>

<style lang="less" scoped>
.filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 1.5em;

    label {
        font-size: 14px;
        color: var(--p-text-muted-color);
    }

    .p-select {
        width: 240px;
    }
}

// 未选择周期 / 加载中 / 无符合条件的申请状态
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
</style>
