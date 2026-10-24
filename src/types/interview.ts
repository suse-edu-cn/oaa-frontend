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
