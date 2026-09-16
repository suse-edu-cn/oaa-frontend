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
