import { test as base } from '@playwright/test'
import type { BrowserContext, Route } from '@playwright/test'

import type {
    AnnouncementItem,
    ApplicationItem,
    DepartmentItem,
    InterviewStaffItem,
    RoleItem,
    TermInfo,
    UploadResponse,
    UserInfo,
} from '../../src/types'

// ================= 测试数据 =================

export const DEFAULT_DEPARTMENTS: DepartmentItem[] = [
    { id: 1, name: '项目实践部', is_active: true },
    { id: 2, name: '宣传部', is_active: true },
]

export const DEFAULT_ROLES: RoleItem[] = [
    { id: 1, name: '干事', level: 20, is_active: true },
    { id: 2, name: '部长', level: 50, is_active: true },
]

export const DEFAULT_UPLOAD: UploadResponse = {
    uri: 'oss://application/avatar.png',
    url: 'https://obj.suseoaa.com/application/avatar.png',
}

export function makeUser(overrides: Partial<UserInfo> = {}): UserInfo {
    return {
        user_id: 1,
        student_id: '20260001',
        username: 'tester',
        name: '测试用户',
        avatar: { uri: 'oss://avatar.png', url: 'https://obj.suseoaa.com/avatar.png' },
        email: 'tester@example.com',
        department: '项目实践部',
        role: '干事',
        role_level: 20,
        ...overrides,
    }
}

export function makeAnnouncement(overrides: Partial<AnnouncementItem> = {}): AnnouncementItem {
    return {
        announcement_id: 1,
        title: '2026 秋季招新公告',
        content: [
            '## 招新安排',
            '',
            '欢迎加入青蟹，报名截止 **9 月 30 日**。',
            '',
            '![海报](https://obj.suseoaa.com/oaa/poster.png)',
        ].join('\n'),
        is_active: true,
        department_name: '项目实践部',
        publisher_id: 2,
        publisher_name: '会长',
        publisher_role: '会长',
        published_at: '2026-09-01T10:00:00+08:00',
        created_at: '2026-08-30T10:00:00+08:00',
        updated_at: '2026-09-01T10:00:00+08:00',
        ...overrides,
    }
}

export function makeTerm(overrides: Partial<TermInfo> = {}): TermInfo {
    return {
        id: 7,
        year: 2026,
        type: '招新',
        title: '2026 秋季招新',
        // 宽区间，避免用例结果随真实日期变化
        edit_period: { start_at: '2000-01-01', end_at: '2099-12-31' },
        query_period: { start_at: '2000-01-01', end_at: '2099-12-31' },
        is_executed: false,
        execute_after_at: null,
        executed_at: null,
        created_at: '2026-08-01T00:00:00+08:00',
        updated_at: '2026-08-01T00:00:00+08:00',
        ...overrides,
    }
}

export function makeApplication(overrides: Partial<ApplicationItem> = {}): ApplicationItem {
    return {
        id: 1,
        term_id: 7,
        term_title: '2026 秋季招新',
        type: '招新',
        user_id: 1,
        name: '测试申请人',
        gender: '男',
        avatar: DEFAULT_UPLOAD,
        student_id: '20260001',
        college: '计算机科学与工程学院',
        major_class: '计科241',
        political_status: '共青团员',
        birth_date: '2006-01-05',
        qq: '123456789',
        phone: '13800138000',
        first_choice: { department_id: 1, role_id: 1 },
        second_choice: { department_id: 2, role_id: 2 },
        allow_adjust: true,
        resume: '参与过开源项目维护。',
        reason: '希望和协会一起做有意思的项目。',
        decision: '待定',
        result: { department_id: 0, role_id: 0 },
        operator_user_id: 0,
        decision_remark: '',
        created_at: '2026-09-10T10:00:00+08:00',
        updated_at: '2026-09-10T10:00:00+08:00',
        ...overrides,
    }
}

/**
 * 构造只需要 payload 的假 JWT，exp 为相对当前时间的秒数
 * 保留 base64 的 `=` 填充，request.ts 直接 atob 解析
 */
export function makeJwt(expiresInSeconds: number): string {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }))
    return `${header.replaceAll('+', '-').replaceAll('/', '_')}.${payload.replaceAll('+', '-').replaceAll('/', '_')}.sig`
}

