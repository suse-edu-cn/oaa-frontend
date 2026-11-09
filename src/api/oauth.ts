import request from '@/utils/request'
import type { ApiResponse, ApiResult, OAuthClientPublic } from '@/types'

// 第三方应用公开信息 /oauth/client/public
export function getOAuthClientPublic(clientId: string): Promise<ApiResult<OAuthClientPublic>> {
    return request<ApiResponse<OAuthClientPublic>>({
        url: '/oauth/client/public',
        method: 'GET',
        params: { client_id: clientId },
    })
}
