let toastInstance: any = null
// 供 App.vue 用的初始化方法
export const initToast = (instance: any) => {
    toastInstance = instance
}

export default function (severity: string, summary: string, detail?: string) {
    if (toastInstance) {
        toastInstance.add({ severity, summary, detail, life: 4500 })
    } else {
        console.warn('Toast 尚未初始化')
    }
}
