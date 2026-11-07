<!-- OAuth 应用管理页 /manage/app -->
<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import {
    Button,
    Column,
    DataTable,
    Dialog,
    IconField,
    InputIcon,
    InputText,
    Message,
    Select,
    Textarea,
    ToggleSwitch,
} from 'primevue'

import { createApp, deleteApp, getAppDetail, getAppList, updateApp } from '@/api/app'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { toastApiError } from '@/utils/apiError'
import { fromIso } from '@/utils/date'
import setToast from '@/utils/setToast'
import type { AppCreateResult, AppItem } from '@/types'

const uid = useId()
const fieldId = (name: string) => `${uid}-${name}`

// 应用列表
const apps = ref<AppItem[]>([])
const loading = ref(true)
// 请求序号，避免旧响应覆盖新列表
let listRequests = 0
async function loadApps() {
    const seq = ++listRequests
    loading.value = true
    try {
        const resp = await getAppList()
        if (seq !== listRequests) return
        if (resp?.code == 200) {
            apps.value = resp.data ?? []
        } else {
            toastApiError('获取应用列表失败', resp)
        }
    } finally {
        if (seq === listRequests) loading.value = false
    }
}

// 关键字 / 状态筛选
const keyword = ref('')
const activeFilter = ref<boolean | null>(null)
const statusOptions = [
    { label: '启用', value: true },
    { label: '停用', value: false },
]
const filteredApps = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    return apps.value.filter((app) => {
        if (activeFilter.value !== null && app.is_active !== activeFilter.value) return false
        if (!kw) return true
        return [app.client_id, app.name, app.redirect_uris, app.scope].some((value) => value.toLowerCase().includes(kw))
    })
})

// ======= 新建 / 编辑应用 BEGIN =======
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editTarget = ref<AppItem | null>(null)
const formClientId = ref('')
const formName = ref('')
const formRedirectUris = ref('')
const formScope = ref('')
const formActive = ref(true)
const saving = ref(false)

const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新建应用' : '编辑应用'))
// client_id
const clientIdError = computed(() => {
    const value = formClientId.value.trim()
    if (!value) return ''
    return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) ? '' : '只能使用字母、数字、点、下划线和短横线'
})
// 允许空格 / 换行分隔多个回调地址，每个地址都必须是绝对地址
const redirectUrisError = computed(() => {
    const value = formRedirectUris.value.trim()
    if (!value) return ''
    for (const uri of value.split(/\s+/)) {
        try {
            new URL(uri)
        } catch {
            return `${uri} 不是有效的绝对地址`
        }
    }
    return ''
})
const canSave = computed(() => {
    if (!formName.value.trim() || !formRedirectUris.value.trim() || redirectUrisError.value) return false
    if (dialogMode.value === 'create' && (!formClientId.value.trim() || clientIdError.value)) return false
    return true
})

// 多个地址 / 权限用空格分隔，提交前统一压缩空白
function normalizeSpace(value: string): string {
    return value.trim().split(/\s+/).filter(Boolean).join(' ')
}

function openCreate() {
    dialogMode.value = 'create'
    editTarget.value = null
    formClientId.value = ''
    formName.value = ''
    formRedirectUris.value = ''
    formScope.value = ''
    formActive.value = true
    dialogVisible.value = true
}

function openEdit(app: AppItem) {
    dialogMode.value = 'edit'
    editTarget.value = app
    formClientId.value = app.client_id
    formName.value = app.name
    formRedirectUris.value = app.redirect_uris
    formScope.value = app.scope
    formActive.value = app.is_active
    dialogVisible.value = true
}

async function onCreate() {
    if (!canSave.value || saving.value) return
    const name = formName.value.trim()
    const clientId = formClientId.value.trim()

    saving.value = true
    const resp = await createApp({
        client_id: clientId,
        name,
        redirect_uris: normalizeSpace(formRedirectUris.value),
        scope: normalizeSpace(formScope.value),
    })
    saving.value = false

    if (resp?.code == 200) {
        dialogVisible.value = false
        if (resp.data?.client_secret) {
            secretTarget.value = resp.data
            secretVisible.value = true
        }
        setToast('success', '应用已创建', `${name} 已创建，请及时保存 client_secret`)
        await loadApps()
    } else {
        toastApiError('创建应用失败', resp)
    }
}

