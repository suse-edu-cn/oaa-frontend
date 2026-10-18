import { computed, onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import {
    applyTheme,
    isThemeMode,
    normalizeThemeMode,
    prefersDarkScheme,
    readStoredThemeMode,
    resolveIsDark,
    storeThemeMode,
    watchSystemTheme,
} from '@/utils/theme'
import type { ThemeMode } from '@/utils/theme'

export const useSettingsStore = defineStore('settings', () => {
    // 主题偏好
    // 跟随系统 / 浅色 / 深色
    const themeMode = ref<ThemeMode>(readStoredThemeMode())
    const systemPrefersDark = ref(prefersDarkScheme())
    const isDark = computed(() => resolveIsDark(themeMode.value, systemPrefersDark.value))

    // 跟随系统时，系统配色变化需要立即反映到页面
    const stopWatchingSystem = watchSystemTheme((prefersDark) => {
        systemPrefersDark.value = prefersDark
    })
    onScopeDispose(stopWatchingSystem)

    // isDark 是唯一出口，任何来源的变化都经过这里写回 DOM
    // sync 让 class 与页面同步发生在同一次更新里，避免设置页切换时出现一帧延迟
    watch(isDark, (value) => applyTheme(value), { immediate: true, flush: 'sync' })

    function setThemeMode(mode: ThemeMode): void {
        if (!isThemeMode(mode)) return
        themeMode.value = normalizeThemeMode(mode)
        storeThemeMode(themeMode.value)
    }

    return { themeMode, isDark, systemPrefersDark, setThemeMode }
})
