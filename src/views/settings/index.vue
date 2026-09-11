<script setup lang="ts">
import { version, bugs } from '../../../package.json'
const gitVersion: string = __GIT_VERSION__
</script>

<template>
    <main>
        <h1 class="e-title">设置</h1>
        <div class="settings-list">
            <div class="setting-catalog">关于工作台</div>
            <div class="setting-card">
                <a :href="bugs.url" class="section" target="_blank" rel="noopener noreferrer">
                    <i class="pi pi-lightbulb"></i>
                    <span class="key">使用反馈</span>
                    <span class="value">
                        <i class="pi pi-arrow-right"></i>
                    </span>
                </a>
                <div class="divider"></div>
                <div class="section">
                    <i class="pi pi-code"></i>
                    <span class="key">工作台版本</span>
                    <span class="value">v{{ version }}</span>
                </div>
                <div class="divider"></div>
                <div class="section">
                    <i class="pi pi-box"></i>
                    <span class="key">编译版本</span>
                    <span class="value">{{ gitVersion }}</span>
                </div>
            </div>
        </div>
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

    a.section {
        transition: all 0.3s;

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
</style>
