import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { UserInfo } from '@/types'

export const useAuthStore = defineStore('auth', () => {
    const isReady = ref(false)
    const isAuthed = ref(false)
    const token = ref('')
    const refreshToken = ref('')
    const userInfo = ref<UserInfo | null>(null)

    return {
        isReady,
        isAuthed,
        token,
        refreshToken,
        userInfo,
    }
})
