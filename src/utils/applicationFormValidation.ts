import { z } from 'zod'

import { fromDate } from './date'

/** 申请表单中参与校验的字段 */
export interface ApplicationFormValues {
    termId: number | null
    college: string
    major_class: string
    gender: string
    phone: string
    qq: string
    political_status: string
    birth_date: string
    avatar: string
    firstDept: number | null
    firstRole: number | null
    secondDept: number | null
    secondRole: number | null
    allow_adjust: boolean
    resume: string
    reason: string
}

export interface ApplicationFormValidationOptions {
    /** 活动周期仅展示时不校验 termId，避免后端数据缺失导致无法提交 */
    termDisabled?: boolean
}

/**
 * 文本字段长度上限
 * 与后端相关字段对齐，ref: https://github.com/suse-edu-cn/SUSE-OAA-BACKEND/blob/main/internal/model/term.go
 */
export const APPLICATION_FIELD_LIMITS = {
    college: 64,
    major_class: 64,
    political_status: 32,
    resume: 5000,
    reason: 5000,
} as const

const LIMIT = APPLICATION_FIELD_LIMITS

const applicationSchema = z.object({
    college: z
        .string()
        .trim()
        .min(1, { message: '请填写学院' })
        .max(LIMIT.college, { message: `学院不得超过 ${LIMIT.college} 个字符` }),
    major_class: z
        .string()
        .trim()
        .min(1, { message: '请填写班级' })
        .max(LIMIT.major_class, { message: `班级不得超过 ${LIMIT.major_class} 个字符` }),
    gender: z.string().min(1, { message: '请选择性别' }),
    phone: z
        .string()
        .trim()
        .regex(/^1\d{10}$/, { message: '请填写有效的手机号' }),
    qq: z
        .string()
        .trim()
        .regex(/^\d{5,10}$/, { message: '请填写有效的 QQ 号' }),
    political_status: z
        .string()
        .trim()
        .min(1, { message: '请填写政治面貌' })
        .max(LIMIT.political_status, { message: `政治面貌不得超过 ${LIMIT.political_status} 个字符` }),
    birth_date: z
        .string()
        .min(10, { message: '请选择出生日期' })
        .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), {
            message: '请选择有效的出生日期',
        })
        .refine((value) => value <= fromDate(new Date()), { message: '出生日期不能晚于今天' }),
    avatar: z.string().min(1, { message: '请上传头像' }),
    resume: z
        .string()
        .trim()
        .min(1, { message: '请填写简历' })
        .max(LIMIT.resume, { message: `简历不得超过 ${LIMIT.resume} 个字符` }),
    reason: z
        .string()
        .trim()
        .min(1, { message: '请填写申请理由' })
        .max(LIMIT.reason, { message: `申请理由不得超过 ${LIMIT.reason} 个字符` }),
})

/**
 * 汇总申请表单的字段错误
 */
export function getApplicationFormErrors(
    values: ApplicationFormValues,
    options: ApplicationFormValidationOptions = {}
): Record<string, string> {
    const result: Record<string, string> = {}

    // 申请周期必须选择
    if (!options.termDisabled && !values.termId) result.termId = '请选择申请周期'
    // 志愿的部门与职位需成对填写
    if (!values.firstDept) result.firstDept = '请选择第一志愿的部门'
    if (!values.firstRole) result.firstRole = '请选择第一志愿的职位'
    if (!values.secondDept) result.secondDept = '请选择第二志愿的部门'
    if (!values.secondRole) result.secondRole = '请选择第二志愿的职位'

    // 其余字段与申请请求体一一对应
    const parsed = applicationSchema.safeParse(values)
    if (!parsed.success) {
        for (const issue of parsed.error.issues) {
            const field = String(issue.path[0])
            if (!result[field]) result[field] = issue.message
        }
    }

    return result
}
