<!-- 编辑申请页 /apply/edit/:id -->
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Button } from 'primevue'

import ApplicationForm from '@/components/ApplicationForm.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

import type { ApiResponse, ApplicationFormPrefill, ApplicationFormData, ApplicationItem } from '@/types'

const route = useRoute()
const router = useRouter()

// 待编辑申请的 id
const routeId = Number(route.params.id)
const submitting = ref(false)

// ================= 加载 =================
const loading = ref(true)
const notFound = ref(false)
// 预填数据，载入成功后传给表单组件
const prefill = ref<ApplicationFormPrefill>({})

// 查找 id 对应的申请并预填表单
async function loadApplication() {
    loading.value = true
    notFound.value = false

    const resp = await request<ApiResponse<ApplicationItem[]>>({
        url: '/application/me',
        method: 'GET',
    })
    loading.value = false

    if (resp?.code != 200) {
        setToast('error', '获取申请信息失败', resp?.message || '未知错误，请联系负责后端的同学')
        notFound.value = true
        return
    }

    const item = (resp.data ?? []).find((a) => a.id === routeId)
    if (!item) {
        notFound.value = true
        return
    }

    prefill.value = {
        name: item.name,
        student_id: item.student_id,
        termId: item.term_id,
        college: item.college,
        major_class: item.major_class,
        gender: item.gender,
        phone: item.phone,
        qq: item.qq,
        political_status: item.political_status,
        birth_date: item.birth_date,
        avatar: item.avatar?.uri || '',
        avatar_url: item.avatar?.url || '',
        firstDept: item.first_choice?.department_id ?? null,
        firstRole: item.first_choice?.role_id ?? null,
        secondDept: item.second_choice?.department_id ?? null,
        secondRole: item.second_choice?.role_id ?? null,
        allow_adjust: item.allow_adjust,
        resume: item.resume,
        reason: item.reason,
    }
}

// ================= 提交 =================
async function onSave(data: ApplicationFormData) {
    // 周期仅展示不可编辑，data 中不含周期
    submitting.value = true
    const resp = await request<ApiResponse<null>>({
        url: '/application/update',
        method: 'POST',
        data: { ...data, application_id: routeId },
    })
    submitting.value = false

    if (resp?.code == 200) {
        setToast('success', '申请更新成功')
        router.push('/apply')
    } else {
        setToast('error', '申请更新失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

// ================= 删除 =================
const deleteVisible = ref(false)
const deleting = ref(false)
async function onDelete() {
    deleting.value = true
    const resp = await request<ApiResponse<null>>({
        url: '/application/delete',
        method: 'POST',
        data: { application_id: routeId },
    })
    deleting.value = false

    if (resp?.code == 200) {
        setToast('success', '申请删除成功')
        router.push('/apply')
    } else {
        setToast('error', '申请删除失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

onMounted(() => {
    loadApplication()
})
</script>

<template>
    <main>
        <h1 class="e-title">编辑申请</h1>

        <!-- 加载中 -->
        <div v-if="loading" class="empty">
            <i class="pi pi-spin pi-spinner icon"></i>
            <p>正在加载申请信息......</p>
        </div>

        <!-- 未找到 -->
        <div v-else-if="notFound" class="empty">
            <i class="pi pi-times-circle icon"></i>
            <p>未找到该申请，可能已被删除</p>
        </div>

        <ApplicationForm
            v-else
            :initial="prefill"
            term-disabled
            submit-label="保存修改"
            submit-icon="pi pi-save"
            :submitting="submitting"
            @submit="onSave"
        >
            <Button label="取消" severity="secondary" @click="router.back()" />&nbsp;
            <Button label="删除申请" severity="danger" :loading="deleting" @click="deleteVisible = true" />
        </ApplicationForm>

        <!-- 删除申请确认 -->
        <ConfirmDialog v-model="deleteVisible" :loading="deleting" @confirm="onDelete">
            是否删除该申请？以上所有内容将无法恢复！
        </ConfirmDialog>
    </main>
</template>

<style lang="less" scoped>
// 加载中 / 未找到状态
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
