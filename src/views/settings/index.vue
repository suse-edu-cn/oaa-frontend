<script setup lang="ts">
import { ref } from 'vue'
import { Dialog } from 'primevue'

import SettingItem from '@/components/SettingItem.vue'
import { useSettingsStore } from '@/stores/settings'
import { THEME_OPTIONS } from '@/utils/theme'

const showBuildDialog = ref(false)
const settingsStore = useSettingsStore()

// vite 注入的版本信息
const buildInfo = __BUILD_INFO__
</script>

<template>
    <main>
        <h1 class="e-title">设置</h1>
        <div class="settings-list">
            <!-- 外观 -->
            <div class="setting-catalog">外观</div>
            <div class="setting-card">
                <SettingItem
                    variant="dropdown"
                    icon="pi pi-palette"
                    label="主题"
                    :options="THEME_OPTIONS"
                    :model-value="settingsStore.themeMode"
                    @update:model-value="settingsStore.setThemeMode"
                />
            </div>

            <!-- 关于工作台 -->
            <div class="setting-catalog">关于工作台</div>
            <div class="setting-card">
                <SettingItem
                    variant="link"
                    icon="pi pi-lightbulb"
                    label="使用反馈"
                    :href="buildInfo.repo + '/issues/new/choose'"
                />
                <div class="divider"></div>
                <SettingItem icon="pi pi-code" label="工作台版本" @click="showBuildDialog = true">
                    v{{ buildInfo.version }}
                </SettingItem>
            </div>
        </div>

        <!-- 版本信息弹窗 -->
        <Dialog v-model:visible="showBuildDialog" modal header="版本信息" :style="{ minWidth: '22rem' }">
            <div class="build-info">
                <div class="item">
                    <span>版本号</span>
                    <span>v{{ buildInfo.version }}</span>
                </div>
                <div class="item">
                    <span>构建版本</span>
                    <span>{{ buildInfo.hash }} (build {{ buildInfo.build }})</span>
                </div>
                <div class="item">
                    <span>构建时间</span>
                    <span>{{ buildInfo.time }}</span>
                </div>
            </div>
        </Dialog>
    </main>
</template>

<style lang="less" scoped>
.settings-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.setting-catalog {
    font-weight: 600;
    color: var(--p-menu-submenu-label-color);
    padding: 12px 0;
}

.setting-card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--p-menu-separator-border-color);
    border-radius: var(--e-border-radius);

    .divider {
        height: 1px;
        margin: 0 24px;
        background-color: var(--p-menu-separator-border-color);
    }
}

.build-info {
    font-size: 15px;
    display: flex;
    flex-direction: column;
    gap: 1em;
    margin-bottom: 0.5em;

    .item {
        display: flex;
        justify-content: space-between;

        span:first-child {
            color: var(--p-menu-submenu-label-color);
        }

        span:last-child {
            color: var(--p-menu-item-color);
        }
    }
}

@media screen and (max-width: 800px) {
    .setting-card .divider {
        margin: 0 16px;
    }

    .build-info .item {
        flex-direction: column;
        gap: 2px;
    }
}
</style>
