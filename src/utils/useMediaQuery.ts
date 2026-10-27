import { onMounted, onUnmounted, ref } from 'vue'

export function useMediaQuery(query: string) {
    const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    const matches = ref(supported ? window.matchMedia(query).matches : false)
    let mediaQuery: MediaQueryList | null = null

    function onChange(event: MediaQueryListEvent) {
        matches.value = event.matches
    }

    onMounted(() => {
        if (!supported) return
        mediaQuery = window.matchMedia(query)
        matches.value = mediaQuery.matches
        mediaQuery.addEventListener('change', onChange)
    })

    onUnmounted(() => {
        mediaQuery?.removeEventListener('change', onChange)
    })

    return matches
}
