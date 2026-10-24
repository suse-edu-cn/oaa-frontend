<!-- 申请表审核页 /apply/review -->
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'

import { Button, Dialog, Select, Skeleton, Tab, TabList, Tabs, Tag, Textarea } from 'primevue'

import { getApplicationList, getRolesByDepartment } from '@/api/application'
import { createInterviewResult, updateInterviewResult } from '@/api/interview'
import ApplicationCard from '@/components/ApplicationCard.vue'
import Lightbox from '@/components/ImageLightbox.vue'
import { useOrgStore } from '@/stores/org'
import { useTermStore } from '@/stores/term'
import { toastApiError } from '@/utils/apiError'
import setToast from '@/utils/setToast'

import type { ApplicationItem, ApplicationListParams, ApiResult, InterviewResultSubmitData, RoleItem } from '@/types'

const orgStore = useOrgStore()
const termStore = useTermStore()

// ================= 周期 =================
const terms = computed(() => termStore.terms)
const termId = ref<number | null>(null)
const termsLoading = ref(!termStore.loaded)

// ================ 申请列表 ================
const tabs = [
    { value: 'all', label: '全部申请' },
    { value: 'unreviewed', label: '未审核' },
    { value: 'reviewed', label: '已审核' },
] as const
type TabValue = (typeof tabs)[number]['value']

const activeTab = ref<TabValue>('all')
const lists = ref<Record<TabValue, ApplicationItem[]>>({ all: [], unreviewed: [], reviewed: [] })
const loading = ref(true)
// 请求序号，快速切换过滤项时丢弃旧响应
let listRequests = 0

const deptId = ref<number | null>(null)
// 周期未就绪时也算加载中，避免先闪空状态
const applicationsLoading = computed(() => termsLoading.value || loading.value)

function applyList(target: TabValue, resp: ApiResult<ApplicationItem[]> | undefined) {
    if (resp?.code == 200) lists.value[target] = resp.data ?? []
}

async function loadApplications() {
    if (!termId.value) return

    const params: ApplicationListParams = { term_id: termId.value }
    if (deptId.value) params.department_id = deptId.value

    const seq = ++listRequests
    loading.value = true
    try {
        const [all, unreviewed, reviewed] = await Promise.all([
            getApplicationList(params),
            getApplicationList({ ...params, has_result: false }),
            getApplicationList({ ...params, has_result: true }),
        ])
        if (seq !== listRequests) return

        applyList('all', all)
        applyList('unreviewed', unreviewed)
        applyList('reviewed', reviewed)
        const failed = [all, unreviewed, reviewed].find((resp) => resp?.code != 200)
        if (failed) toastApiError('获取申请列表失败', failed)
    } finally {
        if (seq === listRequests) loading.value = false
    }
}
watch([termId, deptId], loadApplications)

// ================= 审核 =================
const decisionOptions = ['录取第一志愿', '录取第二志愿', '已调剂', '未通过', '待定']

const reviewVisible = ref(false)
const dialogType = ref<'create' | 'edit'>('create')
const reviewTarget = ref<ApplicationItem | null>(null)
const dialogTitle = computed(() => (dialogType.value === 'create' ? '审核申请' : '修改审核'))
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
        const resp = await getRolesByDepartment(departmentId)
        if (seq !== resultRoleRequests) return
        if (resp?.code == 200) {
            resultRoles.value = resp.data ?? []
        } else {
            toastApiError('获取职位列表失败', resp)
        }
    } finally {
        if (seq === resultRoleRequests) rolesLoading.value = false
    }
}

function onResultDeptChange() {
    reviewForm.value.roleId = null
    if (reviewForm.value.deptId) loadResultRoles(reviewForm.value.deptId)
    else resultRoles.value = []
}

function isReviewed(a: ApplicationItem) {
    return activeTab.value === 'reviewed' || Boolean(a.operator_user_id) || Boolean(a.decision && a.decision !== '待定')
}

