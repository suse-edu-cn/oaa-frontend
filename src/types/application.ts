import type { ImageResponse } from './api'

/** 部门 / 职位引用，用于志愿与最终结果 */
export interface OrgRef {
    department_id: number
    role_id: number
}

/** 招新 / 换届申请条目 */
export interface ApplicationItem {
    id: number
    term_id: number
    term_title: string
    /** 招新 / 换届 */
    type: string
    user_id: number
    name: string
    gender: string
    avatar: ImageResponse
    student_id: string
    college: string
    major_class: string
    political_status: string
    /** 格式 YYYY-MM */
    birth_date: string
    qq: string
    phone: string
    first_choice: OrgRef
    second_choice: OrgRef
    /** 是否服从调剂 */
    allow_adjust: boolean
    resume: string
    reason: string
    /** 待定 / 通过 / 拒绝 */
    decision: string
    result: OrgRef
    /** 未处理时为 0 */
    operator_user_id: number
    decision_remark: string
    created_at: string
    updated_at: string
}
