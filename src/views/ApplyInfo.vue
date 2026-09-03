<!-- 申请信息页 /apply -->
<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { Button, Card, Tag } from 'primevue'

import { useOrgStore } from '@/stores/org'
import request from '@/utils/request'
import setToast from '@/utils/setToast'
import type { ApiResponse } from '@/types/api'
import type { ApplicationItem, OrgRef } from '@/types/application'

const orgStore = useOrgStore()

const applications = ref<ApplicationItem[]>([])
const loading = ref(true)
const tooltip =
    '当前录取状态，“待定”意为当前录取工作尚未开始，请耐心等待。录取完成结果共有 4 种：录取第一志愿、录取第二志愿、已调剂、未通过。'

// 加载当前用户的申请
async function loadApplications() {
    loading.value = true
    const resp = await request<ApiResponse<ApplicationItem[]>>({
        url: '/application/me',
        method: 'GET',
    })
    loading.value = false

    if (resp?.code == 200) {
        // 无申请时后端返回空的 data 数组
        applications.value = resp.data ?? []
    } else {
        setToast('error', '获取申请信息失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

/** 部门 / 职位 id 反查名称，查不到时回退为 id */
function getOrgText(ref: OrgRef | null) {
    if (!ref || (!ref.department_id && !ref.role_id)) return '—'
    const dept = orgStore.departments.find((d) => d.id === ref.department_id)?.name
    const role = orgStore.roles.find((r) => r.id === ref.role_id)?.name
    return [dept ?? `部门 #${ref.department_id}`, role ?? `职位 #${ref.role_id}`].join(' ')
}

/** 申请状态对应的样式 */
function decisionClass(decision: string) {
    switch (decision) {
        case '录取第一志愿':
        case '录取第二志愿':
        case '已调剂':
            return 'active'
        case '未通过':
            return 'rejected'
        default:
            return 'pending'
    }
}

/** 后端返回带时区的 ISO 字符串，直接截取原文以保留其本地时间 */
function formatTime(iso: string) {
    return iso ? iso.replace('T', ' ').slice(0, 16) : '—'
}

onMounted(() => {
    // 用于把志愿里的部门 / 职位 id 显示为名称
    orgStore.ensureLoaded()
    loadApplications()
})
</script>

<template>
    <main>
        <h1 class="e-title">我的申请</h1>

        <div class="action-bar">
            <router-link to="/apply/new" class="link">
                <Button>
                    <i class="pi pi-plus icon"></i>
                    添加新申请
                </Button>
            </router-link>
        </div>

        <div v-if="loading" class="empty">
            <i class="pi pi-spin pi-spinner icon"></i>
            <p>正在加载信息......</p>
        </div>

        <div v-else-if="!applications.length" class="empty">
            <i class="pi pi-times-circle icon"></i>
            <p>当前暂无申请信息</p>
        </div>

        <Card v-for="a in applications" :key="a.id">
            <!-- 申请人 -->
            <template #header>
                <div class="card-header">
                    <div class="title">
                        {{ a.term_title || '—' }}
                    </div>
                    <Tag class="apply-tag" :value="a.type" />
                    <router-link :to="'/apply/edit/' + a.id" class="link">
                        <i class="pi pi-pencil"></i>
                        修改
                    </router-link>
                </div>
            </template>

            <!-- 基本信息 -->
            <template #content>
                <div class="card-table">
                    <div class="info">
                        <div class="card-grid">
                            <div class="field">
                                <label>姓名</label><span>{{ a.name || '—' }}</span>
                            </div>
                            <div class="field">
                                <label>状态</label>
                                <span :class="['status', decisionClass(a.decision)]">{{ a.decision || '—' }}</span>
                                <i
                                    class="pi pi-info-circle"
                                    v-tooltip.top="{ value: tooltip, class: 'apply-tooltip' }"
                                ></i>
                            </div>
                            <div class="field">
                                <label>班级</label><span>{{ a.major_class || '—' }}</span>
                            </div>
                            <div class="field">
                                <label>学院</label><span>{{ a.college || '—' }}</span>
                            </div>
                            <div class="field">
                                <label>政治面貌</label><span>{{ a.political_status || '—' }}</span>
                            </div>
                            <div class="field">
                                <label>生日</label><span>{{ a.birth_date || '—' }}</span>
                            </div>
                            <div class="field">
                                <label>QQ</label><span>{{ a.qq || '—' }}</span>
                            </div>
                            <div class="field">
                                <label>手机号</label><span>{{ a.phone || '—' }}</span>
                            </div>
                        </div>

                        <!-- 志愿 -->
                        <div class="card-grid">
                            <div class="field">
                                <label>第一志愿</label><span>{{ getOrgText(a.first_choice) || '—' }}</span>
                            </div>
                            <div class="field">
                                <label>第二志愿</label><span>{{ getOrgText(a.second_choice) || '—' }}</span>
                            </div>
                            <div class="field">
                                <label>服从调剂</label><span>{{ a.allow_adjust ? '是' : '否' }}</span>
                            </div>
                            <div class="field">
                                <label>最终结果</label><span>{{ getOrgText(a.result) || '—' }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- 照片 -->
                    <img v-if="a.avatar?.url" class="img" :src="a.avatar.url" alt="用户头像" />
                </div>

                <!-- 文字内容 -->
                <div class="card-block">
                    <div class="title">简历</div>
                    <p>{{ a.resume || '—' }}</p>
                </div>
                <div class="card-block">
                    <div class="title">申请理由</div>
                    <p>{{ a.reason || '—' }}</p>
                </div>
                <div class="card-block" v-if="a.decision_remark">
                    <div class="title">审批备注</div>
                    <p>{{ a.decision_remark }}</p>
                </div>
            </template>

            <template #footer>
                <span class="card-footer">提交时间：{{ formatTime(a.created_at) }}</span>
            </template>
        </Card>
    </main>
</template>

<style lang="less" scoped>
.action-bar {
    text-align: right;
    margin-bottom: 1em;
}

// 无申请信息状态
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

// 卡片header
.card-header {
    display: flex;
    align-items: center;
    background-color: var(--p-slate-100);
    border-radius: var(--p-card-border-radius) var(--p-card-border-radius) 0 0;
    gap: 6px;
    padding: calc(var(--p-card-body-padding) * 0.66) var(--p-card-body-padding);
    border-bottom: 1px solid #f0f0f0;

    .title {
        line-height: 1.6;
        font-size: 18px;
        font-weight: 600;
    }

    .link {
        margin-left: auto;
        padding: 6px 8px;
        border-radius: var(--e-border-radius);
        font-size: 15px;
        color: var(--p-text-muted-color);
        transition: background-color 0.2s ease;

        &:hover {
            background-color: var(--p-slate-300);
        }
    }
}

// 卡片内容
.card-table {
    display: flex;
    align-items: flex-start;
    gap: 24px;

    .info {
        flex: 1;
        min-width: 0;

        // 卡片信息表格
        .card-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 24px;
            padding-bottom: 1.5em;

            .field {
                display: flex;
                gap: 8px;
                font-size: 15px;
                line-height: 1.8;

                label {
                    flex-shrink: 0;
                    width: 5em;
                    color: var(--p-text-muted-color);
                }

                i {
                    transform: translateY(25%); // 图标在每一项居中
                }
            }
        }

        // 申请状态
        .status {
            font-weight: 600;

            &.pending {
                color: var(--p-amber-600);
            }

            &.active {
                color: var(--p-emerald-600);
            }

            &.rejected {
                color: var(--p-red-600);
            }
        }

        // 简历&理由
        .card-block {
            padding: 6px 0 10px;

            .title {
                margin: 0 0 6px;
                font-size: 18px;
            }

            p {
                margin: 0;
                font-size: 15px;
                line-height: 1.8;
                white-space: pre-line;
            }
        }
    }

    .img {
        flex-shrink: 0;
        width: 160px;
        height: 180px;
        object-fit: cover;
        border-radius: var(--e-border-radius);
        border: 1px solid #eee;
    }
}

// 简历&理由
.card-block {
    margin: 0 0 16px;

    .title {
        margin: 0 0 6px;
        font-weight: 600;
    }

    p {
        margin: 0;
        font-size: 15px;
        line-height: 1.8;
        white-space: pre-line;
    }
}

.card-footer {
    padding-top: 12px;
    font-size: 13px;
    color: var(--p-text-muted-color);

    .grow {
        flex-grow: 1;
    }
}

@media screen and (max-width: 800px) {
    .card-grid {
        grid-template-columns: 1fr;
    }

    .card-body {
        flex-direction: column;
        align-items: center;
    }
}
</style>

<style lang="less">
.apply-tag {
    padding: 5px 8px !important;
    border-radius: 14px !important;
}

.apply-tooltip {
    padding: 6px 8px;
    font-size: 14px;
    line-height: 1.6;
}
</style>
