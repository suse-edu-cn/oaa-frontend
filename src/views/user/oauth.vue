<!-- 第三方应用授权页 /user/oauth -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Message, Skeleton } from 'primevue'

import { getOAuthClientPublic } from '@/api/oauth'
import { useAuthStore } from '@/stores/auth'
import { toApiFailure } from '@/utils/apiError'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'
import type { OAuthClientPublic, OAuthClientScope } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 同一参数重复出现时按空格拼接
function readQueryString(value: unknown): string {
    const joined = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string').join(' ')
        : typeof value === 'string'
          ? value
          : ''
    return joined.replaceAll('+', ' ')
}

const clientId = computed(() => readQueryString(route.query.client_id).trim())
const hasScopeParam = computed(() => route.query.scope !== undefined && route.query.scope !== null)
const requestedScopeKeys = computed(() => readQueryString(route.query.scope).split(/\s+/).filter(Boolean))

const client = ref<OAuthClientPublic | null>(null)
const loading = ref(true)
const errorMessage = ref('')
// 如果请求失败回到上一页
const goBack = () => window.history.go(-1)
// 请求序号，避免重试的旧响应覆盖新结果
let loadRequests = 0

const clientName = computed(() => client.value?.client_name || clientId.value)

const declaredScopes = computed<OAuthClientScope[]>(() => {
    const value = client.value?.scopes
    return Array.isArray(value) ? value : []
})

// scope 缺省时展示应用声明的全部权限，否则只展示本次请求的范围
const scopes = computed<OAuthClientScope[]>(() => {
    if (!hasScopeParam.value) return declaredScopes.value
    const requested = new Set(requestedScopeKeys.value)
    return declaredScopes.value.filter((scope) => requested.has(scope.key))
})

// 请求了但应用资料里没声明的权限单独提示，避免授权页漏报
const unknownScopeKeys = computed(() => {
    if (!client.value) return []
    const declared = new Set(declaredScopes.value.map((scope) => scope.key))
    return [...new Set(requestedScopeKeys.value.filter((key) => !declared.has(key)))]
})

// 授权确认 / 拒绝的逻辑
const canRespond = computed(() => !loading.value && !errorMessage.value)

async function loadClient() {
    if (!clientId.value) {
        loading.value = false
        errorMessage.value = '授权请求缺少应用 id，无法识别第三方应用'
        return
    }

    const seq = ++loadRequests
    loading.value = true
    errorMessage.value = ''
    client.value = null

    try {
        const resp = await getOAuthClientPublic(clientId.value)
        if (seq !== loadRequests) return
        if (resp?.code == 200 && resp.data) {
            client.value = resp.data
        } else {
            errorMessage.value = toApiFailure(resp).message
        }
    } finally {
        if (seq === loadRequests) loading.value = false
    }
}

onMounted(async () => {
    if (!authStore.isReady) {
        await initAuthStore()
    }
    if (!authStore.isAuthed) {
        setToast('error', '未登录', '请先登录后再授权第三方应用')
        router.push('/auth')
        return
    }
    await loadClient()
})
</script>

<template>
    <main>
        <h1 class="e-title">授权登录</h1>

        <div class="content" :aria-busy="loading">
            <!-- 加载失败 -->
            <div v-if="errorMessage" class="error-state" role="alert">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
                <div class="title">无法发起授权</div>
                <p class="message">{{ errorMessage }}</p>
                <div class="actions error">
                    <Button label="返回上一页" severity="secondary" @click="goBack" />
                    <Button v-if="clientId" label="重试" icon="pi pi-refresh" @click="loadClient" />
                </div>
            </div>

            <template v-else>
                <p class="request-line">
                    <Skeleton v-if="loading" width="18rem" height="1.1rem" />
                    <template v-else
                        ><b>{{ clientName }}</b> 正在请求访问您的青蟹通行证账号</template
                    >
                </p>

                <!-- 当前登录账号 -->
                <div class="user-card">
                    <template v-if="authStore.userInfo">
                        <img
                            v-if="authStore.userInfo.avatar?.url"
                            :src="authStore.userInfo.avatar.url"
                            :alt="authStore.userInfo.username + ' 的头像'"
                        />
                        <span v-else class="avatar-placeholder" aria-hidden="true">
                            <i class="pi pi-user"></i>
                        </span>
                        <div class="user-info">
                            <div class="username">{{ authStore.userInfo.username }}</div>
                            <div class="secondary">{{ authStore.userInfo.email }}</div>
                        </div>
                    </template>
                    <template v-else>
                        <Skeleton shape="circle" size="56px" />
                        <div class="user-info">
                            <Skeleton width="8rem" height="1.1rem" />
                            <Skeleton width="12rem" height="0.85rem" />
                        </div>
                    </template>
                </div>

                <!-- 权限加载中 -->
                <template v-if="loading">
                    <p>
                        <Skeleton width="15rem" height="1rem" />
                    </p>
                    <ul class="permission-card" aria-hidden="true">
                        <li v-for="i in 2" :key="i" class="item">
                            <Skeleton width="7rem" height="1rem" />
                            <Skeleton width="90%" height="0.85rem" />
                        </li>
                    </ul>
                </template>

                <!-- 权限列表 -->
                <template v-else-if="client">
                    <p class="scope-summary">
                        <template v-if="scopes.length">该应用申请获得以下 {{ scopes.length }} 项权限</template>
                        <template v-else-if="unknownScopeKeys.length">该应用申请的权限均未在应用资料中声明</template>
                        <template v-else>该应用未申请任何权限</template>
                    </p>

                    <ul v-if="scopes.length" class="permission-card">
                        <li v-for="scope in scopes" :key="scope.key" class="item">
                            <div class="title">
                                <i class="pi pi-check-circle" aria-hidden="true"></i>
                                {{ scope.title }}
                            </div>
                            <div class="description">{{ scope.description }}</div>
                        </li>
                    </ul>

                    <Message v-if="unknownScopeKeys.length" severity="warn" variant="simple" class="scope-warning">
                        该应用还申请了未在应用资料中声明的权限：{{ unknownScopeKeys.join('、') }}，请谨慎授权。
                    </Message>

                    <p v-if="scopes.length" class="consent-note">
                        授权后，该应用将在上述范围内使用您的青蟹通行证账号信息。
                    </p>
                </template>
            </template>
        </div>

        <div v-if="!errorMessage" class="actions">
            <Button label="拒绝" severity="secondary" :disabled="!canRespond" />
            <Button label="同意并授权" :disabled="!canRespond" />
        </div>
    </main>
