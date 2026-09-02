/** 周期起止日期，格式 YYYY-MM-DD */
export interface TermPeriod {
    start_at: string
    end_at: string
}

/** 招新 / 换届周期，/term/list。注：响应条目主键为 id，而修改 / 删除请求体中使用 term_id */
export interface TermInfo {
    id: number
    year: number
    type: string
    title: string
    edit_period: TermPeriod
    query_period: TermPeriod
    is_executed: boolean
    /** 计划执行时间，ISO 8601 */
    execute_after_at: string | null
    /** 未执行时为 null */
    executed_at: string | null
    created_at: string
    updated_at: string
}

/** 创建周期请求体 */
export interface TermCreateData {
    year: number
    type: string
    title: string
    edit_period: TermPeriod
    query_period: TermPeriod
}

/** 修改周期请求体（年份 / 类型不可改） */
export interface TermUpdateData {
    term_id: number
    title: string
    edit_period: TermPeriod
    query_period: TermPeriod
}
