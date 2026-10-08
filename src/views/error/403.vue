<script setup lang="ts">
import { Button } from 'primevue'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
    <main>
        <p class="code">403</p>
        <h1 class="e-title">无访问权限</h1>
        <p class="desc">你当前的权限等级不足以访问此页面</p>
        <div class="actions">
            <Button label="返回首页" icon="pi pi-home" @click="router.push('/')" />
            <Button label="返回上一页" icon="pi pi-arrow-left" outlined @click="router.back()" />
        </div>
    </main>
</template>

<style lang="less" scoped>
main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10vh 0;
    text-align: center;

    .code {
        font-size: 96px;
        font-weight: 700;
        line-height: 1.1;
        color: var(--e-color-theme);
    }

    .e-title {
        margin: 12px 0;
    }

    .desc {
        color: var(--p-text-muted-color);
    }

    .actions {
        display: flex;
        gap: 12px;
    }
}
</style>