// ================= 接口 Mock =================

export interface MockScenario {
    /** /user/me 返回的用户；null 表示登录态失效 */
    user?: Partial<UserInfo> | null
    /** /user/me 前 N 次返回业务 401，true 表示始终 401 */
    userMeUnauthorized?: boolean | number
    refresh?: 'success' | 'fail'
    login?: 'success' | 'fail'
    logout?: 'success' | 'fail'
    announcements?: AnnouncementItem[]
    announcement?: AnnouncementItem | null
    applications?: ApplicationItem[]
    interviewers?: InterviewStaffItem[]
    users?: UserInfo[]
    terms?: TermInfo[]
    departments?: DepartmentItem[]
    roles?: RoleItem[]
    applicationRoles?: RoleItem[]
    applicationDepartments?: DepartmentItem[]
    upload?: UploadResponse | null
    createApplication?: 'success' | 'fail'
}

interface ApiCall {
    method: string
    path: string
}

interface ApiBody extends ApiCall {
    json: unknown
}

interface ApiEnvelope<T> {
    code: number
    message: string
    data: T
}

function ok<T>(data: T): ApiEnvelope<T> {
    return { code: 200, message: 'ok', data }
}

/** 已审核 = 有审核员或结果不再是默认的“待定”，与 review 页的判断一致 */
function isReviewed(item: ApplicationItem): boolean {
    return Boolean(item.operator_user_id) || Boolean(item.decision && item.decision !== '待定')
}

function fail(code: number, message: string): ApiEnvelope<null> {
    return { code, message, data: null }
}

async function fulfill(route: Route, body: ApiEnvelope<unknown>, status = 200): Promise<void> {
    await route.fulfill({ status, json: body })
}

/** 记录测试期间的接口调用，供用例断言与兜底检查 */
export class ApiMock {
    scenario: MockScenario = {}
    readonly calls: ApiCall[] = []
    readonly bodies: ApiBody[] = []
    readonly unmatched: string[] = []
    readonly counters = { userMe: 0 }

    count(method: string, path: string): number {
        return this.calls.filter((call) => call.method === method && call.path === path).length
    }

    lastBody(method: string, path: string): unknown {
        return [...this.bodies].reverse().find((body) => body.method === method && body.path === path)?.json
    }
}

