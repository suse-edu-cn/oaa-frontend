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
