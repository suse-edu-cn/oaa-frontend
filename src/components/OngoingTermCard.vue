<!-- 进行中的活动周期卡片，可自行加载并判定当前周期 -->
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'

import { fromDate } from '@/utils/date'
import request from '@/utils/request'
import setToast from '@/utils/setToast'
import type { ApiResponse, TermInfo, TermPeriod } from '@/types'

const terms = ref<TermInfo[]>([])
const loading = ref(true)

// 加载周期列表
async function loadTerms() {
    const resp = await request<ApiResponse<TermInfo[]>>({
        url: '/term/list',
        method: 'GET',
    })
    loading.value = false

    if (resp?.code == 200) {
        terms.value = resp.data ?? []
    } else {
        setToast('error', '获取活动周期列表失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

// 判断现在是否在进行中的活动周期内
const term = computed<TermInfo | null>(() => {
    const t = terms.value[0]
    if (!t) return null
    const today = fromDate(new Date())
    // 进行中条件：当前日期 >= 申请提交期开始 && 当前日期 <= 面试审核期结束
    return today >= t.edit_period.start_at && today <= t.query_period.end_at ? t : null
})

// 获取当前活动阶段
const phase = computed(() => {
    const t = term.value
    if (!t) return ''
    const today = fromDate(new Date())
    if (today <= t.edit_period.end_at) return '申请提交期'
    if (today >= t.query_period.start_at) return '面试审核期'
    return '两期之间'
})

function formatPeriod(p: TermPeriod) {
    return p.start_at + ' ~ ' + p.end_at
}

onMounted(() => {
    loadTerms()
})
</script>

<template>
    <div class="ongoing-card" :class="{ active: term }">
        <template v-if="term">
            <div class="head">进行中的活动周期</div>
            <div class="title">
                <span>{{ term.title }}</span>
                <span class="tag">{{ phase }}</span>
            </div>
            <div class="detail">
                <div>类型：{{ term.type }} ({{ term.year }})</div>
                <div>申请提交日期：{{ formatPeriod(term.edit_period) }}</div>
                <div>面试审核日期：{{ formatPeriod(term.query_period) }}</div>
            </div>
        </template>
        <template v-else-if="!loading">
            <div class="head empty">进行中的活动周期</div>
            <div class="title empty">当前暂无招新 / 换届活动</div>
        </template>
        <!-- 加载中仅展示标题，避免空态闪现 -->
        <div v-else class="head">进行中的活动周期</div>
    </div>
</template>

<style lang="less" scoped>
.ongoing-card {
    margin-bottom: 20px;
    background-color: var(--p-slate-100);
    padding: 14px 20px;
    border-radius: var(--p-button-border-radius);
    line-height: 1.5;

    &.active {
        background-color: var(--p-emerald-50);
    }

    .head {
        color: var(--p-emerald-600);
    }

    .title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 20px;
        font-weight: 600;
        line-height: 2.25;

        .tag {
            display: inline-block;
            line-height: 2;
            font-size: 13px;
            color: #fff;
            background-color: var(--p-emerald-500);
            padding: 0 0.75em;
            border-radius: 14px;
        }
    }

    .detail {
        font-size: 14px;
        line-height: 1.8;
        color: var(--p-text-muted-color);
    }

    .empty {
        color: var(--p-text-muted-color);
    }
}
</style>
