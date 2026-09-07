<!-- 面试官管理页 /apply/interview/staff -->
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { AutoComplete, Button, Column, DataTable, Dialog, Select, Textarea } from 'primevue'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useOrgStore } from '@/stores/org'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

import type { ApiResponse, InterviewStaffItem, TermInfo, UserListData, UserInfo } from '@/types'
import type { AutoCompleteCompleteEvent } from 'primevue/autocomplete'

const orgStore = useOrgStore()

const staff = ref<InterviewStaffItem[]>([])
const staffLoading = ref(false)
let staffRequests = 0

// ================= 活动周期 =================
const terms = ref<TermInfo[]>([])
const filterTermId = ref<number | null>(null)
async function loadTerms() {
    const resp = await request<ApiResponse<TermInfo[]>>({
        url: '/term/list',
        method: 'GET',
    })
    if (resp?.code == 200) {
        terms.value = resp.data ?? []
        // 打开页面时默认选中第一个活动周期
        filterTermId.value = terms.value[0]?.id ?? null
    } else {
        setToast('error', '获取活动周期列表失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

// 加载当前周期的面试官列表
async function loadStaff() {
    if (!filterTermId.value) return

    const seq = ++staffRequests
    staffLoading.value = true
    try {
        const resp = await request<ApiResponse<InterviewStaffItem[]>>({
            url: '/interviewer/list',
            method: 'GET',
            params: { term_id: filterTermId.value },
        })
        if (seq !== staffRequests) return
        if (resp?.code == 200) {
            staff.value = resp.data ?? []
        } else {
            setToast('error', '获取面试官列表失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        if (seq === staffRequests) staffLoading.value = false
    }
}
// 周期变化（含载入后自动选中第一个）时重新拉取列表
watch(filterTermId, loadStaff)

// ================= 人员列表 =================
const users = ref<UserInfo[]>([])
const usersLoading = ref(false)
let userRequests = 0
// 展示学号避免重名
const userOptions = computed(() => users.value.map((u) => ({ id: u.user_id, label: `${u.name} (${u.student_id})` })))
// AutoComplete 的候选人员
const userSuggestions = ref<{ id: number; label: string }[]>([])
function onUserComplete(event: AutoCompleteCompleteEvent) {
    const kw = event.query.trim().toLowerCase()
    userSuggestions.value = kw ? userOptions.value.filter((u) => u.label.toLowerCase().includes(kw)) : userOptions.value
}

// 按部门加载可供选择的人员列表
async function loadUsers() {
    const seq = ++userRequests
    usersLoading.value = true
    try {
        const resp = await request<ApiResponse<UserListData>>({
            url: '/user/list',
            method: 'GET',
            params: dialogFormDeptId.value ? { department_id: dialogFormDeptId.value } : { is_all: true },
        })
        if (seq !== userRequests) return
        if (resp?.code == 200) {
            users.value = resp.data.list
        } else {
            setToast('error', '获取人员列表失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        if (seq === userRequests) usersLoading.value = false
    }
}

// ============ 新建 / 编辑面试官 ============
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const dialogTargetId = ref<number | null>(null)
const dialogFormTermId = ref<number | null>(null)
const dialogFormDeptId = ref<number | null>(null)
const dialogFormUser = ref<{ id: number; label: string } | string | null>(null) // 注：AutoComplete 输入过程中为文本，选中后为人员对象
const dialogFormRemark = ref('')
const dialogFormUserId = computed(() =>
    dialogFormUser.value && typeof dialogFormUser.value === 'object' ? dialogFormUser.value.id : null
)

const editTarget = computed(() => staff.value.find((s) => s.id === dialogTargetId.value))
const dialogCanSave = computed(() => {
    if (dialogMode.value !== 'create') return true
    return dialogFormTermId.value !== null && dialogFormUserId.value !== null && dialogFormRemark.value.trim() !== ''
})

function openCreate() {
    //初始化
    dialogMode.value = 'create'
    dialogTargetId.value = null
    dialogFormTermId.value = filterTermId.value
    dialogFormDeptId.value = null
    dialogFormUser.value = null
    userSuggestions.value = []
    // 未选择状态下，先预载全部人员
    loadUsers()
    dialogFormRemark.value = ''
    dialogVisible.value = true
}
function onDialogDeptChange() {
    dialogFormUser.value = null
    userSuggestions.value = []
    loadUsers()
}
function openEdit(item: InterviewStaffItem) {
    dialogMode.value = 'edit'
    dialogTargetId.value = item.id
    dialogFormRemark.value = item.remark
    dialogVisible.value = true
}
const dialogSaving = ref(false)

async function onDialogConfirm() {
    if (dialogMode.value === 'create') {
        const termId = dialogFormTermId.value
        const userId = dialogFormUserId.value
        if (termId === null || userId === null) return
        const user = users.value.find((u) => u.user_id === userId)
        if (!user) return

        dialogSaving.value = true
        try {
            const resp = await request<ApiResponse<null>>({
                url: '/interviewer/create',
                method: 'POST',
                data: {
                    term_id: termId,
                    interviewers: [{ user_id: userId, remark: dialogFormRemark.value.trim() }],
                },
            })
            if (resp?.code == 200) {
                setToast('success', '添加面试官成功')
                dialogVisible.value = false
                await loadStaff()
            } else {
                setToast('error', '添加面试官失败', resp?.message || '未知错误，请联系负责后端的同学')
            }
        } finally {
            dialogSaving.value = false
        }
        return
    }

    const target = staff.value.find((s) => s.id === dialogTargetId.value)
    if (!target) return

    dialogSaving.value = true
    try {
        const resp = await request<ApiResponse<null>>({
            url: '/interviewer/update',
            method: 'POST',
            data: {
                interviewer_id: target.id,
                remark: dialogFormRemark.value.trim(),
            },
        })
        if (resp?.code == 200) {
            target.remark = dialogFormRemark.value.trim()
            setToast('success', '更新面试官成功')
            dialogVisible.value = false
        } else {
            setToast('error', '更新面试官失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        dialogSaving.value = false
    }
}

// ================= 删除面试官 =================
const deleteVisible = ref(false)
const deleteTarget = ref<InterviewStaffItem | null>(null)

function openDelete(item: InterviewStaffItem) {
    deleteTarget.value = item
    deleteVisible.value = true
}

const deleting = ref(false)
async function onDelete() {
    const target = deleteTarget.value
    if (!target) return

    deleting.value = true
    try {
        const resp = await request<ApiResponse<null>>({
            url: '/interviewer/delete',
            method: 'POST',
            data: { interviewer_id: target.id },
        })
        if (resp?.code == 200) {
            staff.value = staff.value.filter((s) => s.id !== target.id)
            setToast('success', `已移除面试官 ${target.name}`)
            deleteVisible.value = false
        } else {
            setToast('error', '删除面试官失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        deleting.value = false
    }
}

onMounted(() => {
    orgStore.ensureLoaded()
    loadTerms()
})
</script>

<template>
    <main>
        <h1 class="e-title">面试官管理</h1>

        <DataTable :value="staff" :loading="staffLoading" data-key="id" striped-rows paginator :rows="20">
            <template #header>
                <div class="filter-bar">
                    <label for="staff-term-filter">活动周期</label>
                    <Select
                        v-model="filterTermId"
                        input-id="staff-term-filter"
                        :options="terms"
                        option-label="title"
                        option-value="id"
                        placeholder="请选择活动周期"
                    />
                    <Button class="add" icon="pi pi-plus" label="添加面试官" @click="openCreate" />
                </div>
            </template>
            <template #empty>
                <div class="e-table-empty">暂无面试官数据</div>
            </template>
            <Column field="id" header="序号" />
            <Column field="name" header="姓名" />
            <Column field="department_name" header="部门" />
            <Column field="remark" header="简介" />
            <Column header="">
                <template #body="{ data }">
                    <div class="row-actions">
                        <Button
                            icon="pi pi-pencil"
                            severity="secondary"
                            text
                            @click="openEdit(data as InterviewStaffItem)"
                        />
                        <Button
                            icon="pi pi-trash"
                            severity="danger"
                            text
                            @click="openDelete(data as InterviewStaffItem)"
                        />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- 新建 / 编辑面试官 -->
        <Dialog
            v-model:visible="dialogVisible"
            modal
            :header="dialogMode === 'create' ? '新建面试官' : '更新面试官'"
            :style="{ width: '24rem' }"
        >
            <div class="dialog-fields">
                <template v-if="dialogMode === 'create'">
                    <div>周期</div>
                    <Select
                        v-model="dialogFormTermId"
                        :options="terms"
                        option-label="title"
                        option-value="id"
                        placeholder="请选择周期"
                        fluid
                    />
                    <div>部门</div>
                    <Select
                        v-model="dialogFormDeptId"
                        :options="orgStore.departments"
                        option-label="name"
                        option-value="id"
                        placeholder="请选择部门"
                        fluid
                        @update:model-value="onDialogDeptChange"
                    />
                    <div>人员</div>
                    <AutoComplete
                        v-model="dialogFormUser"
                        :suggestions="userSuggestions"
                        option-label="label"
                        placeholder="请输入面试官"
                        force-selection
                        fluid
                        dropdown
                        :loading="usersLoading"
                        @complete="onUserComplete"
                    />
                </template>
                <template v-else>
                    <div>人员</div>
                    <div class="dialog-static">{{ editTarget?.name }}</div>
                </template>
                <div>简介</div>
                <Textarea
                    id="staff-remark"
                    v-model="dialogFormRemark"
                    placeholder="请输入简介"
                    fluid
                    rows="3"
                    auto-resize
                />
            </div>
            <template #footer>
                <Button label="取消" severity="secondary" @click="dialogVisible = false" />
                <Button label="保存" :disabled="!dialogCanSave" :loading="dialogSaving" @click="onDialogConfirm" />
            </template>
        </Dialog>

        <!-- 删除面试官 -->
        <ConfirmDialog v-model="deleteVisible" :loading="deleting" @confirm="onDelete">
            是否移除面试官 <b>{{ deleteTarget?.name }}</b
            >？
        </ConfirmDialog>
    </main>
</template>

<style lang="less" scoped>
.filter-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    label {
        font-size: 14px;
        color: var(--p-text-muted-color);
    }

    .add {
        margin-left: auto;
    }

    .row-actions {
        display: flex;
        gap: 4px;
    }
}

.dialog-fields {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;

    .dialog-static {
        margin: 0;
        line-height: 1.5;
        font-size: 15px;
    }
}
</style>
