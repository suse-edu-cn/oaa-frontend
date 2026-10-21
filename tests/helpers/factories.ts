import type { DepartmentItem, RoleItem, TermInfo, UserInfo } from '@/types'

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

export function makeTerm(overrides: Partial<TermInfo> = {}): TermInfo {
    return {
        id: 7,
        year: 2026,
        type: '招新',
        title: '2026 秋季招新',
        edit_period: { start_at: '2026-08-01', end_at: '2026-08-31' },
        query_period: { start_at: '2026-09-01', end_at: '2026-09-30' },
        is_executed: false,
        execute_after_at: null,
        executed_at: null,
        created_at: '2026-07-01T00:00:00+08:00',
        updated_at: '2026-07-01T00:00:00+08:00',
        ...overrides,
    }
}
