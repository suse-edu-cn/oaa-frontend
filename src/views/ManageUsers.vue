<!-- 用户管理页 /manage/users -->
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { Button, Column, DataTable, IconField, InputIcon, InputText, Select } from 'primevue'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import request from '@/utils/request'
import setToast from '@/utils/setToast'
import { useOrgStore } from '@/stores/org'
import type { ApiResponse } from '@/types/api'
import type { UserBatchErrorItem, UserListData, UserInfo } from '@/types/user'

// 部门和职位的下拉菜单
const orgStore = useOrgStore()

const users = ref<UserInfo[]>([])
const loading = ref(true)

const filterDepartment = ref<string | null>(null)
const filterRole = ref<string | null>(null)
const keyword = ref('')

// 条件筛选
const filteredUsers = computed(() => {
    const dept = filterDepartment.value
    const role = filterRole.value
    const kw = keyword.value.trim().toLowerCase()
    return users.value.filter((u) => {
        if (dept && u.department !== dept) return false
        if (role && u.role !== role) return false
        if (kw && ![u.name, u.username, u.student_id].some((v) => v.toLowerCase().includes(kw))) return false
        return true
    })
})

// 删除用户
const deleteVisible = ref(false)
const deleteTarget = ref<UserInfo | null>(null)
const deleting = ref(false)

function openDelete(user: UserInfo) {
    deleteTarget.value = user
    deleteVisible.value = true
}

async function onDelete() {
    const target = deleteTarget.value
    if (!target) return

    deleting.value = true
    const resp = await request<ApiResponse<null>>({
        url: '/user/delete',
        method: 'POST',
        data: { user_id: target.user_id },
    })
    deleting.value = false

    if (resp?.code == 200) {
        // 前端同步移除该用户
        users.value = users.value.filter((u) => u.user_id !== target.user_id)
        setToast('success', '删除成功', `已删除用户：${target.name}（${target.username}）`)
        deleteVisible.value = false
    } else {
        setToast('error', '删除失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

// 批量调整部门
const drafts = ref<Record<number, { department: string; role: string }>>({})
const savingBatch = ref(false)
// 与列表原始数据比对，找出有改动的用户
const changedUsers = computed(() =>
    users.value.filter((u) => {
        const d = drafts.value[u.user_id]
        return d && (d.department !== u.department || d.role !== u.role)
    })
)
// 重置已调整的数据
function resetDrafts() {
    const next: Record<number, { department: string; role: string }> = {}
    for (const u of users.value) {
        next[u.user_id] = { department: u.department, role: u.role }
    }
    drafts.value = next
}

async function onSaveBatch() {
    const payload: { user_id: number; department_id: number; role_id: number }[] = []
    for (const u of changedUsers.value) {
        const d = drafts.value[u.user_id]
        if (!d) continue
        payload.push({
            user_id: u.user_id,
            // name 反查 id，反查不到说明部门 / 职位缓存与数据不符
            department_id: orgStore.departments.find((dep) => dep.name === d.department)?.id ?? 0,
            role_id: orgStore.roles.find((r) => r.name === d.role)?.id ?? 0,
        })
    }
    if (payload.some((p) => !p.department_id || !p.role_id)) {
        setToast('error', '保存失败', '存在无法匹配的部门或职位，请刷新页面后重试')
        return
    }

    savingBatch.value = true
    const resp = await request<ApiResponse<UserBatchErrorItem[] | null>>({
        url: '/user/batch',
        method: 'POST',
        data: payload,
    })
    savingBatch.value = false

    if (resp?.code == 200) {
        // 本地同步改动，无需重新拉取列表
        for (const u of users.value) {
            const d = drafts.value[u.user_id]
            if (d) {
                u.department = d.department
                u.role = d.role
            }
        }
        setToast('success', '保存成功', `已更新 ${payload.length} 个用户的部门 / 职位`)
    } else if (resp?.code == 400 && Array.isArray(resp.data)) {
        // 部分失败：单条 toast，detail 中每个失败条目占一行，草稿保留以便修正后重试
        const detail = resp.data.map((item) => `${item.name}：${item.error_message}`).join('\n')
        setToast('error', '部分用户更新失败', detail)
    } else {
        setToast('error', '保存失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

onMounted(async () => {
    const [userResp] = await Promise.all([
        request<ApiResponse<UserListData>>({
            url: '/user/list',
            method: 'GET',
            params: { is_all: true },
        }),
        orgStore.ensureLoaded(),
    ])

    if (userResp?.code == 200) {
        users.value = userResp.data.list
        resetDrafts()
    } else {
        setToast('error', '获取用户列表失败', userResp?.message || '未知错误，请联系负责后端的同学')
    }

    loading.value = false
})
</script>

<template>
    <main>
        <h1 class="e-title">用户管理</h1>
        <DataTable
            :value="filteredUsers"
            :loading="loading"
            data-key="user_id"
            striped-rows
            paginator
            :rows="10"
            :rows-per-page-options="[10, 20, 40]"
            class="user-manage-table"
        >
            <template #header>
                <!-- 顶部筛选栏 -->
                <div class="filter-bar">
                    <Select
                        v-model="filterDepartment"
                        :options="orgStore.departments"
                        option-label="name"
                        option-value="name"
                        placeholder="全部部门"
                        show-clear
                    />
                    <Select
                        v-model="filterRole"
                        :options="orgStore.roles"
                        option-label="name"
                        option-value="name"
                        placeholder="全部职位"
                        show-clear
                    />
                    <IconField class="search">
                        <InputIcon class="pi pi-search" />
                        <InputText v-model="keyword" placeholder="搜索姓名 / 昵称 / 学号" fluid />
                    </IconField>
                    <Button
                        icon="pi pi-save"
                        label="保存"
                        :disabled="!changedUsers.length"
                        :loading="savingBatch"
                        @click="onSaveBatch"
                    />
                </div>
            </template>
            <template #empty>
                <div class="e-table-empty">
                    {{ users.length ? '没有符合条件的用户' : '暂无用户数据' }}
                </div>
            </template>
            <Column field="user_id" header="序号" sortable />
            <Column field="name" header="姓名" sortable />
            <Column field="username" header="昵称" />
            <Column field="student_id" header="学号" sortable />
            <Column field="department" header="部门">
                <template #body="{ data }">
                    <Select
                        v-model="drafts[data.user_id].department"
                        :options="orgStore.departments"
                        option-label="name"
                        option-value="name"
                        fluid
                    />
                </template>
            </Column>
            <Column field="role" header="职位">
                <template #body="{ data }">
                    <Select
                        v-model="drafts[data.user_id].role"
                        :options="orgStore.roles"
                        option-label="name"
                        option-value="name"
                        fluid
                    />
                </template>
            </Column>
            <Column header="">
                <template #body="{ data }">
                    <Button icon="pi pi-trash" severity="danger" text @click="openDelete(data as UserInfo)" />
                </template>
            </Column>
        </DataTable>

        <!-- 删除用户对话框 -->
        <ConfirmDialog v-model="deleteVisible" :loading="deleting" @confirm="onDelete">
            <!-- <p> -->
            是否删除用户 <b>{{ deleteTarget?.name }}</b
            >（{{ deleteTarget?.username }}）？
            <!-- </p> -->
        </ConfirmDialog>
    </main>
</template>

<style lang="less" scoped>
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
</style>
