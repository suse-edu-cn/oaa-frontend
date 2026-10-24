<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, Select } from 'primevue'

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
            <div class="setting-catalog">外观</div>
            <div class="setting-card">
                <div class="section">
                    <i class="pi pi-palette"></i>
                    <span class="key">主题</span>
                    <span class="value theme">
                        <Select
                            :model-value="settingsStore.themeMode"
                            :options="THEME_OPTIONS"
                            option-label="label"
                            option-value="value"
                            size="small"
                            aria-label="主题模式"
                            @update:model-value="settingsStore.setThemeMode"
                        />
                    </span>
                </div>
            </div>
            <div class="setting-catalog">关于工作台</div>
            <div class="setting-card">
                <a
                    :href="buildInfo.repo + '/issues/new/choose'"
                    class="section clickable"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <i class="pi pi-lightbulb"></i>
                    <span class="key">使用反馈</span>
                    <span class="value">
                        <i class="pi pi-arrow-right"></i>
                    </span>
                </a>
                <div class="divider"></div>
                <div class="section clickable" @click="showBuildDialog = true">
                    <i class="pi pi-code"></i>
                    <span class="key">工作台版本</span>
                    <span class="value"> v{{ buildInfo.version }} </span>
                </div>
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
                    <span>{{ new Date(buildInfo.date).toLocaleString('zh-CN', { hour12: false }) }}</span>
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

    .section {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 16px 24px;
        font-size: 15px;
        border-radius: var(--e-border-radius);

        i {
            font-size: 18px;
            margin-right: 0.5em;
            color: var(--p-menu-submenu-label-color);
        }

        .key {
            color: var(--p-menu-submenu-label-color);
        }

        .value {
            color: var(--p-menu-item-color);
            margin-left: auto;
        }

        .value.theme {
            display: flex;
            align-items: center;
            min-width: 0;
        }
    }

    .section.clickable {
        transition: all 0.3s;
        cursor: pointer;

        &:hover {
            background-color: var(--p-menu-item-focus-background);
        }
    }

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

// 窄屏下主题选择器换行，避免挤出容器
@media screen and (max-width: 800px) {
    .setting-card .section {
        flex-wrap: wrap;
    }

    .setting-card .value.theme {
        width: 100%;
        margin-left: 0;
        margin-top: 10px;
    }
}
</style>
