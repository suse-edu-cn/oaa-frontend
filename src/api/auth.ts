import request from '@/utils/request'
import type {
    ApiResponse,
    ApiResult,
    ChangePasswordData,
    LoginData,
    LoginResult,
    RegisterData,
    ResetPasswordData,
    SendCodeData,
} from '@/types'

// 登录 /auth/login
export function login(data: LoginData): Promise<ApiResult<LoginResult>> {
    return request<ApiResponse<LoginResult>>({
        url: '/auth/login',
        method: 'POST',
        data,
    })
}

// 登出 /auth/logout
export function logout(): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/auth/logout',
        method: 'POST',
        data: { device: 'web' },
    })
}

// 注册 /auth/register
export function register(data: RegisterData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/auth/register',
        method: 'POST',
        data,
    })
}

// 发送验证码 /auth/send
export function sendVerificationCode(data: SendCodeData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/auth/send',
        method: 'POST',
        data,
    })
}

// 重置密码 /auth/password/reset
export function resetPassword(data: ResetPasswordData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/auth/password/reset',
        method: 'POST',
        data,
    })
}

// 修改密码 /auth/password/update
export function changePassword(data: ChangePasswordData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/auth/password/update',
        method: 'POST',
        data,
    })
}
