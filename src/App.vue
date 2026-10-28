<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useRoute } from 'vue-router'
import { Toast } from 'primevue'
import { useToast } from 'primevue/usetoast'
import 'modern-normalize/modern-normalize.css'

import { useAuthStore } from '@/stores/auth'
import { initToast } from '@/utils/setToast'
import { useMediaQuery } from '@/utils/useMediaQuery'
import Header from '@/layouts/Header.vue'
import Footer from '@/layouts/Footer.vue'
import Drawer from '@/layouts/Drawer.vue'
import '@/styles/reset.less'

initToast(useToast())

const route = useRoute()
const authStore = useAuthStore()

// ====== 抽屉逻辑 BEGIN ======
const isDesktop = useMediaQuery('(min-width: 801px)')
// 抽屉展示条件
const canShowDrawer = computed(() => {
    if (route.path === '/' || route.path === '/auth') return false
    return authStore.isReady && authStore.isAuthed
})
const mobileNavOpen = ref(false)

function closeMobileNav() {
    mobileNavOpen.value = false
}
function toggleMobileNav() {
    mobileNavOpen.value = !mobileNavOpen.value
}
// 跳转后自动收起 drawer
watch(() => route.fullPath, closeMobileNav)
watch(canShowDrawer, (value) => {
    if (!value) closeMobileNav()
})
watch(isDesktop, (value) => {
    if (value) closeMobileNav()
})
// ====== 抽屉逻辑 END ======
</script>

<template>
    <Toast position="top-center" />
    <Header :show-drawer-toggle="canShowDrawer" :drawer-open="mobileNavOpen" @toggle-drawer="toggleMobileNav" />
    <div
        class="e-body"
        :class="{ 'e-no-drawer': !canShowDrawer, 'e-home': route.path === '/', 'e-drawer-open': mobileNavOpen }"
    >
        <Transition name="e-fade">
            <div
                v-if="canShowDrawer && mobileNavOpen"
                class="e-drawer-backdrop"
                aria-hidden="true"
                @click="closeMobileNav"
            ></div>
        </Transition>
        <Drawer v-if="canShowDrawer" :mobile-open="mobileNavOpen" @close="closeMobileNav" />
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
        display: flex;
        visibility: hidden; // 工作页面不显示 footer，但是保留空间
    }

    &.e-no-drawer footer {
        visibility: visible;
        padding-left: var(--e-content-h-padding);
        padding-right: var(--e-content-h-padding);
    }

    &.e-home {
        min-height: fit-content;

        .e-view {
            overflow-y: visible;
        }
    }

    // 抽屉展开时锁定内容滚动
    &.e-drawer-open .e-view {
        overflow: hidden;
    }
}

.e-drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--e-mobile-overlay-z);
    background-color: var(--e-overlay-bg);
    backdrop-filter: blur(var(--e-overlay-blur));
}

.e-fade-enter-active,
.e-fade-leave-active {
    transition: opacity 0.2s ease;
}

.e-fade-enter-from,
.e-fade-leave-to {
    opacity: 0;
}

@media screen and (min-width: 801px) {
    .e-drawer-backdrop {
        display: none;
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
