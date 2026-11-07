import request from '@/utils/request'
import type { ApiResponse, ApiResult, AppCreateData, AppCreateResult, AppItem, AppUpdateData } from '@/types'

// 创建应用 /app/create
export function createApp(data: AppCreateData): Promise<ApiResult<AppCreateResult>> {
    return request<ApiResponse<AppCreateResult>>({
        url: '/app/create',
        method: 'POST',
        data,
    })
}

// 应用列表 /app/list
export function getAppList(): Promise<ApiResult<AppItem[]>> {
    return request<ApiResponse<AppItem[]>>({
        url: '/app/list',
        method: 'GET',
    })
}

// 应用详情 /app/detail
export function getAppDetail(clientId: string): Promise<ApiResult<AppItem>> {
    return request<ApiResponse<AppItem>>({
        url: '/app/detail',
        method: 'GET',
        params: { client_id: clientId },
    })
}

// 修改应用 /app/update
export function updateApp(data: AppUpdateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/app/update',
        method: 'POST',
        data,
    })
}

// 删除应用 /app/delete
export function deleteApp(clientId: string): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/app/delete',
        method: 'POST',
        data: { client_id: clientId },
    })
}
