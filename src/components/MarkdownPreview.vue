<!-- Markdown 预览 -->
<script lang="ts">
import '@/utils/markdown'
</script>

<script lang="ts" setup>
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

defineProps<{
    /** 要预览的 Markdown */
    content: string
}>()
</script>

<template>
    <MdPreview :model-value="content" />
</template>
