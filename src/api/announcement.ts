import request from '@/utils/request'
import type {
    AnnouncementCreateData,
    AnnouncementItem,
    AnnouncementListParams,
    AnnouncementUpdateData,
    ApiResponse,
    ApiResult,
} from '@/types'

// 公告列表 /announcement/list
export function getAnnouncementList(params: AnnouncementListParams = {}): Promise<ApiResult<AnnouncementItem[]>> {
    return request<ApiResponse<AnnouncementItem[]>>({
        url: '/announcement/list',
        method: 'GET',
        params,
    })
}

// 公告详情 /announcement/get
export function getAnnouncement(announcementId: number | string): Promise<ApiResult<AnnouncementItem>> {
    return request<ApiResponse<AnnouncementItem>>({
        url: '/announcement/get',
        method: 'GET',
        params: { announcement_id: String(announcementId) },
    })
}

// 创建公告 /announcement/create
export function createAnnouncement(data: AnnouncementCreateData): Promise<ApiResult<{ announcement_id: number }>> {
    return request<ApiResponse<{ announcement_id: number }>>({
        url: '/announcement/create',
        method: 'POST',
        data,
    })
}

// 修改公告 /announcement/update
export function updateAnnouncement(data: AnnouncementUpdateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/announcement/update',
        method: 'POST',
        data,
    })
}

// 发布公告 /announcement/push
export function publishAnnouncement(announcementId: number): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/announcement/push',
        method: 'POST',
        data: { announcement_id: announcementId },
    })
}

// 删除公告 /announcement/delete
export function deleteAnnouncement(announcementId: number): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/announcement/delete',
        method: 'POST',
        data: { announcement_id: announcementId },
    })
}
