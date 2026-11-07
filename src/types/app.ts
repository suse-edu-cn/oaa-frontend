/** 应用条目 /app/list，/app/detail */
export interface AppItem {
    client_id: string
    mask_secret: string
    name: string
    redirect_uris: string
    scope: string
    is_active: boolean
    created_at: string
    updated_at: string
}

/** 创建应用请求体 /app/create */
export interface AppCreateData {
    client_id: string
    name: string
    redirect_uris: string
    scope: string
}

/** 创建应用响应体 /app/create */
export interface AppCreateResult {
    client_id: string
    client_secret: string
    name: string
}

/** 修改应用请求体 /app/update */
export interface AppUpdateData {
    client_id: string
    name: string
    redirect_uris: string
    scope: string
    is_active: boolean
}
