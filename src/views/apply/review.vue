<!-- 申请表审核页 /apply/review -->
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'

import { Button, Dialog, Select, Tab, TabList, Tabs, Textarea } from 'primevue'

import ApplicationCard from '@/components/ApplicationCard.vue'
import Lightbox from '@/components/ImageLightbox.vue'
import { useOrgStore } from '@/stores/org'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

import type { ApiResponse, ApplicationItem, RoleItem, TermInfo } from '@/types'

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

// ================= 处理状态筛选 =================
// 待定视为未处理，录取 / 已调剂 / 未通过视为已处理
const activeTab = ref('unprocessed')
const filteredApplications = computed(() => {
    if (activeTab.value === 'unprocessed') return applications.value.filter((a) => a.decision === '待定')
    if (activeTab.value === 'processed') return applications.value.filter((a) => a.decision !== '待定')
    return applications.value
})

// ================= 审批 =================
const decisionOptions = ['录取第一志愿', '录取第二志愿', '已调剂', '未通过', '待定']

const reviewVisible = ref(false)
const reviewTarget = ref<ApplicationItem | null>(null)
const reviewForm = ref({
    decision: '',
    deptId: null as number | null,
    roleId: null as number | null,
    remark: '',
})

const resultRoles = ref<RoleItem[]>([])
const rolesLoading = ref(false)
let resultRoleRequests = 0
async function loadResultRoles(departmentId: number) {
    const seq = ++resultRoleRequests
    rolesLoading.value = true
    try {
        const resp = await request<ApiResponse<RoleItem[]>>({
            url: '/application/role',
            method: 'GET',
            params: { department_id: departmentId },
        })
        if (seq !== resultRoleRequests) return
        if (resp?.code == 200) {
            resultRoles.value = resp.data ?? []
        } else {
            setToast('error', '获取职位列表失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        if (seq === resultRoleRequests) rolesLoading.value = false
    }
}

// 部门变化后重载职位
function onResultDeptChange() {
    reviewForm.value.roleId = null
    if (reviewForm.value.deptId) loadResultRoles(reviewForm.value.deptId)
    else resultRoles.value = []
}
// 预填当前申请的决议与结果，便于重新审批
function openReview(a: ApplicationItem) {
    reviewTarget.value = a
    reviewForm.value = {
        decision: a.decision || '',
        deptId: a.result?.department_id ?? null,
        roleId: a.result?.role_id ?? null,
        remark: a.decision_remark || '',
    }
    resultRoles.value = []
    // 预填了部门时拉取对应职位
    if (reviewForm.value.deptId) loadResultRoles(reviewForm.value.deptId)
    reviewVisible.value = true
}

const reviewCanSave = computed(() => {
    if (!reviewForm.value.decision) return false
    if (reviewForm.value.decision === '已调剂') {
        return reviewForm.value.deptId !== null && reviewForm.value.roleId !== null
    }
    return true
})
const reviewSaving = ref(false)

async function onReviewConfirm() {
    const target = reviewTarget.value
    const decision = reviewForm.value.decision
    if (!target || !decision) return

    const data: Record<string, unknown> = {
        application_id: target.id,
        decision,
        remark: reviewForm.value.remark.trim(),
    }
    // 录取按对应志愿的部门 / 职位提交，已调剂按表单选择提交
    if (decision === '录取第一志愿') {
        data.result_department_id = target.first_choice.department_id
        data.result_role_id = target.first_choice.role_id
    } else if (decision === '录取第二志愿') {
        data.result_department_id = target.second_choice.department_id
        data.result_role_id = target.second_choice.role_id
    } else if (decision === '已调剂') {
        data.result_department_id = reviewForm.value.deptId
        data.result_role_id = reviewForm.value.roleId
    }

    reviewSaving.value = true
    try {
        const resp = await request<ApiResponse<null>>({
            url: '/interviewer/result/create',
            method: 'POST',
            data,
        })
        if (resp?.code == 200) {
            setToast('success', '审批已提交', target.name)
            reviewVisible.value = false
            // 刷新列表以显示最新决议
            await loadApplications()
        } else {
            setToast('error', '提交审批失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        reviewSaving.value = false
    }
}

// 图片预览 lightbox
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

        <!-- 处理状态筛选 -->
        <Tabs v-model:value="activeTab" class="status-tabs">
            <TabList>
                <Tab value="unprocessed">未处理</Tab>
                <Tab value="processed">已处理</Tab>
                <Tab value="all">全部</Tab>
            </TabList>
        </Tabs>

        <div v-if="loading" class="empty">
            <i class="pi pi-spin pi-spinner icon"></i>
            <p>正在加载信息......</p>
        </div>

        <div v-else-if="!filteredApplications.length" class="empty">
            <i class="pi pi-times-circle icon"></i>
            <p>暂无符合条件的申请</p>
        </div>

        <template v-else>
            <ApplicationCard
                v-for="a in filteredApplications"
                :key="a.id"
                :application="a"
                review-mode
                @preview="previewAvatar"
                @review="openReview"
            />
        </template>

        <!-- 头像灯箱预览 -->
        <Lightbox v-model="previewVisible" :src="previewUrl" alt="用户头像" />

        <!-- 审批申请 -->
        <Dialog v-model:visible="reviewVisible" modal header="审批申请" :style="{ width: '24rem' }">
            <div class="dialog-fields">
                <div>审批结果</div>
                <Select v-model="reviewForm.decision" :options="decisionOptions" placeholder="请选择审批结果" fluid />
                <template v-if="reviewForm.decision === '已调剂'">
                    <div>部门</div>
                    <Select
                        v-model="reviewForm.deptId"
                        :options="orgStore.departments"
                        option-label="name"
                        option-value="id"
                        placeholder="请选择部门"
                        fluid
                        @update:model-value="onResultDeptChange"
                    />
                    <div>职位</div>
                    <Select
                        v-model="reviewForm.roleId"
                        :options="resultRoles"
                        option-label="name"
                        option-value="id"
                        placeholder="请选择职位"
                        fluid
                        :loading="rolesLoading"
                        :disabled="!reviewForm.deptId"
                    />
                </template>
                <div>备注</div>
                <Textarea v-model="reviewForm.remark" placeholder="请输入审批备注" fluid rows="3" auto-resize />
            </div>
            <template #footer>
                <Button label="取消" severity="secondary" @click="reviewVisible = false" />
                <Button label="提交" :disabled="!reviewCanSave" :loading="reviewSaving" @click="onReviewConfirm" />
            </template>
        </Dialog>
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

.status-tabs {
    margin-bottom: 1.5em;
}

// 审批弹窗表单
.dialog-fields {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
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
