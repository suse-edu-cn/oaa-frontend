import type { OrgRef } from './application'

/** 面试官列表条目 */
export interface InterviewStaffItem {
    id: number
    year: number
    /** 周期类型，招新 or 换届 */
    term_type: string
    name: string
    role: string
    department_name: string
    remark: string
}

/** 面试审核条目 /apply/review */
export interface InterviewResultItem {
    id: number
    term_id: number
    application_id: number
    /** 招新 / 换届 */
    type: string
    user_id: number
    name: string
    /** 待定 / 已调剂 / 录取第一志愿 / 录取第二志愿 / 未通过 */
    decision: string
    result_department_id: number
    result_role_id: number
    /** 审核前的原结果，0 表示无 */
    old: OrgRef
    executed_at: string | null
    operator_user_id: number
    operator_name: string
    remark: string
    created_at: string
    updated_at: string
}

/** 新建面试官请求体，/interviewer/create */
export interface InterviewStaffCreateData {
    term_id: number
    interviewers: {
        user_id: number
        remark: string
    }[]
}

/** 修改面试官请求体，/interviewer/update */
export interface InterviewStaffUpdateData {
    interviewer_id: number
    remark: string
}

/** 提交 / 修改审核结果请求体，/interviewer/result/create、/interviewer/result/update */
export interface InterviewResultSubmitData {
    application_id: number
    decision: string
    remark: string
    result_department_id?: number | null
    result_role_id?: number | null
}
