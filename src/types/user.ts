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
