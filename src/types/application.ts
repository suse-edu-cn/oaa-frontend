import type { UploadResponse } from './api'

/** 部门与职位引用 */
export interface OrgRef {
    department_id: number
    role_id: number
}

/** 招新 / 换届申请条目 /apply */
export interface ApplicationItem {
    id: number
    term_id: number
    term_title: string
    /** 招新 / 换届 */
    type: string
    user_id: number
    name: string
    gender: string
    avatar: UploadResponse
    student_id: string
    college: string
    major_class: string
    political_status: string
    birth_date: string
    qq: string
    phone: string
    first_choice: OrgRef
    second_choice: OrgRef
    /** 是否服从调剂 */
    allow_adjust: boolean
    resume: string
    reason: string
    /** 待定 / 已调剂 / 录取第一志愿 / 录取第二志愿 / 未通过 */
    decision: string
    result: OrgRef
    operator_user_id: number
    decision_remark: string
    created_at: string
    updated_at: string
}

/** 创建申请请求体 /apply/new */
export interface ApplicationCreateData {
    /** 申请的活动周期 */
    term_id: number
    college: string
    major_class: string
    gender: string
    phone: string
    qq: string
    political_status: string
    birth_date: string
    /** 相对路径，前端传给后端用 uri */
    avatar: string
    first_choice: OrgRef
    second_choice: OrgRef
    /** 是否服从调剂 */
    allow_adjust: boolean
    resume: string
    reason: string
}

/** 修改申请请求体 /apply/edit/{id} */
export interface ApplicationUpdateData extends Omit<ApplicationCreateData, 'term_id'> {
    /** 待修改的申请 id */
    application_id: number
}
