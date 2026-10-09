/** 协会职位条目 */
export interface RoleItem {
    id: number
    name: string
    /** 权限等级，数值越大权限越高 */
    level: number
    /** 是否启用 */
    is_active: boolean
}

/** 新建职位请求体，/role/create */
export interface RoleCreateData {
    name: string
    level: number
    type: '部门'
}

/** 修改职位请求体，/role/update */
export interface RoleUpdateData {
    role_id: number
    name: string
    level: number
    type: '部门'
    is_active: boolean
}
