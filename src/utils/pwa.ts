import setToast from '@/utils/setToast'

/**
 * Service Worker 注册与更新检查
 * 注册后主动检查，发现新版本提示用户刷新
 */

export function registerServiceWorker(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    // 首次安装时 clientsClaim 也会触发 controllerchange，此时页面不受控不需要提示
    const hadController = Boolean(navigator.serviceWorker.controller)
    let notified = false

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || notified) return
        notified = true
        setToast('info', '发现新版本', '刷新页面后即可使用新版本')
    })

    window.addEventListener(
        'load',
        () => {
            void navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((registration) => {
                    const check = () => {
                        void registration.update().catch(() => {
                            // 离线或服务端异常时忽略，下一次检查再试
                        })
                    }

                    check()
                    window.setInterval(check, 30 * 60 * 1000) // 每 30min 检查一次
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') check()
                    })
                })
                .catch(() => {
                    // 注册失败不影响页面正常使用
                })
        },
        { once: true }
    )
}
