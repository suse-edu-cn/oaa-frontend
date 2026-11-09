/** 应用声明的单个授权范围 /oauth/client/public */
export interface OAuthClientScope {
    key: string
    title: string
    description: string
}

/** 第三方应用公开信息 /oauth/client/public */
export interface OAuthClientPublic {
    client_id: string
    client_name: string
    scopes: OAuthClientScope[]
}
