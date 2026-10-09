import request from '@/utils/request'
import type {
    ApiResponse,
    ApiResult,
    ApplicationCreateData,
    ApplicationItem,
    ApplicationListParams,
    ApplicationUpdateData,
    DepartmentItem,
    RoleItem,
} from '@/types'

// 当前用户的申请 /application/me
export function getMyApplications(): Promise<ApiResult<ApplicationItem[]>> {
    return request<ApiResponse<ApplicationItem[]>>({
        url: '/application/me',
        method: 'GET',
    })
}

// 申请列表（审核用）/application/list
export function getApplicationList(params: ApplicationListParams): Promise<ApiResult<ApplicationItem[]>> {
    return request<ApiResponse<ApplicationItem[]>>({
        url: '/application/list',
        method: 'GET',
        params,
    })
}

// 创建申请 /application/create
export function createApplication(data: ApplicationCreateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/application/create',
        method: 'POST',
        data,
    })
}

// 修改申请 /application/update
export function updateApplication(data: ApplicationUpdateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/application/update',
        method: 'POST',
        data,
    })
}

// 删除申请 /application/delete
export function deleteApplication(applicationId: number): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/application/delete',
        method: 'POST',
        data: { application_id: applicationId },
    })
}

// 部门下可供申请的职位 /application/role
export function getRolesByDepartment(departmentId: number): Promise<ApiResult<RoleItem[]>> {
    return request<ApiResponse<RoleItem[]>>({
        url: '/application/role',
        method: 'GET',
        params: { department_id: departmentId },
    })
}

// 职位下可供申请的部门 /application/department
export function getDepartmentsByRole(roleId: number): Promise<ApiResult<DepartmentItem[]>> {
    return request<ApiResponse<DepartmentItem[]>>({
        url: '/application/department',
        method: 'GET',
        params: { role_id: roleId },
    })
}
