<!-- Markdown 编辑器   md-editor-v3 统一封装 -->

<script lang="ts">
// 使用本地依赖，避免从 unpkg 引入
// 注：初始化只需要在组件被引入时执行一次，故不放 setup 中
import { config } from 'md-editor-v3'
import hljs from 'highlight.js/lib/common'
import katex from 'katex'
import Cropper from 'cropperjs'
import screenfull from 'screenfull'

import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'
import 'cropperjs/dist/cropper.css'

config({
    editorExtensions: {
        highlight: { instance: hljs },
        cropper: { instance: Cropper },
        screenfull: { instance: screenfull },
        katex: { instance: katex },
    },
})
</script>

<script lang="ts" setup>
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

import { uploadImage } from '@/utils/uploader'

import type { UploadImgCallBack } from 'md-editor-v3'
import type { UploadResponse } from '@/types'

const props = withDefaults(
    defineProps<{
        placeholder?: string
        /** 编辑区最小高度 */
        minHeight?: string
        /** 图片上传场景，后端用于区分图片用途 */
        imgScene: string
    }>(),
    {
        placeholder: '请输入内容，支持 Markdown',
        minHeight: '480px',
    }
)

const content = defineModel<string>({ default: '' })

async function onUploadImg(files: File[], callback: UploadImgCallBack) {
    const results = await Promise.all(files.map((file) => uploadImage(file, props.imgScene)))
    callback(
        results
            .filter((r): r is UploadResponse => r !== null)
            .map((r) => ({ url: r.url, alt: 'image', title: 'image' }))
    )
}
</script>

<template>
    <MdEditor
        v-model="content"
        :placeholder="placeholder"
        :style="{ minHeight }"
        no-prettier
        no-mermaid
        no-echarts
        @on-upload-img="onUploadImg"
    />
</template>
