<!-- 招新/换届周期管理页 /manage/term -->
<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { Button, Column, DataTable, DatePicker, Dialog, InputNumber, InputText, Paginator, Select } from 'primevue'

import { createTerm, deleteTerm, updateTerm } from '@/api/term'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import OngoingTermCard from '@/components/OngoingTermCard.vue'
import { useTermStore } from '@/stores/term'
import { toastApiError } from '@/utils/apiError'
import { fromDate, toDate, fromIso } from '@/utils/date'
import setToast from '@/utils/setToast'
import { useMediaQuery } from '@/utils/useMediaQuery'
import type { TermInfo, TermPeriod } from '@/types'

// 周期类型
const TERM_TYPES = ['招新', '换届'] as const

const uid = useId()
const fieldId = (name: string) => `${uid}-${name}`

const termStore = useTermStore()
const terms = computed(() => termStore.terms)
const loading = ref(!termStore.loaded)

// ================= 页面逻辑 =================

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

// 移动端把表格换成卡片列表，单独分页
const isMobile = useMediaQuery('(max-width: 800px)')
const mobileRows = 10
const mobileFirst = ref(0)
const mobileTerms = computed(() => filteredTerms.value.slice(mobileFirst.value, mobileFirst.value + mobileRows))
watch([filterYear, filterType], () => {
    mobileFirst.value = 0
})
watch(filteredTerms, () => {
    if (mobileFirst.value >= filteredTerms.value.length) mobileFirst.value = 0
})

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
        setToast('error', '保存失败', '缺少活动周期标识 term_id，请刷新页面后重试')
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
            ? await createTerm({
                  year: formYear.value!,
                  type: formType.value,
                  title: formTitle.value.trim(),
                  edit_period: editPeriod,
                  query_period: queryPeriod,
              })
            : await updateTerm({
                  term_id: dialogTargetId.value!,
                  title: formTitle.value.trim(),
                  edit_period: editPeriod,
                  query_period: queryPeriod,
              })
    saving.value = false

    if (resp?.code == 200) {
        setToast(
            'success',
            dialogMode.value === 'create' ? '新建' : '更新' + '成功',
            formTitle.value.trim() + '的数据已更新'
        )
        dialogVisible.value = false
        await termStore.refresh()
    } else {
        toastApiError('保存失败', resp)
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
    const resp = await deleteTerm(target.id)
    deleting.value = false

    if (resp?.code == 200) {
        setToast('success', `${target.title}删除成功`)
        deleteVisible.value = false
        await termStore.refresh()
    } else {
        toastApiError('删除失败', resp)
    }
}

function formatPeriod(p: TermPeriod) {
    return p.start_at + ' ~ ' + p.end_at
}

