<!-- 编辑公告 /announcement/edit/:id -->
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Checkbox, InputText, Skeleton } from 'primevue'

import { getAnnouncement, publishAnnouncement, updateAnnouncement } from '@/api/announcement'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { toastApiError } from '@/utils/apiError'
import setToast from '@/utils/setToast'
import { urlToUri, uriToUrl } from '@/utils/uriConverter'

import type { AnnouncementItem } from '@/types'

const route = useRoute()
const router = useRouter()
const announcement = ref<AnnouncementItem | null>(null)
const title = ref('')
const content = ref('')
const canSave = computed(() => title.value.trim() !== '' && content.value.trim() !== '')

// 加载完成前不渲染表单，避免空白表单可编辑、被后到的数据覆盖
const loading = ref(true)
const notFound = ref(false)
const loadFailed = ref(false)

async function loadAnnouncement() {
    loading.value = true
    notFound.value = false
    loadFailed.value = false

    try {
        const resp = await getAnnouncement(String(route.params.id))
        if (resp?.code == 200 && resp.data) {
            announcement.value = resp.data
            title.value = resp.data.title
            content.value = uriToUrl(resp.data.content)
        } else if (resp?.code == 404) {
            notFound.value = true
        } else {
            loadFailed.value = true
            toastApiError('获取公告详情失败', resp)
        }
    } finally {
        loading.value = false
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
        const resp = await updateAnnouncement({
            announcement_id: announcement.value.announcement_id,
            title: title.value.trim(),
            content: urlToUri(content.value),
        })
        if (resp?.code == 200) {
            return true
        }
        toastApiError('公告保存失败', resp)
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
        router.push('/announcement/list')
    }
}

async function onPushConfirm() {
    pushConfirmLoading.value = true
    try {
        if (!(await saveAnnouncement())) return

        const resp = await publishAnnouncement(announcement.value!.announcement_id)
        if (resp?.code == 200) {
            setToast('success', '公告已保存并发布')
        } else {
            toastApiError('公告已保存，但发布失败', resp)
        }
        pushConfirmVisible.value = false
        router.push('/announcement/list')
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

        <!-- 加载中骨架屏，结构与编辑表单一致 -->
        <div v-if="loading" class="skeleton-form">
            <div v-for="i in 2" :key="i" class="s-row">
                <Skeleton class="s-label" width="4em" height="14px" />
                <Skeleton class="s-control" height="38px" />
            </div>
            <Skeleton class="s-editor" height="480px" width="100%" />
            <div class="s-actions">
                <Skeleton width="72px" height="38px" />
                <Skeleton width="72px" height="38px" />
            </div>
        </div>

        <!-- 公告不存在 / 加载失败 -->
        <div v-else-if="notFound || loadFailed" class="empty">
            <i class="pi pi-times-circle icon"></i>
            <p>{{ notFound ? '未找到该公告，可能已被删除' : '公告加载失败，请稍后重试' }}</p>
        </div>

        <template v-else>
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
        </template>

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

// 加载中骨架屏，行结构与表单一致，避免数据到达时页面跳动
.skeleton-form {
    .s-row {
        display: flex;
        align-items: center;
        gap: 1em;
        margin-top: 1.2em;

        .s-label {
            flex-shrink: 0;
        }

        .s-control {
            flex: 1;
        }
    }

    .s-editor {
        margin-top: 1em;
    }

    .s-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
    }
}

// 公告不存在 / 加载失败
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

@media screen and (max-width: 800px) {
    .form-item {
        --label-display: block;
    }

    .skeleton-form .s-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5em;
    }
}
</style>
