import request from '@/utils/request'
import type {
    ApiResponse,
    ApiResult,
    UserBatchErrorItem,
    UserBatchUpdateItem,
    UserInfo,
    UserListData,
    UserListParams,
    UserUpdateData,
} from '@/types'

// 当前用户信息 /user/me
export function getCurrentUser(): Promise<ApiResult<UserInfo>> {
    return request<ApiResponse<UserInfo>>({
        url: '/user/me',
        method: 'GET',
    })
}

// 修改当前用户信息 /user/me/update
export function updateCurrentUser(data: UserUpdateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/user/me/update',
        method: 'POST',
        data,
    })
}

// 用户列表 /user/list
export function getUserList(params: UserListParams): Promise<ApiResult<UserListData>> {
    return request<ApiResponse<UserListData>>({
        url: '/user/list',
        method: 'GET',
        params,
    })
}

// 删除用户 /user/delete
export function deleteUser(userId: number): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/user/delete',
        method: 'POST',
        data: { user_id: userId },
    })
}

// 批量修改用户部门 / 职位 /user/batch
export function batchUpdateUsers(items: UserBatchUpdateItem[]): Promise<ApiResult<UserBatchErrorItem[] | null>> {
    return request<ApiResponse<UserBatchErrorItem[] | null>>({
        url: '/user/batch',
        method: 'POST',
        data: items,
    })
}
