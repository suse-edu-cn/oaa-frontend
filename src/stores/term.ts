import { ref } from 'vue'
import { defineStore } from 'pinia'

import { getTermList } from '@/api/term'
import { toastApiError } from '@/utils/apiError'
import type { TermInfo } from '@/types'

/**
 * 活动周期引用数据
 *
 * 周期列表在多个页面 / 组件中使用
 * 周期增删改后由调用方执行 refresh()，避免各页面各自拉取数据
 */
export const useTermStore = defineStore('term', () => {
    const terms = ref<TermInfo[]>([])
    const loaded = ref(false)
    const loading = ref(false)
    // 并发调用共享请求
    let inflight: Promise<boolean> | null = null

    async function fetchTerms(): Promise<boolean> {
        loading.value = true
        try {
            const resp = await getTermList()
            if (resp?.code == 200) {
                terms.value = resp.data ?? []
                loaded.value = true
                return true
            }
            toastApiError('获取活动周期列表失败', resp)
            loaded.value = false
            return false
        } finally {
            loading.value = false
        }
    }

    function run(force: boolean): Promise<boolean> {
        if (!force && loaded.value) return Promise.resolve(true)
        if (!inflight) {
            inflight = fetchTerms().finally(() => {
                inflight = null
            })
        }
        return inflight
    }

    function ensureLoaded(): Promise<boolean> {
        return run(false)
    }

    function refresh(): Promise<boolean> {
        return run(true)
    }

    return { terms, loaded, loading, ensureLoaded, refresh }
})
