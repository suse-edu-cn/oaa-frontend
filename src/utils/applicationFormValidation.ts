import { z } from 'zod'

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

const applicationSchema = z.object({
    college: z.string().min(1, { message: '请填写学院' }),
    major_class: z.string().min(1, { message: '请填写班级' }),
    gender: z.string().min(1, { message: '请选择性别' }),
    phone: z.string().regex(/^1\d{10}$/, { message: '请填写有效的手机号' }),
    qq: z.string().regex(/^\d{5,10}$/, { message: '请填写有效的 QQ 号' }),
    political_status: z.string().min(1, { message: '请填写政治面貌' }),
    birth_date: z.string().min(10, { message: '请选择出生日期' }),
    avatar: z.string().min(1, { message: '请上传头像' }),
    resume: z.string().min(1, { message: '请填写简历' }),
    reason: z.string().min(1, { message: '请填写申请理由' }),
})

/**
 * 汇总申请表单的字段错误，每个字段只保留第一条提示
 */
export function getApplicationFormErrors(
    values: ApplicationFormValues,
    options: ApplicationFormValidationOptions = {}
): Record<string, string> {
    const result: Record<string, string> = {}

    // 申请周期必须选择（仅展示时不校验）
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
