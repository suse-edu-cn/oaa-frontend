<!-- 图片选择与上传：预览、遮罩、可选裁剪、上传中状态 -->
<script lang="ts" setup>
import { computed, ref } from 'vue'

import { uploadImage } from '@/utils/uploader'
import ImageCropper from '@/components/ImageCropper.vue'

import type { UploadResponse } from '@/types'

const props = withDefaults(
    defineProps<{
        /** 上传场景，后端用于区分用途 */
        scene: string
        /** 是否需要裁剪 */
        cropper?: boolean
        width?: string
        height?: string
        /** 圆形预览 */
        round?: boolean
        alt?: string
        ariaLabel?: string
        /** 无图时的占位图标 */
        placeholderIcon?: string
        placeholderSize?: string
    }>(),
    {
        cropper: false,
        width: '160px',
        height: '180px',
        round: false,
        alt: '',
        ariaLabel: '选择图片',
        placeholderIcon: 'pi pi-user',
        placeholderSize: '2.5rem',
    }
)

const uri = defineModel<string>('uri', { default: '' })
const url = defineModel<string>('url', { default: '' })

const emit = defineEmits<{ uploaded: [value: UploadResponse] }>()

defineOptions({ inheritAttrs: false })

const fileInput = ref<HTMLInputElement | null>(null)
const cropperRef = ref<InstanceType<typeof ImageCropper> | null>(null)
const uploading = ref(false)
let uploadSeq = 0

// 上传加载状态
const showSpinner = computed(() => uploading.value && !props.cropper)

function openPicker() {
    if (uploading.value) return
    if (props.cropper) {
        cropperRef.value?.open()
        return
    }
    fileInput.value?.click()
}

function applyUploaded(uploaded: UploadResponse) {
    uri.value = uploaded.uri
    url.value = uploaded.url ?? ''
    emit('uploaded', uploaded)
}

async function onFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    // 无选择文件或正在上传时都不受理，清空后同一张图才能再次选择
    if (!file || uploading.value) {
        target.value = ''
        return
    }

    const seq = ++uploadSeq
    uploading.value = true
    try {
        const uploaded = await uploadImage(file, props.scene)
        // 只采用最后一次上传的结果
        if (seq !== uploadSeq || !uploaded) return
        applyUploaded(uploaded)
    } finally {
        if (seq === uploadSeq) uploading.value = false
        target.value = ''
    }
}

// 裁剪完成
async function onCropped(blob: Blob) {
    if (uploading.value) return

    const seq = ++uploadSeq
    uploading.value = true
    try {
        const file = new File([blob], 'image.webp', { type: 'image/webp' })
        const uploaded = await uploadImage(file, props.scene)
        if (seq !== uploadSeq || !uploaded) return

        applyUploaded(uploaded)
        cropperRef.value?.close()
    } finally {
        if (seq === uploadSeq) uploading.value = false
    }
}
</script>

<template>
    <div
        v-bind="$attrs"
        class="image-uploader"
        :class="{ uploading, round }"
        :style="{ width, height }"
        role="button"
        :tabindex="uploading ? -1 : 0"
        :aria-busy="uploading"
        :aria-disabled="uploading"
        :aria-label="ariaLabel"
        @click="openPicker"
        @keydown.enter.prevent="openPicker"
        @keydown.space.prevent="openPicker"
    >
        <img v-if="url" :src="url" :alt="alt" />
        <div v-else class="placeholder" :style="{ fontSize: placeholderSize }">
            <i :class="placeholderIcon"></i>
        </div>
        <div class="overlay">
            <i v-if="showSpinner" class="pi pi-spin pi-spinner" aria-hidden="true"></i>
            <i v-else class="pi pi-upload" aria-hidden="true"></i>
        </div>
    </div>

    <input
        v-if="!cropper"
        ref="fileInput"
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
        class="file-input"
        @change="onFileChange"
    />

    <ImageCropper v-if="cropper" ref="cropperRef" :uploading="uploading" @cropped="onCropped" />
</template>

<style lang="less" scoped>
.image-uploader {
    position: relative;
    display: block;
    flex-shrink: 0;
    cursor: pointer;

    img,
    .placeholder {
        width: 100%;
        height: 100%;
        border-radius: var(--e-border-radius);
        border: 1px solid var(--e-border-color);
    }

    img {
        object-fit: cover;
    }

    .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--p-text-muted-color);
        background-color: var(--e-surface-subtle);
    }

    .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--e-border-radius);
        background-color: rgba(0, 0, 0, 0.25);
        color: #fff;
        opacity: 0;
        transition: opacity 0.3s;
        cursor: pointer;

        i {
            font-size: 1.25rem;
        }
    }

    &.round {
        img,
        .placeholder,
        .overlay {
            border-radius: 50%;
        }
    }

    &:hover .overlay,
    &:focus-visible .overlay {
        opacity: 1;
    }

    &:focus-visible {
        outline: 2px solid var(--e-color-theme);
        outline-offset: 2px;
    }

    // 上传遮罩
    &.uploading {
        cursor: progress;

        .overlay {
            opacity: 1;
            background-color: var(--e-overlay-bg);
            cursor: progress;
        }
    }
}

.file-input {
    display: none;
}
</style>
