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
    // 身份版本在 token 变化时递增，token 刷新不递增
    // 初始化请求用它判断返回时是否已经换了会话
    const sessionVersion = ref(0)

    const hasSession = computed(() => Boolean(token.value))
    const isAuthed = computed(() => Boolean(token.value && userInfo.value))

    /** 从 cookie 恢复 token，不发起请求；token 变化时旧用户信息不再可信 */
    function hydrate(): void {
        const session = readSession()
        const tokenChanged = session.token !== token.value
        // 同一 token 的重复 hydrate 保留用户信息，
        if (tokenChanged || !session.token) {
            userInfo.value = null
            if (tokenChanged) sessionVersion.value += 1
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
        sessionVersion.value += 1
        applyTokens(tokens)
    }

    /** 写入已加载的用户信息 */
    function setUserInfo(info: UserInfo): void {
        userInfo.value = info
        saveUserId(info.user_id)
    }

    function clearSession(): void {
        token.value = ''
        refreshToken.value = ''
        userInfo.value = null
        sessionVersion.value += 1
        clearSessionCookies()
    }

    function markReady(): void {
        isReady.value = true
    }

    return {
        isReady,
        isAuthed,
        hasSession,
        sessionVersion,
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