async function onUpdate() {
    const target = editTarget.value
    if (!target || !canSave.value || saving.value) return
    const name = formName.value.trim()

    saving.value = true
    const resp = await updateApp({
        client_id: target.client_id,
        name,
        redirect_uris: normalizeSpace(formRedirectUris.value),
        scope: normalizeSpace(formScope.value),
        is_active: formActive.value,
    })
    saving.value = false

    if (resp?.code == 200) {
        dialogVisible.value = false
        setToast('success', '应用已更新', `${name} 的资料已更新`)
        await loadApps()
    } else {
        toastApiError('更新应用失败', resp)
    }
}

function onSave() {
    void (dialogMode.value === 'create' ? onCreate() : onUpdate())
}
// ======= 新建 / 编辑应用 END =======

// 应用创建成功
const secretVisible = ref(false)
const secretTarget = ref<AppCreateResult | null>(null)
watch(secretVisible, (visible) => {
    // 关闭后立即从内存里清掉明文 secret
    if (!visible) secretTarget.value = null
})
async function copyText(text: string, label: string) {
    try {
        await navigator.clipboard.writeText(text)
        setToast('success', `${label}已复制`)
    } catch {
        setToast('error', '复制失败', '请手动选中文本复制')
    }
}
function copySecret() {
    if (secretTarget.value) void copyText(secretTarget.value.client_secret, 'client_secret')
}
function closeSecret() {
    secretVisible.value = false
}

// 应用详情
const detailVisible = ref(false)
const detailTarget = ref<AppItem | null>(null)
let detailRequests = 0
async function openDetail(app: AppItem) {
    const seq = ++detailRequests
    // 先用列表里的数据即时展示，再拉取详情校准
    detailTarget.value = app
    detailVisible.value = true

    const resp = await getAppDetail(app.client_id)
    if (seq !== detailRequests || !detailVisible.value) return
    if (resp?.code == 200) {
        detailTarget.value = resp.data
    } else {
        toastApiError('获取应用详情失败', resp)
    }
}
function copyClientId() {
    if (detailTarget.value) void copyText(detailTarget.value.client_id, 'client_id')
}
function editFromDetail() {
    if (!detailTarget.value) return
    const target = detailTarget.value
    detailVisible.value = false
    openEdit(target)
}

// 删除应用
const deleteVisible = ref(false)
const deleteTarget = ref<AppItem | null>(null)
const deleting = ref(false)
function openDelete(app: AppItem) {
    deleteTarget.value = app
    deleteVisible.value = true
}
async function onDelete() {
    const target = deleteTarget.value
    if (!target || deleting.value) return

    deleting.value = true
    const resp = await deleteApp(target.client_id)
    deleting.value = false

    if (resp?.code == 200) {
        deleteVisible.value = false
        setToast('success', '应用删除成功', `应用 ${target.name}（${target.client_id}）已删除`)
        await loadApps()
    } else {
        toastApiError('删除应用失败', resp)
    }
}

onMounted(loadApps)
</script>

