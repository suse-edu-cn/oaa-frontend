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

/** 申请表单预填数据，编辑页由申请数据构造，创建页留空 */
export interface ApplicationFormPrefill {
    /** 姓名、学号仅展示不可编辑 */
    name?: string
    student_id?: string
    termId?: number | null
    college?: string
    major_class?: string
    gender?: string
    phone?: string
    qq?: string
    political_status?: string
    birth_date?: string
    /** 头像相对路径与展示地址 */
    avatar?: string
    avatar_url?: string
    firstDept?: number | null
    firstRole?: number | null
    secondDept?: number | null
    secondRole?: number | null
    allow_adjust?: boolean
    resume?: string
    reason?: string
}

/** 申请表单提交的数据，不含周期；创建页补 term_id，编辑页补 application_id */
export type ApplicationFormData = Omit<ApplicationCreateData, 'term_id'>

/** 修改申请请求体 /apply/edit/{id} */
export interface ApplicationUpdateData extends Omit<ApplicationCreateData, 'term_id'> {
    /** 待修改的申请 id */
    application_id: number
}
