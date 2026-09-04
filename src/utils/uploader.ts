import request from './request'
import setToast from './setToast'
import type { ApiResponse, UploadResponse } from '@/types/api'

// 图片内置校验规则，不允许调用方覆盖
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
const IMAGE_MAX_MB = 4

/**
 * 上传公共实现：校验 -> POST FormData -> 提取 uri / url，失败时返回 null
 */
async function upload(
    file: File,
    scene: string,
    url: string,
    maxMB: number,
    label: string,
    allowedTypes?: string[]
): Promise<UploadResponse | null> {
    if (allowedTypes && !allowedTypes.includes(file.type)) {
        setToast('warn', '格式错误', '请选择符合要求的' + label)
        return null
    }
    if (file.size > maxMB * 1024 * 1024) {
        setToast('warn', '文件过大', '文件大小不得超过 ' + maxMB + 'MB')
        return null
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('scene', scene)

    try {
        const resp = await request<ApiResponse<UploadResponse>>({
            url,
            method: 'POST',
            data: formData,
        })
        if (resp.code == 200) {
            return { uri: resp.data.uri || '', url: resp.data.url || '' }
        }
        setToast('error', '上传失败', resp.message)
        return null
    } catch (err: any) {
        setToast('error', '上传失败', err.response?.data?.message || '未知错误，请联系负责后端的同学')
        return null
    }
}

/**
 * 图片上传，仅支持常见图片格式，限 4MB
 *
 * @param file 待上传的图片文件
 * @param scene 上传场景，后端用于区分不同用途的图片
 * @returns 上传成功返回 { uri, url }，失败返回 null
 */
export function uploadImage(file: File, scene: string): Promise<UploadResponse | null> {
    return upload(file, scene, '/upload/image', IMAGE_MAX_MB, '图片', IMAGE_TYPES)
}

/**
 * 通用文件上传，默认限 100MB、不限制类型
 *
 * @param file 待上传的文件
 * @param scene 上传场景，后端用于区分不同用途的图片
 * @param maxMB 大小限制，单位 MB，默认 100
 * @param allowedTypes MIME 白名单，默认为不限制
 * @returns 上传成功返回 { uri, url }，失败返回 null
 */
export function uploadFile(
    file: File,
    scene: string,
    maxMB = 100,
    allowedTypes?: string[]
): Promise<UploadResponse | null> {
    return upload(file, scene, '/upload/file', maxMB, '文件', allowedTypes)
}
