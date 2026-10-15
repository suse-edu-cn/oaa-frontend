<!-- 公告列表 /announcement/list -->
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { Button, DataView, Select, Skeleton, Tab, TabList, Tabs, Tag } from 'primevue'

import { deleteAnnouncement, getAnnouncementList } from '@/api/announcement'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { fromIso } from '@/utils/date'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'

import type { AnnouncementItem, AnnouncementListParams } from '@/types'

const authStore = useAuthStore()
const orgStore = useOrgStore()
const router = useRouter()

// 权限低于 30 不显示 Tab 和管理功能
const canManage = computed(() => (authStore.userInfo?.role_level ?? 0) >= 30)

const deptName = ref<string | null>(null)
const announcements = ref<AnnouncementItem[]>([])
// 初次进入或切换 Tab 时显示骨架屏
const loading = ref(true)
// 请求序号，快速切换 Tab 时丢弃旧响应
let listRequests = 0

const tabStatusMap: Record<string, string | undefined> = {
    published: 'active',
    all: undefined,
    mine: 'history',
    draft: 'draft',
}

async function loadAnnouncements() {
    const seq = ++listRequests
    loading.value = true
    // 无管理权限时固定为已发布，忽略可能残留的 Tab 状态
    const status = canManage.value ? tabStatusMap[activeTab.value] : 'active'
    const params: AnnouncementListParams = {}
    if (status) params.status = status

    try {
        const resp = await getAnnouncementList(params)
        if (seq !== listRequests) return
        if (resp?.code == 200) {
            const list = resp.data ?? []
            announcements.value = canManage.value ? list : list.filter((a) => a.is_active)
        } else {
            setToast('error', '获取公告列表失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        // 仅最新一次请求可以解除 loading，避免被旧响应提前打断
        if (seq === listRequests) loading.value = false
    }
}

// ================= 状态筛选 =================
const activeTab = ref('published')
watch(activeTab, loadAnnouncements)
const filteredAnnouncements = computed(() =>
    deptName.value ? announcements.value.filter((a) => a.department_name === deptName.value) : announcements.value
)

// ================= 操作 =================
const deleteTarget = ref<AnnouncementItem | null>(null)
const deleteVisible = ref(false)
const deleting = ref(false)
function openEdit(a: AnnouncementItem) {
    router.push({ path: '/announcement/edit/' + a.announcement_id })
}
function openDelete(a: AnnouncementItem) {
    deleteTarget.value = a
    deleteVisible.value = true
}

// 删除公告
async function onDelete() {
    const id = deleteTarget.value?.announcement_id
    if (!id) return

    deleting.value = true
    try {
        const resp = await deleteAnnouncement(id)
        if (resp?.code == 200) {
            deleteVisible.value = false
            setToast('success', '公告已删除')
            // 需重新拉取，保证与后端状态一致
            loadAnnouncements()
        } else {
            setToast('error', '删除公告失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } finally {
        deleting.value = false
    }
}

onMounted(() => {
    orgStore.ensureLoaded()
    // 管理功能依赖用户信息，初始化完成后 canManage 会自动更新
    if (!authStore.isReady) initAuthStore()
    loadAnnouncements()
})
</script>

<template>
    <main>
        <h1 class="e-title">公告列表</h1>

        <div class="filter-bar">
            <label for="announcement-dept">部门</label>
            <Select
                v-model="deptName"
                input-id="announcement-dept"
                :options="orgStore.departments"
                option-label="name"
                option-value="name"
                placeholder="全部部门"
                show-clear
            />
            <router-link v-if="canManage" to="/announcement/new" :style="{ marginLeft: 'auto' }">
                <Button label="新建公告" icon="pi pi-plus" />
            </router-link>
        </div>

        <Tabs v-if="canManage" v-model:value="activeTab" class="status-tabs">
            <TabList>
                <Tab value="published" class="tab-item">
                    <i class="pi pi-check"></i>
                    已发布
                </Tab>
                <Tab value="all" class="tab-item">
                    <i class="pi pi-list"></i>
                    全部
                </Tab>
                <Tab value="mine" class="tab-item">
                    <i class="pi pi-user"></i>
                    我发布的
                </Tab>
                <Tab value="draft" class="tab-item">
                    <i class="pi pi-pencil"></i>
                    草稿
                </Tab>
            </TabList>
        </Tabs>

        <!-- 加载中骨架屏，结构与公告条目一致 -->
        <div v-if="loading" class="skeleton-list">
            <div v-for="i in 5" :key="i" class="skeleton-item">
                <Skeleton class="s-title" :width="`${40 + (i % 3) * 8}%`" height="25px" />
                <Skeleton :width="i % 2 ? '55%' : '68%'" height="20px" />
            </div>
        </div>
        <DataView v-else :value="filteredAnnouncements" paginator :rows="10">
            <template #empty>
                <div class="e-table-empty">暂无公告</div>
            </template>
            <template #list="slotProps">
                <div v-for="a in slotProps.items" :key="a.announcement_id" class="announcement-item">
                    <div :style="{ flex: 1 }">
                        <router-link :to="`/announcement/${a.announcement_id}`" class="title">
                            {{ a.title }}
                        </router-link>
                        <div class="data">
                            <span class="item">
                                <Tag value="草稿" v-if="!a.is_active" severity="warn" />
                                <span>{{ a.publisher_name }}</span>
                                <span>{{ a.department_name }}</span>
                            </span>
                            <span v-if="!a.published_at">创建于 {{ fromIso(a.created_at) || '—' }}</span>
                            <span v-if="a.published_at">发布于 {{ fromIso(a.published_at) || '—' }}</span>
                        </div>
                    </div>
                    <div v-if="canManage" class="actions">
                        <Button icon="pi pi-pencil" severity="secondary" text @click="openEdit(a)" />
                        <Button icon="pi pi-trash" severity="danger" text @click="openDelete(a)" />
                    </div>
                </div>
            </template>
        </DataView>

        <!-- 删除公告二次确认 -->
        <ConfirmDialog v-model="deleteVisible" :loading="deleting" @confirm="onDelete">
            是否删除公告 <b>《{{ deleteTarget?.title }}》</b>？
        </ConfirmDialog>
    </main>
</template>

<style lang="less" scoped>
.filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 1.5em;

    label {
        font-size: 14px;
        color: var(--p-text-muted-color);
    }

    .p-select {
        min-width: 240px;
    }
}

.tab-item {
    width: 16%;
}

// 加载中骨架屏，间距与 .announcement-item 保持一致
.skeleton-item {
    padding: 12px 6px;

    &:not(:first-child) {
        border-top: 1px solid var(--p-content-border-color);
    }

    .s-title {
        display: block;
        margin-bottom: 7px;
    }
}

.announcement-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 6px;

    &:not(:first-child) {
        border-top: 1px solid var(--p-content-border-color);
    }

    .title {
        display: block;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.4;
        margin: 2px 0 7px;
    }

    .data {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: var(--p-text-muted-color);

        .item {
            display: flex;
            align-items: center;
            gap: 1em;
        }
    }

    .actions {
        margin-left: 18px;
    }
}
</style>
