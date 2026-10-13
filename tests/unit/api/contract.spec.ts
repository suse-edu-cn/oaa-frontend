import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/request', () => ({ default: vi.fn() }))

import * as authApi from '@/api/auth'
import { changePassword, login, logout, register, resetPassword, sendVerificationCode } from '@/api/auth'
import * as announcementApi from '@/api/announcement'
import {
    createAnnouncement,
    deleteAnnouncement,
    getAnnouncement,
    getAnnouncementList,
    publishAnnouncement,
    updateAnnouncement,
} from '@/api/announcement'
import * as applicationApi from '@/api/application'
import {
    createApplication,
    deleteApplication,
    getApplicationList,
    getDepartmentsByRole,
    getMyApplications,
    getRolesByDepartment,
    updateApplication,
} from '@/api/application'
import * as interviewApi from '@/api/interview'
import {
    createInterviewResult,
    createInterviewStaff,
    deleteInterviewStaff,
    getInterviewResultList,
    getInterviewStaffList,
    updateInterviewResult,
    updateInterviewStaff,
} from '@/api/interview'
import * as orgApi from '@/api/org'
import { createDepartment, createRole, getDepartmentList, getRoleList, updateDepartment, updateRole } from '@/api/org'
import * as termApi from '@/api/term'
import { createTerm, deleteTerm, getTermList, updateTerm } from '@/api/term'
import * as userApi from '@/api/user'
import { batchUpdateUsers, deleteUser, getCurrentUser, getUserList, updateCurrentUser } from '@/api/user'
import request from '@/utils/request'

const requestMock = vi.mocked(request)

const apiModules = {
    announcement: announcementApi,
    application: applicationApi,
    auth: authApi,
    interview: interviewApi,
    org: orgApi,
    term: termApi,
    user: userApi,
}

// 契约测试只关心「原样转发」：body / params 用哨兵对象，避免构造完整业务数据
const payload = { contract: true } as never
const listParams = { contract: true } as never

type Case = {
    name: string
    run: () => unknown
    expected: {
        url: string
        method: 'GET' | 'POST'
        data?: unknown
        params?: unknown
    }
}

