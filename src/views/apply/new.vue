<!-- 创建申请页 /apply/new -->
<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { Button } from 'primevue'

import ApplicationForm from '@/components/ApplicationForm.vue'
import { useAuthStore } from '@/stores/auth'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

import type { ApiResponse, ApplicationFormData } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const submitting = ref(false)

async function onSubmit(data: ApplicationFormData, termId: number | null) {
    if (!termId) return

    submitting.value = true
    const resp = await request<ApiResponse<null>>({
        url: '/application/create',
        method: 'POST',
        data: { ...data, term_id: termId },
    })
    submitting.value = false

    if (resp?.code == 200) {
        setToast('success', '提交成功', '申请已提交，请等待审核')
        router.push('/apply')
    } else {
        setToast('error', '提交失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}
</script>

<template>
    <main>
        <h1 class="e-title">添加新申请</h1>

        <ApplicationForm
            :initial="{
                name: authStore.userInfo?.name ?? '',
                student_id: authStore.userInfo?.student_id ?? '',
            }"
            :submitting="submitting"
            @submit="onSubmit"
        >
            <Button label="取消" severity="secondary" @click="router.back()" />
        </ApplicationForm>
    </main>
</template>
