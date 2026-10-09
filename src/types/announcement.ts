/** 公告列表条目（不含正文内容） */
export interface AnnouncementItem {
    announcement_id: number
    title: string
    content: string
    /** 已发布为 true，草稿为 false */
    is_active: boolean
    department_name: string
    publisher_id: number
    publisher_name: string
    publisher_role: string
    published_at?: string | null
    created_at: string
    updated_at: string
}

/** 公告列表查询参数，/announcement/list */
export interface AnnouncementListParams {
    /** active / history / draft，缺省为全部 */
    status?: string
}

/** 创建公告请求体，/announcement/create */
export interface AnnouncementCreateData {
    department_id: number
    title: string
    content: string
}

/** 修改公告请求体，/announcement/update */
export interface AnnouncementUpdateData {
    announcement_id: number
    title: string
    content: string
}
