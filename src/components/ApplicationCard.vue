<!-- 更新换届申请信息卡片 -->
<script lang="ts" setup>
import { Button, Card, Tag } from 'primevue'

import { useOrgStore } from '@/stores/org'
import type { ApplicationItem, OrgRef } from '@/types'

withDefaults(
    defineProps<{
        application: ApplicationItem
        /** 隐藏类型标签、修改入口和状态说明图标 */
        reviewMode?: boolean
    }>(),
    { reviewMode: false }
)

const emit = defineEmits<{
    preview: [url: string]
    /** 点击审批申请按钮 */
    review: [application: ApplicationItem]
}>()

const orgStore = useOrgStore()
const tooltip =
    '当前录取状态，“待定”意为当前录取工作尚未开始，请耐心等待。录取完成结果共有 4 种：录取第一志愿、录取第二志愿、已调剂、未通过。'

// 部门 or 职位 id 反查名称
function getOrgText(ref: OrgRef | null) {
    if (!ref || (!ref.department_id && !ref.role_id)) return '—'
    const dept = orgStore.departments.find((d) => d.id === ref.department_id)?.name
    const role = orgStore.roles.find((r) => r.id === ref.role_id)?.name
    return [dept ?? `部门 #${ref.department_id}`, role ?? `职位 #${ref.role_id}`].join(' ')
}
// 获取申请状态对应的样式
function getDecisionClass(decision: string) {
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

function formatTime(iso: string) {
    return iso ? iso.replace('T', ' ').slice(0, 16) : '—'
}
</script>

<template>
    <Card :style="{ marginBottom: '18px' }">
        <!-- 申请人 -->
        <template #header>
            <div class="card-header" v-if="reviewMode">
                <div class="title">
                    {{ application.name || '—' }}
                </div>
                <Tag
                    v-if="reviewMode"
                    :value="application.decision"
                    :class="['apply-tag', getDecisionClass(application.decision)]"
                />
            </div>
            <div class="card-header" v-if="!reviewMode">
                <div class="title">
                    {{ application.term_title || '—' }}
                </div>
                <Tag v-if="!reviewMode" class="apply-tag" :value="application.type" />
                <router-link v-if="!reviewMode" :to="'/apply/edit/' + application.id" class="link">
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
                        <div class="field" v-if="!reviewMode">
                            <label>姓名</label><span>{{ application.name || '—' }}</span>
                        </div>
                        <div class="field" v-if="!reviewMode">
                            <label>状态</label>
                            <span :class="['status', getDecisionClass(application.decision)]">
                                {{ application.decision || '—' }}
                            </span>
                            <i
                                v-if="!reviewMode"
                                class="pi pi-info-circle"
                                v-tooltip.top="{ value: tooltip, class: 'apply-tooltip' }"
                            ></i>
                        </div>
                        <div class="field">
                            <label>班级</label><span>{{ application.major_class || '—' }}</span>
                        </div>
                        <div class="field">
                            <label>学院</label><span>{{ application.college || '—' }}</span>
                        </div>
                        <div class="field">
                            <label>政治面貌</label><span>{{ application.political_status || '—' }}</span>
                        </div>
                        <div class="field">
                            <label>生日</label><span>{{ application.birth_date || '—' }}</span>
                        </div>
                        <div class="field">
                            <label>QQ</label><span>{{ application.qq || '—' }}</span>
                        </div>
                        <div class="field">
                            <label>手机号</label><span>{{ application.phone || '—' }}</span>
                        </div>
                    </div>

                    <!-- 志愿 -->
                    <div class="card-grid">
                        <div class="field">
                            <label>第一志愿</label><span>{{ getOrgText(application.first_choice) }}</span>
                        </div>
                        <div class="field">
                            <label>第二志愿</label><span>{{ getOrgText(application.second_choice) }}</span>
                        </div>
                        <div class="field">
                            <label>服从调剂</label><span>{{ application.allow_adjust ? '是' : '否' }}</span>
                        </div>
                        <div class="field">
                            <label>最终结果</label><span>{{ getOrgText(application.result) }}</span>
                        </div>
                    </div>
                </div>

                <img
                    v-if="application.avatar?.url"
                    :src="application.avatar.url"
                    alt="用户头像"
                    class="img"
                    @click="emit('preview', application.avatar.url)"
                />
            </div>

            <!-- 文字内容 -->
            <div class="card-block">
                <div class="title">简历</div>
                <p>{{ application.resume || '—' }}</p>
            </div>
            <div class="card-block">
                <div class="title">申请理由</div>
                <p>{{ application.reason || '—' }}</p>
            </div>
            <div class="card-block" v-if="application.decision_remark">
                <div class="title">审批备注</div>
                <p>{{ application.decision_remark }}</p>
            </div>
        </template>

        <template #footer>
            <!--  -->
            <div :class="['card-footer', reviewMode ? 'review' : '']">
                <div class="info">提交时间：{{ formatTime(application.created_at) }}</div>
                <Button v-if="reviewMode" label="审批申请" @click="emit('review', application)" />
            </div>
        </template>
    </Card>
</template>

<style lang="less" scoped>
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
    }

    .img {
        flex-shrink: 0;
        width: 160px;
        height: 180px;
        object-fit: cover;
        border-radius: var(--e-border-radius);
        border: 1px solid #eee;
        cursor: pointer;
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
    display: flex;
    justify-content: space-between;
    align-items: flex-end;

    &.review {
        margin-top: -14px;
    }

    .info {
        font-size: 14px;
        color: var(--p-text-muted-color);
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

// tooltip 挂载到 body 须为全局样式
.apply-tooltip {
    padding: 6px 8px;
    font-size: 14px;
    line-height: 1.6;
}

.apply-tag {
    &.pending {
        background-color: var(--p-amber-100);
        color: var(--p-amber-600);
    }

    &.active {
        background-color: var(--p-emerald-100);
        color: var(--p-emerald-600);
    }

    &.rejected {
        background-color: var(--p-red-100);
        color: var(--p-red-600);
    }
}
</style>
