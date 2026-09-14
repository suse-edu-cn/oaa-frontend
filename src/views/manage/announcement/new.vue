<!-- 发布公告 /announcement/new -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, InputText, Select } from 'primevue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

import { useOrgStore } from '@/stores/org'
import request from '@/utils/request'
import setToast from '@/utils/setToast'
import { uploadImage } from '@/utils/uploader'

import type { ApiResponse, UploadResponse } from '@/types'
import type { UploadImgCallBack } from 'md-editor-v3'

const router = useRouter()
const orgStore = useOrgStore()

const departmentId = ref<number | null>(null)
const title = ref('')
const content = ref('')

const canPublish = computed(
    () => departmentId.value !== null && title.value.trim() !== '' && content.value.trim() !== ''
)

async function onUploadImg(files: File[], callback: UploadImgCallBack) {
    const results = await Promise.all(files.map((file) => uploadImage(file, 'announcement')))
    callback(
        results
            .filter((r): r is UploadResponse => r !== null)
            .map((r) => ({ url: r.url, alt: 'image', title: 'image' }))
    )
}

function getImageUri(text: string) {
    // url转uri
    return text.replace(
        /!\[([^\]]*)\]\((https:\/\/obj(?:\.in)?\.suseoaa\.com\/[^)\s]+)(?:\s+['"][^'"]*['"])?\)/g,
        (match, alt: string, link: string) => {
            try {
                return `![${alt}](oss://${new URL(link).pathname.replace(/^\//, '')})`
            } catch {
                return match
            }
        }
    )
}
const publishing = ref(false)

async function onPublish() {
    if (!canPublish.value || departmentId.value === null) return

    const payload = {
        department_id: departmentId.value,
        title: title.value.trim(),
        content: getImageUri(content.value),
    }

    publishing.value = true
    try {
        const resp = await request<ApiResponse<null>>({
            url: '/announcement/create',
            method: 'POST',
            data: payload,
        })
        if (resp?.code == 200) {
            setToast('success', '公告发布成功')
            router.push('/manage/announcement')
        } else {
            setToast('error', '公告发布失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        publishing.value = false
    }
}

onMounted(() => {
    orgStore.ensureLoaded()
})
</script>

<template>
    <main>
        <h1 class="e-title">发布公告</h1>

        <div class="form-item">
            <label for="announcement-department">发布部门</label>
            <Select
                v-model="departmentId"
                input-id="announcement-department"
                :options="orgStore.departments"
                option-label="name"
                option-value="id"
                placeholder="请选择发布部门"
            />
        </div>
        <div class="form-item">
            <label for="announcement-title">标题</label>
            <span class="input-container">
                <InputText id="announcement-title" v-model="title" placeholder="请输入公告标题" fluid />
            </span>
        </div>
        <br />
        <MdEditor
            id="announcement-content"
            v-model="content"
            placeholder="请输入公告内容，支持 Markdown"
            :style="{ minHeight: '480px' }"
            @on-upload-img="onUploadImg"
        />
        <div class="form-actions">
            <Button label="取消" severity="secondary" @click="router.back()" />
            <Button label="发布" :disabled="!canPublish" :loading="publishing" @click="onPublish" />
        </div>
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
    gap: 0.75rem;
    margin-top: 1.5rem;
}

@media screen and (max-width: 800px) {
    .form-item {
        --label-display: block;
    }
}
</style>
