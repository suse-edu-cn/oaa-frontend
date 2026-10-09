import request from '@/utils/request'
import type {
    ApiResponse,
    ApiResult,
    DepartmentCreateData,
    DepartmentItem,
    DepartmentUpdateData,
    RoleCreateData,
    RoleItem,
    RoleUpdateData,
} from '@/types'

// 部门列表 /department/list
export function getDepartmentList(): Promise<ApiResult<DepartmentItem[]>> {
    return request<ApiResponse<DepartmentItem[]>>({
        url: '/department/list',
        method: 'GET',
    })
}

// 新建部门 /department/create
export function createDepartment(data: DepartmentCreateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/department/create',
        method: 'POST',
        data,
    })
}

// 修改部门 /department/update
export function updateDepartment(data: DepartmentUpdateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/department/update',
        method: 'POST',
        data,
    })
}

// 职位列表 /role/list
export function getRoleList(): Promise<ApiResult<RoleItem[]>> {
    return request<ApiResponse<RoleItem[]>>({
        url: '/role/list',
        method: 'GET',
    })
}

// 新建职位 /role/create
export function createRole(data: RoleCreateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/role/create',
        method: 'POST',
        data,
    })
}

// 修改职位 /role/update
export function updateRole(data: RoleUpdateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/role/update',
        method: 'POST',
        data,
    })
}
