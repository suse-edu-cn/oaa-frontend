function base64Url(value: string): string {
    return btoa(value).replaceAll('+', '-').replaceAll('/', '_')
}

/** 构造只需 payload 的假 JWT */
export function makeJwt(payload: Record<string, unknown>): string {
    const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    const body = base64Url(JSON.stringify(payload))
    return `${header}.${body}.signature`
}

export function makeJwtWithExp(exp: number): string {
    return makeJwt({ exp })
}
