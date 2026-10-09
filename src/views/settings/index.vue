<script setup lang="ts">
import { ref } from 'vue'
import { Dialog } from 'primevue'

const showBuildDialog = ref(false)

// vite 注入的版本信息
const buildInfo = __BUILD_INFO__
const buildDate = new Date(__BUILD_INFO__.date).toLocaleString('zh-CN', { hour12: false })
</script>

<template>
    <main>
        <h1 class="e-title">设置</h1>
        <div class="settings-list">
            <div class="setting-catalog">关于工作台</div>
            <div class="setting-card">
                <a
                    :href="buildInfo.repo + '/issues'"
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
        <Dialog v-model:visible="showBuildDialog" modal header="版本信息" :style="{ minWidth: '24rem' }">
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
                    <span>{{ buildDate }}</span>
                </div>
                <div class="item">
                    <span>构建环境</span>
                    <span>{{ buildInfo.env }}</span>
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
    line-height: 2.4;

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
</style>
