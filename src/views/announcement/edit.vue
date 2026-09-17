<!-- 编辑公告 /announcement/edit/:id -->
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Checkbox, InputText } from 'primevue'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import request from '@/utils/request'
import setToast from '@/utils/setToast'
import { urlToUri, uriToUrl } from '@/utils/uriConverter'

import type { AnnouncementItem, ApiResponse } from '@/types'

const route = useRoute()
const router = useRouter()
const announcement = ref<AnnouncementItem | null>(null)
const title = ref('')
const content = ref('')
const canSave = computed(() => title.value.trim() !== '' && content.value.trim() !== '')

async function loadAnnouncement() {
    const resp = await request<ApiResponse<AnnouncementItem>>({
        url: '/announcement/get',
        method: 'GET',
        params: { announcement_id: String(route.params.id) },
    })
    if (resp?.code == 200 && resp.data) {
        announcement.value = resp.data
        title.value = resp.data.title
        content.value = uriToUrl(resp.data.content)
    } else {
        setToast('error', '获取公告详情失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

const saving = ref(false)
// 草稿可勾选保存后立即公开发布
const publishNow = ref(false)
const pushConfirmVisible = ref(false)
const pushConfirmLoading = ref(false)

async function saveAnnouncement(): Promise<boolean> {
    if (!announcement.value) return false

    saving.value = true
    try {
        const resp = await request<ApiResponse<null>>({
            url: '/announcement/update',
            method: 'POST',
            data: {
                announcement_id: announcement.value.announcement_id,
                title: title.value.trim(),
                content: urlToUri(content.value),
            },
        })
        if (resp?.code == 200) {
            return true
        }
        setToast('error', '公告保存失败', resp?.message || '未知错误，请联系负责后端的同学')
        return false
    } finally {
        saving.value = false
    }
}

async function onSave() {
    if (!canSave.value) return
    if (publishNow.value) {
        pushConfirmVisible.value = true
        return
    }

    if (await saveAnnouncement()) {
        setToast('success', '公告保存成功')
        router.push('/announcement/manage')
    }
}

async function onPushConfirm() {
    pushConfirmLoading.value = true
    try {
        if (!(await saveAnnouncement())) return

        const resp = await request<ApiResponse<null>>({
            url: '/announcement/push',
            method: 'POST',
            data: { announcement_id: announcement.value?.announcement_id },
        })
        if (resp?.code == 200) {
            setToast('success', '公告已保存并发布')
        } else {
            setToast('error', '公告已保存，但发布失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
        pushConfirmVisible.value = false
        router.push('/announcement/manage')
    } finally {
        pushConfirmLoading.value = false
    }
}

onMounted(() => {
    loadAnnouncement()
})
</script>

<template>
    <main>
        <h1 class="e-title">编辑公告</h1>

        <div class="form-item">
            <label for="announcement-department">发布部门</label>
            <InputText id="announcement-department" :value="announcement?.department_name ?? ''" disabled />
        </div>
        <div class="form-item">
            <label for="announcement-title">标题</label>
            <span class="input-container">
                <InputText id="announcement-title" v-model="title" placeholder="请输入公告标题" fluid />
            </span>
        </div>
        <br />
        <MarkdownEditor v-model="content" placeholder="请输入公告内容，支持 Markdown" img-scene="announcement" />
        <div class="form-actions">
            <div v-if="announcement && !announcement.is_active" class="push-option">
                <Checkbox v-model="publishNow" input-id="publish-now" binary />
                <label for="publish-now">保存后立即公开发布</label>
            </div>
            <Button label="取消" severity="secondary" @click="router.back()" />
            <Button label="保存" :disabled="!canSave" :loading="saving" @click="onSave" />
        </div>

        <!-- 保存并发布二次确认 -->
        <ConfirmDialog
            v-model="pushConfirmVisible"
            confirm-button="primary"
            :loading="pushConfirmLoading"
            @confirm="onPushConfirm"
        >
            是否保存并立即公开发布公告 <b>{{ title.trim() }}</b
            >？
        </ConfirmDialog>
    </main>
</template>

<style lang="less" scoped>
.form-item {
    --label-display: inline-block;

    label {
        display: var(--label-display);
        font-size: 14px;
        width: 4em;
        margin-top: 1.2em;
        margin-right: 1em;
        text-align: right;
    }

    .input-container {
        // 用于让标题输入框占满 main
        display: inline-block;
        width: calc(100% - 4.5em);
    }
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.5rem;

    .push-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-right: auto;

        label {
            font-size: 14px;
            color: var(--p-text-muted-color);
            cursor: pointer;
        }
    }
}

@media screen and (max-width: 800px) {
    .form-item {
        --label-display: block;
    }
}
</style>
