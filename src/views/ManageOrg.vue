<!-- 组织管理页 /manage/org -->
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { Button, Column, DataTable, Dialog, InputNumber, InputText, ToggleSwitch } from 'primevue'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useOrgStore } from '@/stores/org'
import request from '@/utils/request'
import setToast from '@/utils/setToast'
import type { ApiResponse } from '@/types/api'
import type { DepartmentItem } from '@/types/department'
import type { RoleItem } from '@/types/role'

const orgStore = useOrgStore()

/** =========== 部门管理 BEGIN =========== */
const deptDialogVisible = ref(false)
const deptDialogMode = ref<'create' | 'edit'>('create')
const deptTargetId = ref<number | null>(null)
const deptFormName = ref('')
const deptFormActive = ref(true)
// 停用二次确认
const confirmDeptVisible = ref(false)
const deptSaving = ref(false)

const deptDialogTitle = computed(() => `${deptDialogMode.value === 'create' ? '新建' : '更新'}部门`)
const deptCanSave = computed(() => deptFormName.value.trim() !== '')

function openDeptCreate() {
    deptDialogMode.value = 'create'
    deptTargetId.value = null
    deptFormName.value = ''
    deptFormActive.value = true
    deptDialogVisible.value = true
}

function openDeptEdit(item: DepartmentItem) {
    deptDialogMode.value = 'edit'
    deptTargetId.value = item.id
    deptFormName.value = item.name
    deptFormActive.value = item.is_active
    deptDialogVisible.value = true
}

// 编辑已有部门时，关闭启用开关时需二次确认
function onDeptActiveChange(value: boolean) {
    if (deptDialogMode.value === 'edit' && !value) {
        // 先回弹为开启，确认停用后才真正关闭
        deptFormActive.value = true
        confirmDeptVisible.value = true
    }
}
// 确认停用部门
function confirmDept() {
    deptFormActive.value = false
    confirmDeptVisible.value = false
}

async function onDeptConfirm() {
    const name = deptFormName.value.trim()
    if (!name) return
    // 不允许重名
    if (orgStore.departments.some((i) => i.name === name && i.id !== deptTargetId.value)) {
        setToast('error', `${deptDialogTitle.value}失败`, `名称「${name}」已存在`)
        return
    }

    deptSaving.value = true
    const resp = await request<ApiResponse<null>>({
        url: deptDialogMode.value === 'create' ? '/department/create' : '/department/update',
        method: 'POST',
        data:
            deptDialogMode.value === 'create'
                ? { name, type: '部门' }
                : { department_id: deptTargetId.value, name, type: '部门', is_active: deptFormActive.value },
    })
    deptSaving.value = false

    if (resp?.code == 200) {
        setToast('success', deptDialogMode.value === 'create' ? '部门已新建' : '部门已更新', name)
        deptDialogVisible.value = false
        // 刷新 org 缓存
        await orgStore.refresh()
    } else {
        setToast('error', `${deptDialogTitle.value}失败`, resp?.message || '未知错误，请联系负责后端的同学')
    }
}
/** ============ 部门管理 END ============ */

/** =========== 职位管理 BEGIN =========== */
const roleDialogVisible = ref(false)
const roleDialogMode = ref<'create' | 'edit'>('create')
const roleTargetId = ref<number | null>(null)
const roleFormName = ref('')
const roleFormLevel = ref<number | null>(null)
const roleFormActive = ref(true)
// 停用二次确认
const confirmRoleVisible = ref(false)
const roleSaving = ref(false)

const roleDialogTitle = computed(() => `${roleDialogMode.value === 'create' ? '新建' : '更新'}职位`)
const roleCanSave = computed(() => roleFormName.value.trim() !== '' && roleFormLevel.value !== null)

function openRoleCreate() {
    roleDialogMode.value = 'create'
    roleTargetId.value = null
    roleFormName.value = ''
    roleFormLevel.value = null
    roleFormActive.value = true
    roleDialogVisible.value = true
}

function openRoleEdit(item: RoleItem) {
    roleDialogMode.value = 'edit'
    roleTargetId.value = item.id
    roleFormName.value = item.name
    roleFormLevel.value = item.level
    roleFormActive.value = item.is_active
    roleDialogVisible.value = true
}

// 编辑已有职位，关闭启用开关时需二次确认
function onRoleActiveChange(value: boolean) {
    if (roleDialogMode.value === 'edit' && !value) {
        // 先回弹为开启，确认停用后才真正关闭
        roleFormActive.value = true
        confirmRoleVisible.value = true
    }
}
// 确认停用职位
function confirmRole() {
    roleFormActive.value = false
    confirmRoleVisible.value = false
}

