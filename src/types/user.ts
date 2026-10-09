import type { UploadResponse } from './api'

/** 当前用户信息 /user/me */
export interface UserInfo {
    user_id: number
    student_id: string
    username: string
    name: string
    avatar: UploadResponse
    email: string
    department: string
    role: string
    role_level: number
}

/** 用户列表 /user/list */
export interface UserListData {
    total: number
    list: UserInfo[]
}

/** 批量修改用户 /user/batch */
export interface UserBatchErrorItem {
    name: string
    error_message: string
}

/** 批量修改用户的单条请求数据，/user/batch */
export interface UserBatchUpdateItem {
    user_id: number
    department_id: number
    role_id: number
}

/** 用户列表查询参数，/user/list */
export interface UserListParams {
    /** 是否返回全部用户，与 department_id 二选一 */
    is_all?: boolean
    department_id?: number
}

/** 修改当前用户信息请求体，/user/me/update */
export interface UserUpdateData {
    username: string
    email: string
    avatar: string
}
