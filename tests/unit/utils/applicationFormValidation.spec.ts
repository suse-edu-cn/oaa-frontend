import { describe, expect, it } from 'vitest'

import {
    APPLICATION_FIELD_LIMITS,
    getApplicationFormErrors,
    type ApplicationFormValues,
} from '@/utils/applicationFormValidation'

function makeValues(overrides: Partial<ApplicationFormValues> = {}): ApplicationFormValues {
    return {
        termId: 1,
        college: '计算机学院',
        major_class: '计科241',
        gender: '男',
        phone: '13800138000',
        qq: '123456',
        political_status: '共青团员',
        birth_date: '2006-01-05',
        avatar: 'oss://avatar.png',
        firstDept: 1,
        firstRole: 11,
        secondDept: 2,
        secondRole: 12,
        allow_adjust: true,
        resume: '个人简历',
        reason: '申请理由',
        ...overrides,
    }
}

const EMPTY_VALUES: ApplicationFormValues = {
    termId: null,
    college: '',
    major_class: '',
    gender: '',
    phone: '',
    qq: '',
    political_status: '',
    birth_date: '',
    avatar: '',
    firstDept: null,
    firstRole: null,
    secondDept: null,
    secondRole: null,
    allow_adjust: false,
    resume: '',
    reason: '',
}

describe('utils/applicationFormValidation', () => {
    it('全空时返回所有必填字段的中文提示', () => {
        expect(getApplicationFormErrors(EMPTY_VALUES)).toEqual({
            termId: '请选择申请周期',
            firstDept: '请选择第一志愿的部门',
            firstRole: '请选择第一志愿的职位',
            secondDept: '请选择第二志愿的部门',
            secondRole: '请选择第二志愿的职位',
            college: '请填写学院',
            major_class: '请填写班级',
            gender: '请选择性别',
            phone: '请填写有效的手机号',
            qq: '请填写有效的 QQ 号',
            political_status: '请填写政治面貌',
            birth_date: '请选择出生日期',
            avatar: '请上传头像',
            resume: '请填写简历',
            reason: '请填写申请理由',
        })
    })

    it.each(['1380013800', '138001380000', '23800138000', '1380013800a'])('手机号 %s 不合法', (phone) => {
        expect(getApplicationFormErrors(makeValues({ phone })).phone).toBe('请填写有效的手机号')
    })

    it('手机号 11 位且以 1 开头时通过', () => {
        expect(getApplicationFormErrors(makeValues({ phone: '19912345678' })).phone).toBeUndefined()
    })

    it.each(['1234', '12345678901', '12345a'])('QQ %s 不合法', (qq) => {
        expect(getApplicationFormErrors(makeValues({ qq })).qq).toBe('请填写有效的 QQ 号')
    })

    it('QQ 5 位和 10 位都通过', () => {
        expect(getApplicationFormErrors(makeValues({ qq: '12345' })).qq).toBeUndefined()
        expect(getApplicationFormErrors(makeValues({ qq: '1234567890' })).qq).toBeUndefined()
    })

    it('出生日期为空时提示', () => {
        expect(getApplicationFormErrors(makeValues({ birth_date: '' })).birth_date).toBe('请选择出生日期')
    })

    it('termDisabled 时不校验申请周期', () => {
        const errors = getApplicationFormErrors(makeValues({ termId: null }), { termDisabled: true })

        expect(errors.termId).toBeUndefined()
        expect(errors).toEqual({})
    })

    it('志愿只填部门不填职位时只报职位缺失', () => {
        const errors = getApplicationFormErrors(makeValues({ firstRole: null }))

        expect(errors).toEqual({ firstRole: '请选择第一志愿的职位' })
    })

    it('两个志愿允许相同', () => {
        const errors = getApplicationFormErrors(makeValues({ secondDept: 1, secondRole: 11 }))

        expect(errors).toEqual({})
    })

    it('全部合法时返回空对象', () => {
        expect(getApplicationFormErrors(makeValues())).toEqual({})
    })

    it('只有空白的文本字段按未填写处理', () => {
        const errors = getApplicationFormErrors(
            makeValues({ college: '   ', major_class: ' ', political_status: '\t', resume: '\n', reason: '   ' })
        )

        expect(errors).toEqual({
            college: '请填写学院',
            major_class: '请填写班级',
            political_status: '请填写政治面貌',
            resume: '请填写简历',
            reason: '请填写申请理由',
        })
    })

    it('手机号与 QQ 允许首尾空白', () => {
        const errors = getApplicationFormErrors(makeValues({ phone: ' 13800138000 ', qq: ' 123456 ' }))

        expect(errors.phone).toBeUndefined()
        expect(errors.qq).toBeUndefined()
    })

    it('长度等于上限时通过', () => {
        const errors = getApplicationFormErrors(
            makeValues({
                college: 'x'.repeat(APPLICATION_FIELD_LIMITS.college),
                major_class: 'x'.repeat(APPLICATION_FIELD_LIMITS.major_class),
                political_status: 'x'.repeat(APPLICATION_FIELD_LIMITS.political_status),
                resume: 'x'.repeat(APPLICATION_FIELD_LIMITS.resume),
                reason: 'x'.repeat(APPLICATION_FIELD_LIMITS.reason),
            })
        )

        expect(errors).toEqual({})
    })

    it('长度超出上限时提示，上限与后端列宽一致', () => {
        const errors = getApplicationFormErrors(
            makeValues({
                college: 'x'.repeat(APPLICATION_FIELD_LIMITS.college + 1),
                major_class: 'x'.repeat(APPLICATION_FIELD_LIMITS.major_class + 1),
                political_status: 'x'.repeat(APPLICATION_FIELD_LIMITS.political_status + 1),
                resume: 'x'.repeat(APPLICATION_FIELD_LIMITS.resume + 1),
                reason: 'x'.repeat(APPLICATION_FIELD_LIMITS.reason + 1),
            })
        )

        expect(errors).toEqual({
            college: '学院不得超过 64 个字符',
            major_class: '班级不得超过 64 个字符',
            political_status: '政治面貌不得超过 32 个字符',
            resume: '简历不得超过 5000 个字符',
            reason: '申请理由不得超过 5000 个字符',
        })
    })
})
