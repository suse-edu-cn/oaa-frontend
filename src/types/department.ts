/** 协会部门条目 */
export interface DepartmentItem {
    id: number
    name: string
    /** 是否启用 */
    is_active: boolean
}

/** 新建部门请求体，/department/create */
export interface DepartmentCreateData {
    name: string
    type: '部门'
}

/** 修改部门请求体，/department/update */
export interface DepartmentUpdateData {
    department_id: number
    name: string
    type: '部门'
    is_active: boolean
}
