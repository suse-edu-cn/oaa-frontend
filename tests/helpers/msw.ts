import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from '../mocks/server'

/** 统一管理 MSW 生命周期 */
export function useMsw() {
    beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())
}