async function handleApi(route: Route, api: ApiMock): Promise<void> {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    // VITE_API_URL=/v2，baseURL 之外的路径部分即后端端点
    const path = url.pathname.replace(/^\/v2/, '')

    api.calls.push({ method, path })
    let json: unknown
    try {
        json = request.postDataJSON()
    } catch {
        json = undefined
    }
    api.bodies.push({ method, path, json })

    const scenario = api.scenario
    const user = scenario.user === undefined ? makeUser() : scenario.user
    const announcement = scenario.announcement === undefined ? makeAnnouncement() : scenario.announcement

    if (method === 'POST' && path === '/auth/login') {
        if (scenario.login === 'fail') return fulfill(route, fail(401, '用户名或密码错误'))
        return fulfill(route, ok({ token: makeJwt(3600), refresh_token: 'login-refresh-token' }))
    }

    if (method === 'POST' && path === '/auth/logout') {
        if (scenario.logout === 'fail') return fulfill(route, fail(500, '登出失败'))
        return fulfill(route, ok(null))
    }

    if (method === 'POST' && path === '/auth/refresh') {
        if (scenario.refresh === 'fail') return fulfill(route, fail(401, 'refresh token 已失效'))
        return fulfill(route, ok({ token: makeJwt(3600), refresh_token: 'refreshed-token' }))
    }

    if (method === 'GET' && path === '/user/me') {
        api.counters.userMe += 1
        const limit =
            scenario.userMeUnauthorized === true ? Number.POSITIVE_INFINITY : Number(scenario.userMeUnauthorized ?? 0)
        if (!user || api.counters.userMe <= limit) return fulfill(route, fail(401, '登录已失效'))
        return fulfill(route, ok(user))
    }

    if (method === 'GET' && path === '/announcement/list') {
        return fulfill(route, ok(scenario.announcements ?? []))
    }

    if (method === 'GET' && path === '/announcement/get') {
        if (!announcement) return fulfill(route, fail(404, '公告不存在'))
        const id = Number(url.searchParams.get('announcement_id'))
        const found = (scenario.announcements ?? []).find((item) => item.announcement_id === id) ?? announcement
        return fulfill(route, ok({ ...found, announcement_id: id }))
    }

    if (method === 'GET' && path === '/application/me') {
        return fulfill(route, ok(scenario.applications ?? []))
    }

    if (method === 'GET' && path === '/application/list') {
        const hasResult = url.searchParams.get('has_result')
        const applications = scenario.applications ?? []
        const list =
            hasResult === null ? applications : applications.filter((item) => String(isReviewed(item)) === hasResult)
        return fulfill(route, ok(list))
    }

    if (method === 'POST' && path === '/application/create') {
        if (scenario.createApplication === 'fail') return fulfill(route, fail(500, '创建申请失败'))
        return fulfill(route, ok(null))
    }

    if (method === 'GET' && path === '/user/list') {
        const users = scenario.users ?? []
        return fulfill(route, ok({ total: users.length, list: users }))
    }

    if (method === 'GET' && path === '/interviewer/list') {
        return fulfill(route, ok(scenario.interviewers ?? []))
    }

    if (method === 'POST' && path === '/interviewer/create') {
        return fulfill(route, ok(null))
    }

    if (method === 'GET' && path === '/application/role') {
        return fulfill(route, ok(scenario.applicationRoles ?? scenario.roles ?? DEFAULT_ROLES))
    }

    if (method === 'GET' && path === '/application/department') {
        return fulfill(route, ok(scenario.applicationDepartments ?? scenario.departments ?? DEFAULT_DEPARTMENTS))
    }

    if (method === 'GET' && path === '/term/list') {
        return fulfill(route, ok(scenario.terms ?? [makeTerm()]))
    }

    if (method === 'GET' && path === '/department/list') {
        return fulfill(route, ok(scenario.departments ?? DEFAULT_DEPARTMENTS))
    }

    if (method === 'GET' && path === '/role/list') {
        return fulfill(route, ok(scenario.roles ?? DEFAULT_ROLES))
    }

    if (method === 'POST' && path === '/upload/image') {
        if (scenario.upload === null) return fulfill(route, fail(500, '上传失败'))
        return fulfill(route, ok(scenario.upload ?? DEFAULT_UPLOAD))
    }

    api.unmatched.push(`${method} ${path}`)
    await fulfill(route, fail(404, '未 mock 的接口'), 404)
}

// 1x1 透明 PNG，避免 E2E 真实请求 OSS 图片
const PIXEL_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
)

export interface SignInOptions {
    /** 登录态剩余有效期（秒），负数表示已过期 */
    expiresInSeconds?: number
}

export interface E2EFixtures {
    api: ApiMock
    /** 预置登录 cookie，不经过真实登录接口 */
    signIn: (options?: SignInOptions) => Promise<void>
}

export const test = base.extend<E2EFixtures>({
    api: async ({ page }, use) => {
        const api = new ApiMock()
        await page.route('**/v2/**', (route) => handleApi(route, api))
        await page.route(/^https:\/\/obj(?:\.in)?\.suseoaa\.com\//, (route) =>
            route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
        )
        await use(api)

        // 未 mock 的接口一律 404，测试结束时兜底报错，避免悄悄穿透到开发代理
        if (api.unmatched.length) {
            throw new Error(`存在未 mock 的接口请求：\n${api.unmatched.join('\n')}`)
        }
    },

    signIn: async ({ page, baseURL }, use) => {
        await use(async (options: SignInOptions = {}) => {
            if (!baseURL) throw new Error('playwright.config.ts 未配置 use.baseURL')
            await setAuthCookies(page.context(), baseURL, options.expiresInSeconds ?? 3600)
        })
    },
})

async function setAuthCookies(context: BrowserContext, baseURL: string, expiresInSeconds: number): Promise<void> {
    await context.addCookies([
        { name: 'token', value: makeJwt(expiresInSeconds), url: baseURL },
        { name: 'refresh_token', value: 'e2e-refresh-token', url: baseURL },
    ])
}

export { expect } from '@playwright/test'
