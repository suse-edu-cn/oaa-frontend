<!-- 公告列表 /announcement -->
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { Button, DataView, Select, Tab, TabList, Tabs, Tag } from 'primevue'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useOrgStore } from '@/stores/org'
import { fromIso } from '@/utils/date'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

import type { AnnouncementItem, ApiResponse } from '@/types'

const orgStore = useOrgStore()
const router = useRouter()

// ================= 部门筛选 =================
// 列表条目直接提供 department_name，故按名称过滤
const deptName = ref<string | null>(null)

// ================= 公告列表 =================
const announcements = ref<AnnouncementItem[]>([])

// 请求序号，快速切换 Tab 时丢弃旧响应
let listRequests = 0

// 各 Tab 对应的接口 status 参数
const tabStatusMap: Record<string, string | undefined> = {
    published: 'active',
    all: undefined,
    mine: 'history',
    draft: 'draft',
}

async function loadAnnouncements() {
    const seq = ++listRequests
    const status = tabStatusMap[activeTab.value]
    const params: Record<string, string> = {}
    if (status) params.status = status

    const resp = await request<ApiResponse<AnnouncementItem[]>>({
        url: '/announcement/list',
        method: 'GET',
        params,
    })
    if (seq !== listRequests) return
    if (resp?.code == 200) {
        announcements.value = resp.data ?? []
    } else {
        setToast('error', '获取公告列表失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

// ================= 状态筛选 =================
const activeTab = ref('published')

// 切换 Tab 时按对应 status 重新拉取
watch(activeTab, loadAnnouncements)

// 部门为前端过滤（接口只收 status 参数）
const filteredAnnouncements = computed(() =>
    deptName.value ? announcements.value.filter((a) => a.department_name === deptName.value) : announcements.value
)

// ================= 操作 =================
// 编辑暂复用发布页，通过 query 传 id（待 new 页面支持按 id 加载后生效）
function openEdit(a: AnnouncementItem) {
    router.push({ path: '/manage/announcement/edit/' + a.announcement_id })
}

const deleteTarget = ref<AnnouncementItem | null>(null)
const deleteVisible = ref(false)
const deleting = ref(false)

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
        const resp = await request<ApiResponse<null>>({
            url: '/announcement/delete',
            method: 'POST',
            data: { announcement_id: id },
        })
        if (resp?.code == 200) {
            deleteVisible.value = false
            setToast('success', '公告已删除')
            // 重新拉取，保证与后端状态一致
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
        </div>

        <Tabs v-model:value="activeTab" class="status-tabs">
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

        <DataView :value="filteredAnnouncements" paginator :rows="10">
            <template #empty>
                <div class="e-table-empty">暂无公告</div>
            </template>
            <template #list="slotProps">
                <div v-for="a in slotProps.items" :key="a.announcement_id" class="announcement-item">
                    <div class="data">
                        <router-link :to="`/announcement/${a.announcement_id}`" class="title">{{
                            a.title
                        }}</router-link>
                        <div class="meta">
                            <span class="item">
                                <Tag value="草稿" v-if="!a.is_active" severity="warn" />
                                <span>{{ a.publisher_name }}</span>
                                <span>{{ a.department_name }}</span>
                            </span>
                            <span v-if="!a.published_at">创建于 {{ fromIso(a.created_at) || '—' }}</span>
                            <span v-if="a.published_at">发布于 {{ fromIso(a.published_at) || '—' }}</span>
                        </div>
                    </div>
                    <div class="actions">
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

.announcement-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 6px;

    &:not(:first-child) {
        border-top: 1px solid var(--p-content-border-color);
    }

    .data {
        flex: 1;
        min-width: 0;

        .title {
            display: block;
            font-size: 18px;
            font-weight: 600;
            line-height: 1.4;
            margin: 2px 0 7px;
        }

        .meta {
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
    }

    .actions {
        margin-left: 18px;
    }
}
</style>
