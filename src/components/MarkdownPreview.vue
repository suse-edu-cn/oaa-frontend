<!-- Markdown 预览 -->
<script lang="ts">
import '@/utils/markdown'
</script>

<script lang="ts" setup>
import { computed } from 'vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

import { useSettingsStore } from '@/stores/settings'

defineProps<{
    /** 要预览的 Markdown */
    content: string
}>()

const settings = useSettingsStore()
const theme = computed<'light' | 'dark'>(() => (settings.isDark ? 'dark' : 'light'))
</script>

<template>
    <MdPreview :model-value="content" :theme="theme" no-mermaid no-echarts />
</template>