</template>

<style lang="less" scoped>
main {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100%;

    > * {
        width: min(600px, 100%);
    }

    .e-title {
        margin-bottom: 1.5rem;
    }
}

.content {
    font-size: 17px;
    line-height: 1.6;

    .request-line {
        min-height: 1.6em;
        color: var(--p-text-color);
    }

    // 当前登录账号
    .user-card {
        display: flex;
        align-items: center;
        gap: 16px;
        background-color: var(--e-surface-subtle);
        margin: 1em 0;
        border-radius: var(--e-border-radius);
        padding: 12px 16px;

        img,
        .avatar-placeholder {
            flex: 0 0 auto;
            width: 56px;
            height: 56px;
            border-radius: 50%;
        }

        img {
            object-fit: cover;
        }

        .avatar-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--e-surface);
            color: var(--p-text-muted-color);
            font-size: 24px;
        }

        .user-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
            line-height: 1.5;

            .username {
                overflow: hidden;
                font-size: 18px;
                font-weight: 700;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .secondary {
                overflow-wrap: anywhere;
                font-size: 14px;
                color: var(--p-text-muted-color);
            }
        }
    }

    // 应用权限卡片
    .permission-card {
        margin: 0;
        padding: 0;
        list-style: none;
        border: 1px solid var(--e-border-color);
        border-radius: var(--e-border-radius);
        overflow: hidden;

        .item {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 14px 20px;
            border-bottom: 1px solid var(--e-border-subtle);

            &:last-child {
                border-bottom: none;
            }

            .title {
                font-weight: 600;

                .pi {
                    margin-right: 8px;
                    font-size: 14px;
                    color: var(--e-accent-color);
                }
            }

            .description {
                font-size: 13px;
                line-height: 1.5;
                color: var(--p-text-muted-color);
            }
        }
    }

    .scope-warning {
        width: 100%;
        margin-top: 1rem;
        font-size: 13px;
    }

    .consent-note {
        margin-top: 1rem;
        font-size: 13px;
        color: var(--p-text-muted-color);
    }

    // 错误状态
    .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 2.5rem 1.5rem;
        text-align: center;
        border-radius: var(--e-border-radius);

        > .pi {
            font-size: 48px;
            color: var(--e-danger-color);
        }

        .title {
            font-size: 24px;
            font-weight: 600;
        }

        .message {
            color: var(--p-text-muted-color);
        }

        // 父级居中排列，横向拉满后按钮才能按 1 / 2 个平分整行
        .actions {
            align-self: stretch;
        }
    }
}

.actions {
    display: flex;
    gap: 0.5em;
    margin-top: 30px;

    button {
        flex: 1 1 0;
        min-width: 0;
    }
}

@media screen and (max-width: 800px) {
    main > * {
        width: 100%;
    }

    .content {
        font-size: 16px;

        .user-card {
            padding: 12px;

            img,
            .avatar-placeholder {
                width: 48px;
                height: 48px;
            }

            .user-info .username {
                font-size: 17px;
            }
        }

        .permission-card .item {
            padding: 12px 16px;
        }
    }

    .actions {
        margin-top: 24px;
    }
}
</style>
