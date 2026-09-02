<script setup lang="ts">
import { version } from '../../package.json'
const gitVersion: string = __GIT_VERSION__
</script>

<template>
    <main>
        <h1 class="e-title">设置</h1>
        <div class="settings-list">
            <div class="setting-catalog">关于工作台</div>
            <div class="setting-card e-card">
                <div class="card-left">
                    <i class="pi pi-code"></i>
                    <span>编译版本</span>
                </div>
                <div class="card-right">
                    <span>{{ gitVersion }}</span>
                </div>
            </div>
            <div class="setting-card e-card">
                <div class="card-left">
                    <i class="pi pi-box"></i>
                    <span>工作台版本</span>
                </div>
                <div class="card-right">
                    <span>v{{ version }}</span>
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
    padding: 12px;
}

.setting-card {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 20px !important;

    .card-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 0 1 auto;

        i {
            font-size: 22px;
            color: var(--e-color-theme);
        }
    }

    .card-right {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex: 0 1 auto;

        span {
            font-size: 15px;
            color: var(--p-menu-submenu-label-color);
        }
    }
}
</style>