<template>
    <main>
        <h1 class="e-title">应用管理</h1>

        <DataTable :value="filteredApps" :loading="loading" data-key="client_id" striped-rows>
            <template #header>
                <div class="filter-bar">
                    <IconField class="search">
                        <InputIcon class="pi pi-search" />
                        <InputText v-model="keyword" aria-label="搜索应用" placeholder="搜索应用名称 / ID" fluid />
                    </IconField>
                    <Select
                        v-model="activeFilter"
                        :options="statusOptions"
                        option-label="label"
                        option-value="value"
                        aria-label="按状态筛选"
                        placeholder="全部状态"
                        show-clear
                    />
                    <Button icon="pi pi-plus" label="新建应用" @click="openCreate" />
                </div>
            </template>
            <template #empty>
                <div class="e-table-empty">
                    {{ apps.length ? '没有符合条件的应用' : '暂无应用' }}
                </div>
            </template>
            <Column header="应用">
                <template #body="{ data }">
                    <button type="button" class="app-name" @click="openDetail(data as AppItem)">
                        {{ data.name }}
                    </button>
                </template>
            </Column>
            <Column header="应用 ID">
                <template #body="{ data }">
                    <code class="app-id">{{ data.client_id || '—' }}</code>
                </template>
            </Column>
            <Column header="授权范围">
                <template #body="{ data }">
                    <code class="scope-cell">{{ data.scope || '—' }}</code>
                </template>
            </Column>
            <Column header="状态">
                <template #body="{ data }">
                    <span class="status" :class="data.is_active ? 'active' : 'inactive'">
                        <span class="dot"></span>{{ data.is_active ? '启用' : '停用' }}
                    </span>
                </template>
            </Column>
            <Column header="更新时间">
                <template #body="{ data }">
                    {{ fromIso(data.updated_at) || '—' }}
                </template>
            </Column>
            <Column header="操作">
                <template #body="{ data }">
                    <Button
                        icon="pi pi-eye"
                        severity="secondary"
                        text
                        aria-label="查看详情"
                        v-tooltip.top="'查看详情'"
                        @click="openDetail(data as AppItem)"
                    />
                    <Button
                        icon="pi pi-pencil"
                        severity="secondary"
                        text
                        aria-label="编辑应用"
                        v-tooltip.top="'编辑'"
                        @click="openEdit(data as AppItem)"
                    />
                    <Button
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        aria-label="删除应用"
                        v-tooltip.top="'删除'"
                        @click="openDelete(data as AppItem)"
                    />
                </template>
            </Column>
        </DataTable>

        <!-- 新建 / 编辑应用弹窗 -->
        <Dialog
            v-model:visible="dialogVisible"
            modal
            :header="dialogTitle"
            :style="{ width: '34rem', maxWidth: 'calc(100vw - 2rem)' }"
        >
            <div class="form-field">
                <label :for="fieldId('clientId')">应用 ID</label>
                <InputText
                    v-model="formClientId"
                    :id="fieldId('clientId')"
                    :disabled="dialogMode === 'edit'"
                    :aria-invalid="clientIdError ? 'true' : undefined"
                    :aria-describedby="clientIdError ? fieldId('clientId-error') : fieldId('clientId-hint')"
                    fluid
                />
                <small v-if="clientIdError" :id="fieldId('clientId-error')" class="error">
                    {{ clientIdError }}
                </small>
                <small v-else-if="dialogMode === 'create'" :id="fieldId('clientId-hint')" class="hint">
                    client_id 需全局唯一，创建后不可修改
                </small>
            </div>
            <div class="form-field">
                <label :for="fieldId('name')">应用名称</label>
                <InputText v-model="formName" :id="fieldId('name')" fluid />
            </div>
            <div class="form-field">
                <label :for="fieldId('redirectUris')">回调地址</label>
                <Textarea
                    v-model="formRedirectUris"
                    :id="fieldId('redirectUris')"
                    rows="3"
                    auto-resize
                    fluid
                    :aria-invalid="redirectUrisError ? 'true' : undefined"
                    :aria-describedby="redirectUrisError ? fieldId('redirectUris-error') : fieldId('redirectUris-hint')"
                />
                <small v-if="redirectUrisError" :id="fieldId('redirectUris-error')" class="error">
                    {{ redirectUrisError }}
                </small>
                <small v-else :id="fieldId('redirectUris-hint')" class="hint">若有多个地址请换行分隔</small>
            </div>
            <div class="form-field">
                <label :for="fieldId('scope')">授权范围</label>
                <InputText
                    v-model="formScope"
                    :id="fieldId('scope')"
                    :aria-describedby="fieldId('scope-hint')"
                    placeholder="openid profile email"
                    fluid
                />
                <small :id="fieldId('scope-hint')" class="hint">请使用空格分隔，若留空则使用默认范围</small>
            </div>
            <div v-if="dialogMode === 'edit'" class="form-field switch">
                <label :for="fieldId('active')">启用</label>
                <ToggleSwitch v-model="formActive" :input-id="fieldId('active')" />
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

        <!-- 创建成功弹窗 -->
        <Dialog
            v-model:visible="secretVisible"
            modal
            header="应用创建成功"
            :closable="false"
            :close-on-escape="false"
            :dismissable-mask="false"
            :style="{ width: '36rem', maxWidth: 'calc(100vw - 2rem)' }"
        >
            <div class="secret-content">
                <Message severity="warn" variant="simple">
                    client_secret 密钥仅在创建时显示一次，关闭后将无法再次查看，请复制并妥善保存。
                </Message>
                <div class="field">
                    <div class="label">应用</div>
                    <div class="value">{{ secretTarget?.name }}</div>
                </div>
                <div class="field">
                    <div class="label">应用 ID</div>
                    <div class="value">{{ secretTarget?.client_id }}</div>
                </div>
                <div class="field column">
                    <div class="label">client_secret</div>
                    <div class="box">
                        <code>{{ secretTarget?.client_secret }}</code>
                        <Button icon="pi pi-copy" label="复制" size="small" @click="copySecret" />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="我已保存，关闭" @click="closeSecret" />
            </template>
        </Dialog>

        <!-- 应用详情 -->
        <Dialog
            v-model:visible="detailVisible"
            modal
            header="应用详情"
            :style="{ width: '36rem', maxWidth: 'calc(100vw - 2rem)' }"
        >
            <div class="detail-list">
                <div class="item">
                    <div>应用名称</div>
                    <div>{{ detailTarget?.name }}</div>
                </div>
                <div class="item">
                    <div>应用 ID</div>
                    <div class="with-action">
                        <code>{{ detailTarget?.client_id }}</code>
                        <Button
                            icon="pi pi-copy"
                            severity="secondary"
                            text
                            size="small"
                            aria-label="复制 client_id"
                            @click="copyClientId"
                        />
                    </div>
                </div>
                <div class="item">
                    <div>client_secret</div>
                    <div>
                        <code>{{ detailTarget?.mask_secret }}</code>
                    </div>
                </div>
                <div class="item">
                    <div>回调地址</div>
                    <div class="break">{{ detailTarget?.redirect_uris || '—' }}</div>
                </div>
                <div class="item">
                    <div>授权范围</div>
                    <div>
                        <code>{{ detailTarget?.scope || '—' }}</code>
                    </div>
                </div>
                <div class="item">
                    <div>状态</div>
                    <div>
                        <span class="status" :class="detailTarget?.is_active ? 'active' : 'inactive'">
                            <span class="dot"></span>{{ detailTarget?.is_active ? '启用' : '停用' }}
                        </span>
                    </div>
                </div>
                <div class="item">
                    <div>创建时间</div>
                    <div>{{ fromIso(detailTarget?.created_at) || '—' }}</div>
                </div>
                <div class="item">
                    <div>更新时间</div>
                    <div>{{ fromIso(detailTarget?.updated_at) || '—' }}</div>
                </div>
            </div>
            <template #footer>
                <Button label="关闭" severity="secondary" text @click="detailVisible = false" />
                <Button label="编辑" icon="pi pi-pencil" @click="editFromDetail" />
            </template>
        </Dialog>

        <!-- 删除应用二次确认 -->
        <ConfirmDialog v-model="deleteVisible" :loading="deleting" @confirm="onDelete">
            是否删除应用 <b>{{ deleteTarget?.name }}</b
            >（{{ deleteTarget?.client_id }}）？
        </ConfirmDialog>
    </main>