function openReview(a: ApplicationItem) {
    dialogType.value = isReviewed(a) ? 'edit' : 'create'
    reviewTarget.value = a
    reviewForm.value = {
        decision: a.decision || '',
        deptId: a.result?.department_id || null,
        roleId: a.result?.role_id || null,
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
    const app = reviewTarget.value
    const decision = reviewForm.value.decision
    if (!app || !decision) return

    const isEdit = dialogType.value === 'edit'
    const data: InterviewResultSubmitData = {
        application_id: app.id,
        decision,
        remark: reviewForm.value.remark.trim(),
    }
    // 录取按对应志愿的部门 / 职位提交，已调剂按表单选择提交
    if (decision === '已调剂') {
        data.result_department_id = reviewForm.value.deptId
        data.result_role_id = reviewForm.value.roleId
    } else if (decision === '录取第一志愿' || decision === '录取第二志愿') {
        const choice = decision === '录取第一志愿' ? app.first_choice : app.second_choice
        data.result_department_id = choice?.department_id ?? app.result?.department_id
        data.result_role_id = choice?.role_id ?? app.result?.role_id
    }

    reviewSaving.value = true
    try {
        const resp = isEdit ? await updateInterviewResult(data) : await createInterviewResult(data)
        if (resp?.code == 200) {
            setToast('success', isEdit ? '审核已更新' : '审核已提交')
            reviewVisible.value = false
            // 三个 Tab 一起刷新，保证审核结果在各 Tab 间一致
            await loadApplications()
        } else {
            toastApiError(isEdit ? '更新审核失败' : '提交审核失败', resp)
        }
    } finally {
        reviewSaving.value = false
    }
}

// ================= 展示辅助 =================
// 图片预览 lightbox
const previewVisible = ref(false)
const previewUrl = ref('')
function previewAvatar(url: string) {
    previewUrl.value = url
    previewVisible.value = true
}

onMounted(async () => {
    // 用于把志愿里的部门 / 职位 id 显示为名称
    orgStore.ensureLoaded()
    try {
        // 打开页面时默认选中第一个活动周期，由 watch 触发申请列表加载
        await termStore.ensureLoaded()
        termId.value = termStore.terms[0]?.id ?? null
    } finally {
        termsLoading.value = false
    }
    if (!termId.value) {
        loading.value = false
    }
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
                :loading="termsLoading"
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

        <Tabs v-model:value="activeTab" class="status-tabs">
            <TabList>
                <Tab v-for="tab in tabs" :key="tab.value" :value="tab.value">
                    {{ tab.label }}
                    <Tag :value="lists[tab.value].length" class="tab-count" severity="secondary" />
                </Tab>
            </TabList>
        </Tabs>

        <!-- 加载中骨架屏，结构与申请卡片一致 -->
        <div v-if="applicationsLoading" class="skeleton-list">
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

        <div v-else-if="!lists[activeTab].length" class="empty">
            <i class="pi pi-times-circle icon"></i>
            <p>暂无符合条件的申请</p>
        </div>

        <template v-else>
            <ApplicationCard
                v-for="a in lists[activeTab]"
                :key="a.id"
                :application="a"
                review-mode
                @preview="previewAvatar"
                @review="openReview"
            />
        </template>

        <!-- 头像灯箱预览 -->
        <Lightbox v-model="previewVisible" :src="previewUrl" alt="用户头像" />

        <!-- 审核申请 -->
        <Dialog v-model:visible="reviewVisible" modal :header="dialogTitle" :style="{ width: '24rem' }">
            <div class="dialog-fields">
                <div>审核结果</div>
                <Select v-model="reviewForm.decision" :options="decisionOptions" placeholder="请选择审核结果" fluid />
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
                <Textarea v-model="reviewForm.remark" placeholder="请输入审核备注" fluid rows="3" auto-resize />
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

    .tab-count {
        margin-left: 6px;
    }
}

.dialog-fields {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
}

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
