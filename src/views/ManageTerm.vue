<!-- 招新/换届周期管理页 /manage/term -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Column, DataTable, DatePicker, Dialog, InputNumber, InputText, Select } from 'primevue'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import request from '@/utils/request'
import setToast from '@/utils/setToast'
import type { ApiResponse } from '@/types/api'
import type { TermCreateData, TermInfo, TermPeriod, TermUpdateData } from '@/types/term'

// 周期类型
const TERM_TYPES = ['招新', '换届'] as const

const terms = ref<TermInfo[]>([])
const loading = ref(true)

// ================= 页面逻辑 =================
// 加载周期列表
async function loadTerms(silent = false) {
    if (!silent) loading.value = true
    const resp = await request<ApiResponse<TermInfo[]>>({
        url: '/term/list',
        method: 'GET',
    })
    if (!silent) loading.value = false

    if (resp?.code == 200) {
        terms.value = resp.data ?? []
    } else {
        setToast('error', '获取活动周期列表失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

// 筛选条件
const filterYear = ref<number | null>(null)
const filterType = ref<string | null>(null)
const filterYears = computed(() => [...new Set(terms.value.map((t) => t.year))].sort((a, b) => b - a))
const filterTypes = computed(() => [...new Set(terms.value.map((t) => t.type))])
const filteredTerms = computed(() =>
    terms.value.filter((t) => {
        if (filterYear.value && t.year !== filterYear.value) return false
        if (filterType.value && t.type !== filterType.value) return false
        return true
    })
)

// 新建 / 编辑对话框
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const dialogTargetId = ref<number | null>(null)
const formYear = ref<number | null>(null)
const formType = ref<string>(TERM_TYPES[0])
const formTitle = ref('')
const formEditStart = ref<Date | null>(null)
const formEditEnd = ref<Date | null>(null)
const formQueryStart = ref<Date | null>(null)
const formQueryEnd = ref<Date | null>(null)
const saving = ref(false)

const dialogTitle = computed(() => `${dialogMode.value === 'create' ? '新建' : '更新'}周期`)
const canSave = computed(() => {
    if (!formTitle.value.trim() || !formYear.value) return false
    if (!formEditStart.value || !formEditEnd.value || !formQueryStart.value || !formQueryEnd.value) return false
    // 注：结束日期不得早于开始日期
    return formEditEnd.value >= formEditStart.value && formQueryEnd.value >= formQueryStart.value
})

function toDate(s: string): Date | null {
    return s ? new Date(`${s}T00:00:00`) : null
}
function fromDate(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
}
// 打开新建周期对话框
function openCreate() {
    dialogMode.value = 'create'
    dialogTargetId.value = null
    formYear.value = new Date().getFullYear()
    formType.value = TERM_TYPES[0]
    formTitle.value = ''
    formEditStart.value = null
    formEditEnd.value = null
    formQueryStart.value = null
    formQueryEnd.value = null
    dialogVisible.value = true
}
// 打开编辑周期对话框
function openEdit(term: TermInfo) {
    dialogMode.value = 'edit'
    dialogTargetId.value = term.id
    formYear.value = term.year
    formType.value = term.type
    formTitle.value = term.title
    formEditStart.value = toDate(term.edit_period.start_at)
    formEditEnd.value = toDate(term.edit_period.end_at)
    formQueryStart.value = toDate(term.query_period.start_at)
    formQueryEnd.value = toDate(term.query_period.end_at)
    dialogVisible.value = true
}

async function onSave() {
    // 校验 term_id
    if (dialogMode.value === 'edit' && !dialogTargetId.value) {
        setToast('error', '保存失败', '缺少周期标识（term_id），请刷新页面后重试')
        return
    }
    if (!dialogTargetId.value && !formYear.value) return
    const editPeriod: TermPeriod = {
        start_at: fromDate(formEditStart.value!),
        end_at: fromDate(formEditEnd.value!),
    }
    const queryPeriod: TermPeriod = {
        start_at: fromDate(formQueryStart.value!),
        end_at: fromDate(formQueryEnd.value!),
    }

    saving.value = true
    const resp =
        dialogMode.value === 'create'
            ? await request<ApiResponse<null>>({
                  url: '/term/create',
                  method: 'POST',
                  data: {
                      year: formYear.value!,
                      type: formType.value,
                      title: formTitle.value.trim(),
                      edit_period: editPeriod,
                      query_period: queryPeriod,
                  } satisfies TermCreateData,
              })
            : await request<ApiResponse<null>>({
                  url: '/term/update',
                  method: 'POST',
                  data: {
                      term_id: dialogTargetId.value!,
                      title: formTitle.value.trim(),
                      edit_period: editPeriod,
                      query_period: queryPeriod,
                  } satisfies TermUpdateData,
              })
    saving.value = false

    if (resp?.code == 200) {
        setToast(
            'success',
            dialogMode.value === 'create' ? '新建' : '更新' + '成功',
            formTitle.value.trim() + '的数据已更新'
        )
        dialogVisible.value = false
        await loadTerms(true)
    } else {
        setToast('error', '保存失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

// 删除周期
const deleteVisible = ref(false)
const deleteTarget = ref<TermInfo | null>(null)
const deleting = ref(false)
function openDelete(term: TermInfo) {
    deleteTarget.value = term
    deleteVisible.value = true
}
async function onDeleteTerm() {
    const target = deleteTarget.value
    if (!target) return

    deleting.value = true
    const resp = await request<ApiResponse<null>>({
        url: '/term/delete',
        method: 'POST',
        data: { term_id: target.id },
    })
    deleting.value = false

    if (resp?.code == 200) {
        setToast('success', '删除成功', `“${target.title}” 已删除`)
        deleteVisible.value = false
        await loadTerms(true)
    } else {
        setToast('error', '删除失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

function formatPeriod(p: TermPeriod) {
    return p.start_at + '~' + p.end_at
}

// 判断现在是否在进行中的活动周期内
const ongoingTerm = computed<TermInfo | null>(() => {
    const term = terms.value[0]
    if (!term) return null
    const today = fromDate(new Date())
    // 进行中条件：当前日期 >= 申请提交期开始 && 当前日期 <= 面试审核期结束
    return today >= term.edit_period.start_at && today <= term.query_period.end_at ? term : null
})

// 获取当前活动阶段
const ongoingPhase = computed(() => {
    const term = ongoingTerm.value
    if (!term) return ''
    const today = fromDate(new Date())
    if (today <= term.edit_period.end_at) return '申请提交期'
    if (today >= term.query_period.start_at) return '面试审核期'
    return '两期之间'
})

onMounted(() => {
    loadTerms()
})
</script>

<template>
    <main>
        <div class="section-header">
            <h1 class="e-title">招新/换届管理</h1>
            <Button icon="pi pi-plus" label="新建活动周期" @click="openCreate" />
        </div>

        <!-- 当前活动卡片 -->
        <div class="ongoing-card" :class="{ active: ongoingTerm }">
            <template v-if="ongoingTerm">
                <div class="head">进行中的活动周期</div>
                <div class="title">
                    <span>{{ ongoingTerm.title }}</span>
                    <span class="tag">{{ ongoingPhase }}</span>
                </div>
                <div class="detail">
                    <div>类型：{{ ongoingTerm.type }} ({{ ongoingTerm.year }})</div>
                    <div>申请提交日期：{{ formatPeriod(ongoingTerm.edit_period) }}</div>
                    <div>面试审核日期：{{ formatPeriod(ongoingTerm.query_period) }}</div>
                </div>
            </template>
            <template v-else>
                <div class="head empty">进行中的活动周期</div>
                <div class="title empty">当前暂无招新 / 换届活动</div>
            </template>
        </div>

        <DataTable :value="filteredTerms" :loading="loading" data-key="id" striped-rows paginator :rows="10">
            <template #header>
                <!-- 筛选栏 -->
                <div class="filter-bar">
                    <Select v-model="filterYear" :options="filterYears" placeholder="全部年份" show-clear />
                    <Select v-model="filterType" :options="filterTypes" placeholder="全部类型" show-clear />
                </div>
            </template>
            <template #empty>
                <div class="e-table-empty">
                    {{ terms.length ? '没有符合条件的活动周期' : '暂无招新 / 换届数据' }}
                </div>
            </template>
            <Column field="title" header="活动周期" />
            <Column header="申请提交日期">
                <template #body="{ data }">
                    {{ formatPeriod(data.edit_period) }}
                </template>
            </Column>
            <Column header="面试审核日期">
                <template #body="{ data }">
                    {{ formatPeriod(data.query_period) }}
                </template>
            </Column>
            <Column header="身份">
                <template #body="{ data }">
                    <span class="status" :class="data.is_executed ? 'active' : 'inactive'">
                        {{ data.is_executed ? '已更新' : '未更新' }}
                    </span>
                </template>
            </Column>
            <Column header="身份更新时间">
                <template #body="{ data }">
                    {{ data.executed_at ?? '—' }}
                </template>
            </Column>
            <Column>
                <template #body="{ data }">
                    <Button icon="pi pi-pencil" severity="secondary" text @click="openEdit(data as TermInfo)" />
                    <Button icon="pi pi-trash" severity="danger" text @click="openDelete(data as TermInfo)" />
                </template>
            </Column>
        </DataTable>

        <!-- 新建 / 编辑周期对话框 -->
        <Dialog v-model:visible="dialogVisible" modal :header="dialogTitle" :style="{ minWidth: '28rem' }">
            <div class="form-grid">
                <div class="form-field">
                    <label>年份</label>
                    <InputNumber v-model="formYear" :disabled="dialogMode === 'edit'" :use-grouping="false" fluid />
                </div>
                <div class="form-field">
                    <label>类型</label>
                    <Select v-model="formType" :options="[...TERM_TYPES]" :disabled="dialogMode === 'edit'" fluid />
                </div>
            </div>
            <div class="form-field">
                <label>标题</label>
                <InputText v-model="formTitle" fluid />
            </div>
            <div class="form-field">
                <label>申请提交日期</label>
                <div class="form-grid">
                    <DatePicker
                        v-model="formEditStart"
                        date-format="yy-mm-dd"
                        showIcon
                        iconDisplay="input"
                        placeholder="开始日期"
                    />
                    <DatePicker
                        v-model="formEditEnd"
                        date-format="yy-mm-dd"
                        showIcon
                        iconDisplay="input"
                        placeholder="结束日期"
                    />
                </div>
            </div>
            <div class="form-field">
                <label>面试审核日期</label>
                <div class="form-grid">
                    <DatePicker
                        v-model="formQueryStart"
                        date-format="yy-mm-dd"
                        showIcon
                        iconDisplay="input"
                        placeholder="开始日期"
                    />
                    <DatePicker
                        v-model="formQueryEnd"
                        date-format="yy-mm-dd"
                        showIcon
                        iconDisplay="input"
                        placeholder="结束日期"
                    />
                </div>
            </div>
            <template #footer>
                <Button label="取消" severity="secondary" text @click="dialogVisible = false" />
                <Button
                    :label="dialogMode === 'create' ? '创建' : '保存'"
                    :disabled="!canSave"
                    :loading="saving"
                    @click="onSave"
                />
            </template>
        </Dialog>

        <!-- 删除周期对话框 -->
        <ConfirmDialog v-model="deleteVisible" :loading="deleting" @confirm="onDeleteTerm">
            是否删除活动周期 <b>{{ deleteTarget?.title }}</b
            >？
        </ConfirmDialog>
    </main>
</template>

<style lang="less" scoped>
// 进行中的活动周期卡片
.ongoing-card {
    margin-bottom: 20px;
    background-color: var(--p-slate-100);
    padding: 14px 20px;
    border-radius: var(--p-button-border-radius);
    line-height: 1.5;

    &.active {
        background-color: var(--p-emerald-50);
    }

    .head {
        color: var(--p-emerald-600);
    }

    .title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 20px;
        font-weight: 600;
        line-height: 2.25;

        .tag {
            display: inline-block;
            line-height: 2;
            font-size: 13px;
            color: #fff;
            background-color: var(--p-emerald-500);
            padding: 0 0.75em;
            border-radius: 14px;
        }
    }

    .detail {
        font-size: 14px;
        line-height: 1.8;
        color: var(--p-text-muted-color);
    }

    .empty {
        color: var(--p-text-muted-color);
    }
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h1 {
        font-size: 24px;
    }
}

.filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
}

// 表单样式
.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.75rem;

    label {
        font-size: 14px;
    }
}

// 对需要两列布局的表单
.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
</style>
