import type { DepartmentItem, RoleItem, UserInfo } from '@/types'

export function makeUser(overrides: Partial<UserInfo> = {}): UserInfo {
    return {
        user_id: 1,
        student_id: '20260001',
        username: 'tester',
        name: '测试用户',
        avatar: { uri: 'oss://avatar.png', url: 'https://obj.suseoaa.com/avatar.png' },
        email: 'test@example.com',
        department: '项目实践部',
        role: '干事',
        role_level: 20,
        ...overrides,
    }
}

export function makeDepartment(overrides: Partial<DepartmentItem> = {}): DepartmentItem {
    return { id: 1, name: '项目实践部', is_active: true, ...overrides }
}

export function makeRole(overrides: Partial<RoleItem> = {}): RoleItem {
    return { id: 1, name: '干事', level: 20, is_active: true, ...overrides }
}
