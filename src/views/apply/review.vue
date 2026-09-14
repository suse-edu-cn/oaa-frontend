<!-- 申请表审核页 /apply/review -->
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'

import { Button, Column, DataTable, Dialog, Select, Tab, TabList, Tabs, Tag, Textarea } from 'primevue'

import ApplicationCard from '@/components/ApplicationCard.vue'
import Lightbox from '@/components/ImageLightbox.vue'
import { useOrgStore } from '@/stores/org'
import { fromIso } from '@/utils/date'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

import type { ApiResponse, ApplicationItem, InterviewResultItem, RoleItem, TermInfo } from '@/types'

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

// ================= 列表切换 =================
// 已审核展示审核记录，全部申请展示申请卡片
const activeTab = ref('reviewed')

// ================= 审核记录 =================
const results = ref<InterviewResultItem[]>([])
const resultsLoading = ref(false)
// 请求序号，快速切换周期时丢弃旧响应
let resultRequests = 0
async function loadResults() {
    if (!termId.value) return

    const seq = ++resultRequests
    resultsLoading.value = true
    try {
        const resp = await request<ApiResponse<InterviewResultItem[]>>({
            url: '/interviewer/result/list',
            method: 'GET',
            params: { term_id: termId.value },
        })
        if (seq !== resultRequests) return
        if (resp?.code == 200) {
            results.value = resp.data ?? []
        } else {
            setToast('error', '获取审核记录失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        if (seq === resultRequests) resultsLoading.value = false
    }
}
// 处于已审核 Tab 时，周期变化或切回该 Tab 都重新拉取
watch([termId, activeTab], () => {
    if (activeTab.value === 'reviewed') loadResults()
})

// ================= 审核 =================
const decisionOptions = ['录取第一志愿', '录取第二志愿', '已调剂', '未通过', '待定']

const reviewVisible = ref(false)
const dialogType = ref<'create' | 'edit'>('create')
const reviewTarget = ref<ApplicationItem | null>(null)
const editTarget = ref<InterviewResultItem | null>(null)
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

function onResultDeptChange() {
    reviewForm.value.roleId = null
    if (reviewForm.value.deptId) loadResultRoles(reviewForm.value.deptId)
    else resultRoles.value = []
}
function openReview(a: ApplicationItem) {
    dialogType.value = 'create'
    reviewTarget.value = a
    editTarget.value = null
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

function openResultEdit(r: InterviewResultItem) {
    dialogType.value = 'edit'
    reviewTarget.value = null
    editTarget.value = r
    reviewForm.value = {
        decision: r.decision || '',
        deptId: r.result_department_id || null,
        roleId: r.result_role_id || null,
        remark: r.remark || '',
    }
    resultRoles.value = []
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
    const decision = reviewForm.value.decision
    if (!decision) return

    // create 直接用申请；edit 记录里只有 application_id，需回申请列表反查
    const isEdit = dialogType.value === 'edit'
    const appId = isEdit ? editTarget.value?.application_id : reviewTarget.value?.id
    if (!appId) return
    const app = isEdit ? applications.value.find((a) => a.id === appId) : reviewTarget.value

    const data: Record<string, unknown> = {
        application_id: appId,
        decision,
        remark: reviewForm.value.remark.trim(),
    }
    // 录取按对应志愿的部门 / 职位提交，已调剂按表单选择提交
    if (decision === '已调剂') {
        data.result_department_id = reviewForm.value.deptId
        data.result_role_id = reviewForm.value.roleId
    } else if (decision === '录取第一志愿' || decision === '录取第二志愿') {
        // 申请不在列表（如被部门过滤）时，录取志愿沿用记录中已存的结果
        const choice = decision === '录取第一志愿' ? app?.first_choice : app?.second_choice
        data.result_department_id = choice?.department_id ?? editTarget.value?.result_department_id
        data.result_role_id = choice?.role_id ?? editTarget.value?.result_role_id
    }

    reviewSaving.value = true
    try {
        const resp = await request<ApiResponse<null>>({
            url: isEdit ? '/interviewer/result/update' : '/interviewer/result/create',
            method: 'POST',
            data,
        })
        if (resp?.code == 200) {
            setToast('success', isEdit ? '审核已更新' : '审核已提交')
            reviewVisible.value = false
            // 刷新申请列表与审核记录
            await loadApplications()
            loadResults()
        } else {
            setToast(
                'error',
                isEdit ? '更新审核失败' : '提交审核失败',
                resp?.message || '未知错误，请联系负责后端的同学'
            )
        }
    } finally {
        reviewSaving.value = false
    }
}

// ================= 展示辅助 =================
// 结果部门 / 职位 id 反查名称
function resultOrgText(departmentId?: number, roleId?: number) {
    if (!departmentId && !roleId) return '—'
    const dept = orgStore.departments.find((d) => d.id === departmentId)?.name
    const role = orgStore.roles.find((r) => r.id === roleId)?.name
    return (
        [dept ?? (departmentId ? `部门 #${departmentId}` : ''), role ?? (roleId ? `职位 #${roleId}` : '')]
            .filter(Boolean)
            .join(' ') || '—'
    )
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

        <Tabs v-model:value="activeTab" class="status-tabs">
            <TabList>
                <Tab value="all">
                    全部申请
                    <Tag :value="applications.length" class="tab-count" severity="secondary" />
                </Tab>
                <Tab value="reviewed">
                    已审核
                    <Tag :value="results.length" class="tab-count" severity="secondary" />
                </Tab>
            </TabList>
        </Tabs>

        <!-- 已审核 -->
        <DataTable
            v-if="activeTab === 'reviewed'"
            :value="results"
            :loading="resultsLoading"
            data-key="id"
            striped-rows
            paginator
            :rows="20"
        >
            <template #empty>
                <div class="e-table-empty">暂无审核记录</div>
            </template>
            <Column field="name" header="姓名" />
            <Column field="decision" header="结果" />
            <Column header="录取情况">
                <template #body="{ data }">
                    {{
                        resultOrgText(
                            (data as InterviewResultItem).result_department_id,
                            (data as InterviewResultItem).result_role_id
                        )
                    }}
                </template>
            </Column>
            <Column field="operator_name" header="审核员" />
            <Column header="审核时间">
                <template #body="{ data }">
                    {{ fromIso((data as InterviewResultItem).created_at) }}
                </template>
            </Column>
            <Column field="remark" header="备注">
                <template #body="{ data }">
                    {{ data.remark || '—' }}
                </template>
            </Column>
            <Column header="">
                <template #body="{ data }">
                    <Button
                        icon="pi pi-pencil"
                        severity="secondary"
                        text
                        @click="openResultEdit(data as InterviewResultItem)"
                    />
                </template>
            </Column>
        </DataTable>

        <!-- 全部申请 -->
        <template v-else>
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
                    @review="openReview"
                />
            </template>
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
</style>