</template>

<style lang="less" scoped>
// 搜索栏
.filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;

    .search {
        flex: 1;
        min-width: 14rem;
    }
}

.app-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: flex-start;
}

.app-name {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-weight: 600;
    color: var(--e-text-color);
    text-align: left;
    cursor: pointer;

    &:hover {
        color: var(--e-accent-color);
    }

    &:focus-visible {
        outline: 2px solid var(--e-accent-color);
        outline-offset: 2px;
        border-radius: 4px;
    }
}

// 应用状态指示
.status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    &.active .dot {
        background-color: var(--p-emerald-500);
    }

    &.inactive .dot {
        background-color: var(--p-gray-400);
    }
}

// 新建 / 编辑应用表单
.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.9rem;

    label {
        font-size: 14px;
    }

    .hint {
        font-size: 12px;
        color: var(--p-text-muted-color);
    }

    .error {
        font-size: 12px;
        color: var(--e-danger-color);
    }
}

// 应用详情弹窗
.detail-list {
    margin: 0;
    font-size: 15px;

    .item {
        display: grid;
        grid-template-columns: 7.5em 1fr;
        gap: 12px;
        padding: 9px 0;
        border-bottom: 1px solid var(--e-border-subtle);

        &:last-child {
            border-bottom: 0;
        }

        div:first-child {
            color: var(--p-text-muted-color);
        }

        // 有复制按钮的项目
        .with-action {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 2px;
        }
    }
}

.muted {
    margin-left: 4px;
    font-size: 12px;
    color: var(--p-text-muted-color);
}

code {
    font-size: 13px;
    word-break: break-all;
}

.break {
    word-break: break-all;
}

// 创建成功弹窗
.secret-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .field {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 4px;

        &.column {
            // 最后一行显示密钥需要分两行
            flex-direction: column;
            align-items: flex-start;

            .box {
                display: flex;
                width: 100%;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                border-radius: var(--e-border-radius);
                background-color: var(--e-surface-subtle);

                code {
                    font-size: 14px;
                    flex: 1;
                    min-width: 0;
                    word-break: break-all;
                }
            }
        }
    }

    .label {
        width: 4em;
        font-size: 14.5px;
        color: var(--p-text-muted-color);
    }

    .value {
        font-size: 16px;
    }
}
</style>
