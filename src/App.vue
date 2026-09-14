<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useRoute } from 'vue-router'
import cookies from 'js-cookie'
import { Toast } from 'primevue'
import { useToast } from 'primevue/usetoast'
import 'modern-normalize/modern-normalize.css'

import { useAuthStore } from '@/stores/auth'
import { initToast } from '@/utils/setToast'
import Header from '@/layouts/Header.vue'
import Footer from '@/layouts/Footer.vue'
import Drawer from '@/layouts/Drawer.vue'
import '@/styles/reset.less'

initToast(useToast())

const route = useRoute()
const authStore = useAuthStore()

// 抽屉展示条件
const canShowDrawer = computed(() => {
    if (route.path === '/' || route.path === '/auth') return false
    return (
        authStore.isReady &&
        authStore.isAuthed &&
        Boolean(cookies.get('token') && cookies.get('refresh_token') && cookies.get('user_id'))
    )
})
</script>

<template>
    <Toast position="top-center" />
    <Header />
    <div class="e-body" :class="{ 'e-no-drawer': !canShowDrawer }">
        <Drawer v-if="canShowDrawer" />
        <section class="e-view-wrapper">
            <div class="e-view">
                <div class="e-view-content">
                    <RouterView />
                </div>
                <Footer />
            </div>
        </section>
    </div>
</template>

<style lang="less" scoped>
.e-body {
    flex: 1;
    display: flex;
    width: 100%;
    min-height: 0;

    footer {
        display: none; // 工作页面不显示 footer
    }

    &.e-no-drawer footer {
        display: flex;
        padding-left: var(--e-content-h-padding);
        padding-right: var(--e-content-h-padding);
    }
}

.e-view-wrapper {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.e-view {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.e-view-content {
    flex: 1 0 auto;
}
</style>
