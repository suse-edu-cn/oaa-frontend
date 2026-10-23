/**
 * 登录请求体，/auth/login
 */
export interface LoginData {
    account: string
    password: string
    device: string
}

/**
 * 登录响应，/auth/login
 */
export interface LoginResult {
    token: string
    refresh_token: string
}

/**
 * 注册请求体，/auth/register
 */
export interface RegisterData {
    student_id: string
    grade: number
    username: string
    name: string
    email: string
    password: string
}

/**
 * 发送验证码请求体，/auth/send
 */
export interface SendCodeData {
    account: string
    /** 使用场景，重置密码为 reset_password */
    scene: string
}

/**
 * 重置密码请求体，/auth/password/reset
 */
export interface ResetPasswordData {
    account: string
    code: string
    password: string
}

/**
 * 修改密码请求体，/auth/password/update
 */
export interface ChangePasswordData {
    old_password: string
    new_password: string
}
