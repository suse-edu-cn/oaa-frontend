import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { clearSessionCookies, readSession, saveTokens } from '@/utils/session'
import type { UserInfo } from '@/types'

export interface AuthTokens {
    token: string
    refreshToken: string
}

export const useAuthStore = defineStore('auth', () => {
    // epoch 即会话代际，在登录 / 登出 / 检测到 token 替换时递增
    // 刷新 token 时仍处于同一用户的登录态内，epoch 不变
    const epochRef = ref(0)
    const token = ref('')
    const refreshToken = ref('')
    const userInfo = ref<UserInfo | null>(null)
    // 已完成一次初始化尝试的 token
    const readyToken = ref<string | null>(null)

    const epoch = computed(() => epochRef.value)
    // 是否存在会话（token 不为空）
    const hasSession = computed(() => Boolean(token.value))
    // 是否已就绪
    const isReady = computed(() => readyToken.value === token.value)
    // 是否已登录
    const isAuthed = computed(() => Boolean(token.value && userInfo.value))

    /** 从 cookie 恢复 token */
    function hydrate(): void {
        const session = readSession()
        // 同一 token 的重复 hydrate 保留用户信息与就绪状态
        if (session.token !== token.value) {
            epochRef.value++
            userInfo.value = null
            readyToken.value = null
        }
        token.value = session.token
        refreshToken.value = session.refreshToken
    }

    /** 登录 / 刷新成功后写入 token */
    function applyTokens(tokens: AuthTokens): void {
        const wasReady = readyToken.value === token.value
        token.value = tokens.token
        refreshToken.value = tokens.refreshToken
        // 就绪状态跟随新 token
        if (wasReady) readyToken.value = tokens.token
        saveTokens(tokens)
    }

    /** 登录成功后开始新会话 */
    function beginLogin(tokens: AuthTokens): void {
        epochRef.value++
        userInfo.value = null
        readyToken.value = null
        applyTokens(tokens)
    }

    function setUserInfo(info: UserInfo): void {
        userInfo.value = info
    }

    function clearSession(): void {
        epochRef.value++
        token.value = ''
        refreshToken.value = ''
        userInfo.value = null
        readyToken.value = null
        clearSessionCookies()
    }

    /** 仅当发起初始化的 epoch 仍是当前 epoch 时，才标记就绪 */
    function markReady(readyEpoch: number = epochRef.value): void {
        if (readyEpoch === epochRef.value) readyToken.value = token.value
    }

    return {
        epoch,
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