async function onRoleConfirm() {
    const name = roleFormName.value.trim()
    if (!name) return
    if (roleFormLevel.value === null) return
    const level = roleFormLevel.value

    // 不允许重名
    if (orgStore.roles.some((i) => i.name === name && i.id !== roleTargetId.value)) {
        setToast('error', `${roleDialogTitle.value}失败`, `名称「${name}」已存在`)
        return
    }

    roleSaving.value = true
    const resp = await request<ApiResponse<null>>({
        url: roleDialogMode.value === 'create' ? '/role/create' : '/role/update',
        method: 'POST',
        data:
            roleDialogMode.value === 'create'
                ? { name, level, type: '部门' }
                : { role_id: roleTargetId.value, name, level, type: '部门', is_active: roleFormActive.value },
    })
    roleSaving.value = false

    if (resp?.code == 200) {
        setToast('success', roleDialogMode.value === 'create' ? '职位已新建' : '职位已更新', name)
        roleDialogVisible.value = false
        // 刷新组织架构缓存，两个列表即时生效
        await orgStore.refresh()
    } else {
        setToast('error', `${roleDialogTitle.value}失败`, resp?.message || '未知错误，请联系负责后端的同学')
    }
}
/** ============ 职位管理 END ============ */

onMounted(() => {
    orgStore.ensureLoaded()
})
</script>

<template>
    <main>
        <h1 class="e-title">组织管理</h1>

        <div class="section-header">
            <h2>部门管理</h2>
            <Button icon="pi pi-plus" label="新建" @click="openDeptCreate" />
        </div>
        <DataTable :value="orgStore.departments" data-key="id" striped-rows>
            <template #empty>
                <div class="e-table-empty">暂无数据</div>
            </template>
            <Column field="id" header="序号" />
            <Column field="name" header="名称" />
            <Column header="启用">
                <template #body="{ data }">
                    <span class="status" :class="data.is_active ? 'active' : 'inactive'">
                        <span class="dot"></span>{{ data.is_active ? '是' : '否' }}
                    </span>
                </template>
            </Column>
            <Column header="操作">
                <template #body="{ data }">
                    <Button icon="pi pi-pencil" severity="secondary" text @click="openDeptEdit(data)" />
                </template>
            </Column>
        </DataTable>

        <br />

        <div class="section-header">
            <h2>职位管理</h2>
            <Button icon="pi pi-plus" label="新建" @click="openRoleCreate" />
        </div>
        <DataTable :value="orgStore.roles" data-key="id" striped-rows>
            <template #empty>
                <div class="e-table-empty">暂无数据</div>
            </template>
            <Column field="id" header="序号" />
            <Column field="name" header="名称" />
            <Column field="level" header="权限等级" />
            <Column header="启用">
                <template #body="{ data }">
                    <span class="status" :class="data.is_active ? 'active' : 'inactive'">
                        <span class="dot"></span>{{ data.is_active ? '是' : '否' }}
                    </span>
                </template>
            </Column>
            <Column header="操作">
                <template #body="{ data }">
                    <Button icon="pi pi-pencil" severity="secondary" text @click="openRoleEdit(data)" />
                </template>
            </Column>
        </DataTable>

        <!-- 部门新建 / 更新 -->
        <Dialog v-model:visible="deptDialogVisible" modal :header="deptDialogTitle" :style="{ width: '24rem' }">
            <div class="dialog-fields">
                <div>名称</div>
                <InputText
                    id="dept-name"
                    v-model="deptFormName"
                    placeholder="输入名称"
                    fluid
                    @keyup.enter="onDeptConfirm"
                />
                <div>启用</div>
                <ToggleSwitch
                    v-model="deptFormActive"
                    input-id="dept-active"
                    @update:model-value="onDeptActiveChange"
                />
            </div>
            <template #footer>
                <Button label="取消" severity="secondary" text @click="deptDialogVisible = false" />
                <Button label="保存" :disabled="!deptCanSave" :loading="deptSaving" @click="onDeptConfirm" />
            </template>
        </Dialog>

        <ConfirmDialog v-model="confirmDeptVisible" @confirm="confirmDept">
            是否停用部门 <b>{{ deptFormName }}</b
            >？
        </ConfirmDialog>

        <!-- 职位新建 / 更新 -->
        <Dialog v-model:visible="roleDialogVisible" modal :header="roleDialogTitle" :style="{ width: '24rem' }">
            <div class="dialog-fields">
                <div>名称</div>
                <InputText
                    id="role-name"
                    v-model="roleFormName"
                    placeholder="输入名称"
                    fluid
                    @keyup.enter="onRoleConfirm"
                />
                <div>权限等级</div>
                <InputNumber
                    id="role-level"
                    v-model="roleFormLevel"
                    fluid
                    :use-group="false"
                    @keyup.enter="onRoleConfirm"
                />
                <div>启用</div>
                <ToggleSwitch
                    v-model="roleFormActive"
                    input-id="role-active"
                    @update:model-value="onRoleActiveChange"
                />
            </div>
            <template #footer>
                <Button label="取消" severity="secondary" text @click="roleDialogVisible = false" />
                <Button label="保存" :disabled="!roleCanSave" :loading="roleSaving" @click="onRoleConfirm" />
            </template>
        </Dialog>

        <ConfirmDialog v-model="confirmRoleVisible" @confirm="confirmRole">
            是否停用职位 <b>{{ roleFormName }}</b
            >？
        </ConfirmDialog>
    </main>
</template>

<style lang="less" scoped>
.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h2 {
        margin-bottom: 16px;
        font-size: 20px;
    }
}

// 启用状态圆点
.status {
    display: inline-flex;
    align-items: center;
    gap: 6px;

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

// 弹窗表单
.dialog-fields {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
}
</style>
