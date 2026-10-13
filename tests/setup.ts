import { afterEach } from 'vitest'

import { clearAuthCookies } from './helpers/auth'

afterEach(() => {
    document.body.innerHTML = ''
    clearAuthCookies()
})
