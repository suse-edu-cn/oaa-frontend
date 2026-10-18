import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { clearSessionCookies, readSession, saveTokens, saveUserId } from '@/utils/session'
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

    /** 从 cookie 恢复 token，不发起请求 */
    function hydrate(): void {
        const session = readSession()
        token.value = session.token
        refreshToken.value = session.refreshToken
    }

    /** 登录 / 刷新成功后写入 token */
    function applyTokens(tokens: AuthTokens): void {
        token.value = tokens.token
        refreshToken.value = tokens.refreshToken
        saveTokens(tokens)
    }

    function setUserInfo(info: UserInfo | null): void {
        userInfo.value = info
        if (info) saveUserId(info.user_id)
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
        setUserInfo,
        clearSession,
        markReady,
    }
})