const cases: Case[] = [
    // auth
    {
        name: 'auth/login',
        run: () => login(payload),
        expected: { url: '/auth/login', method: 'POST', data: payload },
    },
    {
        name: 'auth/logout',
        run: () => logout(),
        expected: { url: '/auth/logout', method: 'POST', data: { device: 'web' } },
    },
    {
        name: 'auth/register',
        run: () => register(payload),
        expected: { url: '/auth/register', method: 'POST', data: payload },
    },
    {
        name: 'auth/sendVerificationCode',
        run: () => sendVerificationCode(payload),
        expected: { url: '/auth/send', method: 'POST', data: payload },
    },
    {
        name: 'auth/resetPassword',
        run: () => resetPassword(payload),
        expected: { url: '/auth/password/reset', method: 'POST', data: payload },
    },
    {
        name: 'auth/changePassword',
        run: () => changePassword(payload),
        expected: { url: '/auth/password/update', method: 'POST', data: payload },
    },

    // org
    {
        name: 'org/getDepartmentList',
        run: () => getDepartmentList(),
        expected: { url: '/department/list', method: 'GET' },
    },
    {
        name: 'org/createDepartment',
        run: () => createDepartment(payload),
        expected: { url: '/department/create', method: 'POST', data: payload },
    },
    {
        name: 'org/updateDepartment',
        run: () => updateDepartment(payload),
        expected: { url: '/department/update', method: 'POST', data: payload },
    },
    {
        name: 'org/getRoleList',
        run: () => getRoleList(),
        expected: { url: '/role/list', method: 'GET' },
    },
    {
        name: 'org/createRole',
        run: () => createRole(payload),
        expected: { url: '/role/create', method: 'POST', data: payload },
    },
    {
        name: 'org/updateRole',
        run: () => updateRole(payload),
        expected: { url: '/role/update', method: 'POST', data: payload },
    },

    // term
    {
        name: 'term/getTermList',
        run: () => getTermList(),
        expected: { url: '/term/list', method: 'GET' },
    },
    {
        name: 'term/createTerm',
        run: () => createTerm(payload),
        expected: { url: '/term/create', method: 'POST', data: payload },
    },
    {
        name: 'term/updateTerm',
        run: () => updateTerm(payload),
        expected: { url: '/term/update', method: 'POST', data: payload },
    },
    {
        name: 'term/deleteTerm',
        run: () => deleteTerm(7),
        expected: { url: '/term/delete', method: 'POST', data: { term_id: 7 } },
    },

    // user
    {
        name: 'user/getCurrentUser',
        run: () => getCurrentUser(),
        expected: { url: '/user/me', method: 'GET' },
    },
    {
        name: 'user/updateCurrentUser',
        run: () => updateCurrentUser(payload),
        expected: { url: '/user/me/update', method: 'POST', data: payload },
    },
    {
        name: 'user/getUserList',
        run: () => getUserList(listParams),
        expected: { url: '/user/list', method: 'GET', params: listParams },
    },
    {
        name: 'user/deleteUser',
        run: () => deleteUser(7),
        expected: { url: '/user/delete', method: 'POST', data: { user_id: 7 } },
    },
    {
        name: 'user/batchUpdateUsers',
        run: () => batchUpdateUsers([payload]),
        expected: { url: '/user/batch', method: 'POST', data: [payload] },
    },

    // announcement
    {
        name: 'announcement/getAnnouncementList',
        run: () => getAnnouncementList(listParams),
        expected: { url: '/announcement/list', method: 'GET', params: listParams },
    },
    {
        name: 'announcement/getAnnouncementList（默认参数）',
        run: () => getAnnouncementList(),
        expected: { url: '/announcement/list', method: 'GET', params: {} },
    },
    {
        name: 'announcement/getAnnouncement',
        run: () => getAnnouncement(7),
        expected: { url: '/announcement/get', method: 'GET', params: { announcement_id: '7' } },
    },
    {
        name: 'announcement/createAnnouncement',
        run: () => createAnnouncement(payload),
        expected: { url: '/announcement/create', method: 'POST', data: payload },
    },
    {
        name: 'announcement/updateAnnouncement',
        run: () => updateAnnouncement(payload),
        expected: { url: '/announcement/update', method: 'POST', data: payload },
    },
    {
        name: 'announcement/publishAnnouncement',
        run: () => publishAnnouncement(7),
        expected: { url: '/announcement/push', method: 'POST', data: { announcement_id: 7 } },
    },
    {
        name: 'announcement/deleteAnnouncement',
        run: () => deleteAnnouncement(7),
        expected: { url: '/announcement/delete', method: 'POST', data: { announcement_id: 7 } },
    },

    // application
    {
        name: 'application/getMyApplications',
        run: () => getMyApplications(),
        expected: { url: '/application/me', method: 'GET' },
    },
    {
        name: 'application/getApplicationList',
        run: () => getApplicationList(listParams),
        expected: { url: '/application/list', method: 'GET', params: listParams },
    },
    {
        name: 'application/createApplication',
        run: () => createApplication(payload),
        expected: { url: '/application/create', method: 'POST', data: payload },
    },
    {
        name: 'application/updateApplication',
        run: () => updateApplication(payload),
        expected: { url: '/application/update', method: 'POST', data: payload },
    },
    {
        name: 'application/deleteApplication',
        run: () => deleteApplication(7),
        expected: { url: '/application/delete', method: 'POST', data: { application_id: 7 } },
    },
    {
        name: 'application/getRolesByDepartment',
        run: () => getRolesByDepartment(3),
        expected: { url: '/application/role', method: 'GET', params: { department_id: 3 } },
    },
    {
        name: 'application/getDepartmentsByRole',
        run: () => getDepartmentsByRole(5),
        expected: { url: '/application/department', method: 'GET', params: { role_id: 5 } },
    },

    // interview
    {
        name: 'interview/getInterviewStaffList',
        run: () => getInterviewStaffList({ term_id: 9 }),
        expected: { url: '/interviewer/list', method: 'GET', params: { term_id: 9 } },
    },
    {
        name: 'interview/createInterviewStaff',
        run: () => createInterviewStaff(payload),
        expected: { url: '/interviewer/create', method: 'POST', data: payload },
    },
    {
        name: 'interview/updateInterviewStaff',
        run: () => updateInterviewStaff(payload),
        expected: { url: '/interviewer/update', method: 'POST', data: payload },
    },
    {
        name: 'interview/deleteInterviewStaff',
        run: () => deleteInterviewStaff(7),
        expected: { url: '/interviewer/delete', method: 'POST', data: { interviewer_id: 7 } },
    },
    {
        name: 'interview/getInterviewResultList',
        run: () => getInterviewResultList({ term_id: 9 }),
        expected: { url: '/interviewer/result/list', method: 'GET', params: { term_id: 9 } },
    },
    {
        name: 'interview/createInterviewResult',
        run: () => createInterviewResult(payload),
        expected: { url: '/interviewer/result/create', method: 'POST', data: payload },
    },
    {
        name: 'interview/updateInterviewResult',
        run: () => updateInterviewResult(payload),
        expected: { url: '/interviewer/result/update', method: 'POST', data: payload },
    },
]

const exportedNames = Object.entries(apiModules).flatMap(([moduleName, api]) =>
    Object.entries(api)
        .filter(([, value]) => typeof value === 'function')
        .map(([functionName]) => `${moduleName}/${functionName}`)
)
const coveredNames = new Set(cases.map(({ name }) => name.split('（')[0]))

describe('api 契约', () => {
    it('覆盖全部导出 endpoint 避免漏测', () => {
        expect(coveredNames).toEqual(new Set(exportedNames))
    })

    it.each(cases)('$name', ({ run, expected }) => {
        run()

        expect(requestMock).toHaveBeenCalledTimes(1)
        expect(requestMock).toHaveBeenCalledWith(expected)
    })
})
