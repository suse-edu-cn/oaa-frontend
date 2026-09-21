/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_OSS_ORIGIN: string
    readonly VITE_PROXY_API_TARGET?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare const __GIT_VERSION__: string
