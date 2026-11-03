/**
 * 后端统一响应包装
 */
export interface ApiResponse<T = any> {
    code: number
    message: string
    data: T
}

export interface UploadResponse {
    uri: string
    url: string
}

/** request 的统一返回：网络 / 超时失败时为 undefined，业务失败仍带 code */
export type ApiResult<T> = ApiResponse<T> | undefined

/** 下载类请求的返回：成功为文件内容，失败为后端 JSON 响应体 */
export type ApiDownloadResult = Blob | ApiResponse<unknown> | undefined