onMounted(async () => {
    try {
        await termStore.ensureLoaded()
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <main>
        <h1 class="e-title">招新/换届管理</h1>

        <!-- 当前活动卡片 -->
        <OngoingTermCard />

        <!-- 移动端筛选栏 -->
        <div v-if="isMobile" class="filter-bar mobile-filter">
            <Select v-model="filterYear" :options="filterYears" placeholder="全部年份" show-clear />
            <Select v-model="filterType" :options="filterTypes" placeholder="全部类型" show-clear />
            <Button icon="pi pi-plus" label="新建活动周期" @click="openCreate" />
        </div>

        <!-- 移动端卡片列表 -->
        <div v-if="isMobile" class="e-mobile-list">
            <div v-if="loading" class="e-table-empty">加载中......</div>
            <template v-else>
                <div v-for="term in mobileTerms" :key="term.id" class="e-mobile-card">
                    <div class="term-head">
                        <div class="title">{{ term.title }}</div>
                        <span class="status" :class="term.is_executed ? 'active' : 'inactive'">
                            {{ term.is_executed ? '已更新' : '未更新' }}
                        </span>
                    </div>
                    <div class="term-sub">{{ term.type }} ({{ term.year }})</div>
                    <div class="term-row">
                        <span class="label">申请提交</span>
                        <span>{{ formatPeriod(term.edit_period) }}</span>
                    </div>
                    <div class="term-row">
                        <span class="label">面试审核</span>
                        <span>{{ formatPeriod(term.query_period) }}</span>
                    </div>
                    <div class="term-row">
                        <span class="label">身份更新</span>
                        <span>{{ fromIso(term.executed_at) || '—' }}</span>
                    </div>
                    <div class="e-mobile-card-actions">
                        <Button icon="pi pi-pencil" label="编辑" severity="secondary" text @click="openEdit(term)" />
                        <Button icon="pi pi-trash" label="删除" severity="danger" text @click="openDelete(term)" />
                    </div>
                </div>
                <div v-if="!filteredTerms.length" class="e-table-empty">
                    {{ terms.length ? '没有符合条件的活动周期' : '暂无招新 / 换届数据' }}
                </div>
            </template>
            <Paginator
                v-if="filteredTerms.length > mobileRows"
                v-model:first="mobileFirst"
                :rows="mobileRows"
                :total-records="filteredTerms.length"
                template="PrevPageLink CurrentPageReport NextPageLink"
                current-page-report-template="{currentPage} / {totalPages}"
                class="pagination"
            />
        </div>

        <!-- PC端表格 -->
        <DataTable v-else :value="filteredTerms" :loading="loading" data-key="id" striped-rows paginator :rows="10">
            <template #header>
                <!-- 筛选栏 -->
                <div class="filter-bar">
                    <Select v-model="filterYear" :options="filterYears" placeholder="全部年份" show-clear />
                    <Select v-model="filterType" :options="filterTypes" placeholder="全部类型" show-clear />
                    <Button icon="pi pi-plus" label="新建活动周期" @click="openCreate" />
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
                    {{ fromIso(data.executed_at) || '—' }}
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
                    <label :for="fieldId('year')">年份</label>
                    <InputNumber
                        v-model="formYear"
                        :input-id="fieldId('year')"
                        :disabled="dialogMode === 'edit'"
                        :use-grouping="false"
                        fluid
                    />
                </div>
                <div class="form-field">
                    <label :for="fieldId('type')">类型</label>
                    <Select
                        v-model="formType"
                        :input-id="fieldId('type')"
                        :options="[...TERM_TYPES]"
                        :disabled="dialogMode === 'edit'"
                        fluid
                    />
                </div>
            </div>
            <div class="form-field">
                <label :for="fieldId('title')">标题</label>
                <InputText v-model="formTitle" :id="fieldId('title')" fluid />
            </div>
            <div class="form-field">
                <span class="group-label">申请提交日期</span>
                <div class="form-grid">
                    <DatePicker
                        v-model="formEditStart"
                        :input-id="fieldId('editStart')"
                        aria-label="申请提交开始日期"
                        date-format="yy-mm-dd"
                        showIcon
                        iconDisplay="input"
                        placeholder="开始日期"
                    />
                    <DatePicker
                        v-model="formEditEnd"
                        :input-id="fieldId('editEnd')"
                        aria-label="申请提交结束日期"
                        date-format="yy-mm-dd"
                        showIcon
                        iconDisplay="input"
                        placeholder="结束日期"
                    />
                </div>
            </div>
            <div class="form-field">
                <span class="group-label">面试审核日期</span>
                <div class="form-grid">
                    <DatePicker
                        v-model="formQueryStart"
                        :input-id="fieldId('queryStart')"
                        aria-label="面试审核开始日期"
                        date-format="yy-mm-dd"
                        showIcon
                        iconDisplay="input"
                        placeholder="开始日期"
                    />
                    <DatePicker
                        v-model="formQueryEnd"
                        :input-id="fieldId('queryEnd')"
                        aria-label="面试审核结束日期"
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
.filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;

    & > :last-child {
        margin-left: auto;
    }
}

// 表单样式
.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.75rem;

    label,
    .group-label {
        font-size: 14px;
    }
}

// 对需要两列布局的表单
.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

@media screen and (max-width: 800px) {
    .filter-bar {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;

        & > :last-child {
            width: 100%;
            margin-left: 0;
            justify-content: center;
        }
    }

    .mobile-filter {
        margin-bottom: 16px;
    }

    // 日期区间在窄屏改为上下排列
    .form-grid {
        grid-template-columns: 1fr;
    }

    :deep(.p-datepicker),
    :deep(.p-datepicker-input),
    :deep(.p-select) {
        width: 100%;
    }

    .term-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;

        .title {
            font-size: 16px;
            font-weight: 600;
            line-height: 1.5;
            word-break: break-word;
        }
    }

    .status {
        flex-shrink: 0;
        font-size: 13px;
        line-height: 1.6;

        &.active {
            color: var(--e-accent-color);
        }

        &.inactive {
            color: var(--p-text-muted-color);
        }
    }

    .term-sub {
        margin-top: 2px;
        font-size: 13px;
        color: var(--p-text-muted-color);
    }

    .term-row {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        font-size: 13px;
        line-height: 1.6;

        .label {
            flex: 0 0 4.5em;
            color: var(--p-text-muted-color);
        }

        span:last-child {
            min-width: 0;
            word-break: break-word;
        }
    }

    .pagination {
        margin-top: 12px;
        justify-content: center;
        flex-wrap: wrap;
    }
}
</style>
