import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/term', () => ({ getTermList: vi.fn() }))

import { getTermList } from '@/api/term'
import ApplicationCard from '@/components/ApplicationCard.vue'
import { useTermStore } from '@/stores/term'
import { makeTerm } from '../helpers/factories'
import { mountWithPrimeVue } from '../helpers/mount'
import { primevueStubs } from '../helpers/primevueStubs'
import type { ApplicationItem, TermInfo } from '@/types'

const termListMock = vi.mocked(getTermList)

function makeApplication(overrides: Partial<ApplicationItem> = {}): ApplicationItem {
    return {
        id: 1,
        term_id: 7,
        term_title: '2026 秋季招新',
        type: '招新',
        user_id: 1,
        name: '测试申请人',
        gender: '男',
        avatar: { uri: '', url: '' },
        student_id: '20260001',
        college: '计算机学院',
        major_class: '计科241',
        political_status: '共青团员',
        birth_date: '2006-01-05',
        qq: '123456789',
        phone: '13800138000',
        first_choice: { department_id: 1, role_id: 1 },
        second_choice: { department_id: 2, role_id: 2 },
        allow_adjust: true,
        resume: '',
        reason: '',
        decision: '待定',
        result: { department_id: 0, role_id: 0 },
        operator_user_id: 0,
        decision_remark: '',
        created_at: '2026-09-10T10:00:00+08:00',
        updated_at: '2026-09-10T10:00:00+08:00',
        ...overrides,
    }
}

async function mountCard(application: ApplicationItem, terms: TermInfo[]) {
    const pinia = createPinia()
    setActivePinia(pinia)
    // 组件只读 store 里的 isInTerm，这里按真实加载流程先算好状态
    termListMock.mockResolvedValue({ code: 200, message: 'ok', data: terms })
    await useTermStore().ensureLoaded()

    return mountWithPrimeVue(ApplicationCard, {
        props: { application, reviewMode: true },
        global: {
            plugins: [pinia],
            // 卡片模板里的 router-link / v-tooltip 在审核模式下不渲染，但仍需注册以消除告警
            stubs: { ...primevueStubs, 'router-link': true },
            directives: { tooltip: () => {} },
        },
    })
}

function buttonLabels(wrapper: Awaited<ReturnType<typeof mountCard>>) {
    return wrapper.findAll('button').map((button) => button.text())
}

describe('components/ApplicationCard', () => {
    beforeEach(() => {
        // 固定为 2026-09-10，位于默认周期（2026-08 ~ 2026-09）的面试审核期内
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-09-10T12:00:00+08:00'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('周期内已审核申请显示修改审核', async () => {
        const wrapper = await mountCard(makeApplication({ decision: '录取第一志愿' }), [makeTerm()])

        expect(buttonLabels(wrapper)).toEqual(['修改审核'])
    })

    it('不在任何周期内时已审核申请不显示修改审核', async () => {
        const wrapper = await mountCard(makeApplication({ decision: '录取第一志愿', operator_user_id: 2 }), [])

        expect(buttonLabels(wrapper)).toEqual([])
        expect(wrapper.text()).not.toContain('修改审核')
    })

    it('周期已结束时已审核申请不显示修改审核', async () => {
        const endedTerm = makeTerm({
            edit_period: { start_at: '2026-03-01', end_at: '2026-03-31' },
            query_period: { start_at: '2026-04-01', end_at: '2026-04-30' },
        })
        const wrapper = await mountCard(makeApplication({ decision: '未通过' }), [endedTerm])

        expect(buttonLabels(wrapper)).toEqual([])
    })

    it('不在任何周期内时待定申请仍显示审核申请', async () => {
        const wrapper = await mountCard(makeApplication({ decision: '待定' }), [])

        expect(buttonLabels(wrapper)).toEqual(['审核申请'])
    })
})
