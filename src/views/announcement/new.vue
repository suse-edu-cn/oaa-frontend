<!-- 发布公告 /announcement/new -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Checkbox, InputText, Select } from 'primevue'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { useOrgStore } from '@/stores/org'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

import type { ApiResponse } from '@/types'

const router = useRouter()
const orgStore = useOrgStore()

const departmentId = ref<number | null>(null)
const title = ref('')
const content = ref('')

const canPublish = computed(
    () => departmentId.value !== null && title.value.trim() !== '' && content.value.trim() !== ''
)

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
// 创建后立即公开发布
const publishNow = ref(false)
const pushConfirmVisible = ref(false)
const pushConfirmLoading = ref(false)

async function createAnnouncement(): Promise<{ ok: boolean; id: number | null }> {
    if (departmentId.value === null) return { ok: false, id: null }

    publishing.value = true
    try {
        const resp = await request<ApiResponse<{ announcement_id: number }>>({
            url: '/announcement/create',
            method: 'POST',
            data: {
                department_id: departmentId.value,
                title: title.value.trim(),
                content: getImageUri(content.value),
            },
        })
        if (resp?.code == 200) {
            return { ok: true, id: resp.data?.announcement_id ?? null }
        }
        setToast('error', '公告创建失败', resp?.message || '未知错误，请联系负责后端的同学')
        return { ok: false, id: null }
    } finally {
        publishing.value = false
    }
}

async function onPublish() {
    if (!canPublish.value || departmentId.value === null) return
    if (publishNow.value) {
        pushConfirmVisible.value = true
        return
    }

    const { ok } = await createAnnouncement()
    if (!ok) return
    setToast('success', '公告创建成功')
    router.push('/manage/announcement')
}

// 确认后创建并立即推送公开
async function onPushConfirm() {
    pushConfirmLoading.value = true
    try {
        const { ok, id } = await createAnnouncement()
        if (!ok) return

        if (id === null) {
            setToast('error', '公告已创建，但发布失败', '未找到公告标识 ID')
            pushConfirmVisible.value = false
            router.push('/manage/announcement')
            return
        }

        const resp = await request<ApiResponse<null>>({
            url: '/announcement/push',
            method: 'POST',
            data: { announcement_id: id },
        })
        if (resp?.code == 200) {
            setToast('success', '公告发布成功')
        } else {
            setToast('error', '公告已创建，但发布失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
        pushConfirmVisible.value = false
        router.push('/announcement/manage')
    } finally {
        pushConfirmLoading.value = false
    }
}

onMounted(() => {
    orgStore.ensureLoaded()
})
</script>

<template>
    <main>
        <h1 class="e-title">新建公告</h1>

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
        <MarkdownEditor v-model="content" placeholder="请输入公告内容，支持 Markdown" img-scene="announcement" />
        <div class="form-actions">
            <div class="push-option">
                <Checkbox v-model="publishNow" input-id="publish-now" binary />
                <label for="publish-now">创建后立即公开发布</label>
            </div>
            <Button label="取消" severity="secondary" @click="router.back()" />
            <Button label="发布" :disabled="!canPublish" :loading="publishing" @click="onPublish" />
        </div>

        <!-- 立即公开发布二次确认 -->
        <ConfirmDialog
            v-model="pushConfirmVisible"
            confirm-button="primary"
            :loading="pushConfirmLoading"
            @confirm="onPushConfirm"
        >
            是否创建并立即公开发布公告 <b>{{ title.trim() }}</b
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
