import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { clearSessionCookies, readSession, saveTokens } from '@/utils/session'
import type { UserInfo } from '@/types'

export interface AuthTokens {
    token: string
    refreshToken: string
}

export const useAuthStore = defineStore('auth', () => {
    const isReady = ref(false)
    const token = ref('')
    const refreshToken = ref('')
    const userInfo = ref<UserInfo | null>(null)

    const hasSession = computed(() => Boolean(token.value))
    const isAuthed = computed(() => Boolean(token.value && userInfo.value))

    /** 从 cookie 恢复 token，不发起请求；token 变化时旧用户信息不再可信 */
    function hydrate(): void {
        const session = readSession()
        const tokenChanged = session.token !== token.value
        // 同一 token 的重复 hydrate 保留用户信息
        if (tokenChanged || !session.token) {
            userInfo.value = null
        }
        token.value = session.token
        refreshToken.value = session.refreshToken
    }

    /** 登录 / 刷新成功后写入 token */
    function applyTokens(tokens: AuthTokens): void {
        token.value = tokens.token
        refreshToken.value = tokens.refreshToken
        saveTokens(tokens)
    }

    /** 登录成功后开始新会话 */
    function beginLogin(tokens: AuthTokens): void {
        userInfo.value = null
        applyTokens(tokens)
    }

    /** 写入已加载的用户信息 */
    function setUserInfo(info: UserInfo): void {
        userInfo.value = info
    }

    function clearSession(): void {
        token.value = ''
        refreshToken.value = ''
        userInfo.value = null
        clearSessionCookies()
    }

    function markReady(): void {
        isReady.value = true
    }

    return {
        isReady,
        isAuthed,
        hasSession,
        token,
        refreshToken,
        userInfo,
        hydrate,
        applyTokens,
        beginLogin,
        setUserInfo,
        clearSession,
        markReady,
    }
})
