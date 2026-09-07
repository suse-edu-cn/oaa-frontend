<script setup lang="ts">
defineOptions({ name: 'PageFooter' })
</script>

<template>
    <footer>
        <div>&copy; 2026 Explosion Production.</div>
        <div>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">蜀ICP备2025175365号-1</a>
        </div>
    </footer>
</template>

<style scoped lang="less">
footer {
    display: flex;
    justify-content: space-between;
    width: 100%;
    color: var(--p-gray-600);
    font-size: 14px;
    padding: 12px 20px;
    border-top: 1px solid #ddd;
    margin-top: 16px;
    line-height: 1.6;
}

@media (max-width: 800px) {
    footer {
        flex-direction: column;
    }
}
</style>
