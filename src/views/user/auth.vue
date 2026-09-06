<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primevue'

import AuthLogin from '@/components/AuthLogin.vue'
import AuthRegister from '@/components/AuthRegister.vue'
import AuthResetPass from '@/components/AuthResetPass.vue'
import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'

const router = useRouter()
const authStore = useAuthStore()
const imgSet = [
    'https://img.alicdn.com/O1CN01IBboqk1ILG3pdXfvg_!!2212930340876-0-ampmedia.jpg',
    'https://img.alicdn.com/O1CN01zvyC7r1ILG3pymwEb_!!2212930340876-2-ampmedia.png',
    'https://img.alicdn.com/O1CN01MviGBa1ILG3pHXMoq_!!2212930340876-2-ampmedia.png',
    'https://img.alicdn.com/O1CN01s8aLFO1ILG3qF6k0V_!!2212930340876-2-ampmedia.png',
    'https://img.alicdn.com/O1CN01vxZ1KT1ILG3juISKN_!!2212930340876-0-ampmedia.jpg',
]

// portal 模式 -> login / register / reset
const mode = ref('login')

onMounted(async () => {
    // 如果因刷新等原因导致 authStore 未初始化，则先 init
    if (!authStore.isReady) {
        await initAuthStore()
    }
    if (authStore.isAuthed) {
        setToast('success', '用户已登录', '欢迎回来，正在跳转至主页')
        router.push('/user')
        initAuthStore()
    }
})
</script>

<template>
    <main>
        <div class="left">
            <img v-once :src="imgSet[Math.floor(Math.random() * imgSet.length)]" alt="" srcset="" />
        </div>

        <div class="right">
            <h2>欢迎使用青蟹</h2>
            <Tabs v-model:value="mode" class="tab-container">
                <TabList class="tab-list">
                    <Tab value="login" class="tab-value">登录</Tab>
                    <Tab value="register" class="tab-value">注册</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel value="login">
                        <AuthLogin @forgot="mode = 'reset'" />
                    </TabPanel>
                    <TabPanel value="register">
                        <AuthRegister @switch-mode="mode = 'login'" />
                    </TabPanel>
                    <TabPanel value="reset">
                        <AuthResetPass :scene="0" @switch-mode="mode = 'login'" />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>
    </main>
</template>

<style lang="less" scoped>
main {
    display: flex;
    justify-content: center;
    min-height: 100%;

    .left {
        display: var(--e-display);
        flex: 4;
        justify-content: center;
        align-items: center;
        padding: 3rem;

        img {
            width: max(240px, 70%);
            max-width: 300px;
            max-height: 400px;
            height: auto;
        }
    }

    .right {
        display: flex;
        flex: 6;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-size: 15px;
        max-width: 600px;

        h2 {
            width: var(--auth-input-width);
            margin-bottom: 2rem;
        }

        .tab-container {
            width: var(--auth-input-width);
            max-width: 500px;
            align-self: center;

            .tab-list {
                justify-content: space-between;
                margin-bottom: 1rem;
            }

            .tab-value {
                width: 49%;
            }

            // 面板叠放在同一网格，容器高度恒为最高面板
            // 避免切换时高度变化导致 Tab 头位置变动
            :deep(.p-tabpanels) {
                display: grid;
            }

            :deep(.p-tabpanel) {
                grid-area: 1 / 1;
            }

            :deep(.p-tabpanel[data-p-active='false']) {
                display: block !important;
                visibility: hidden;
                opacity: 0; // 作用于整个子树合成，避免子元素 transition 拖出残影
                pointer-events: none;
            }
        }
    }

    --auth-input-width: max(75%, 300px);
}

@media screen and (max-width: 800px) {
    main {
        --auth-input-width: 100%;
    }
}
</style>
