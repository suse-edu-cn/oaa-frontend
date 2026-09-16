<!-- 图片裁剪上传弹窗 -->
<script lang="ts" setup>
import { ref, watch } from 'vue'

import { Button, Dialog } from 'primevue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

import setToast from '@/utils/setToast'
import { uploadImage } from '@/utils/uploader'

import type { UploadResponse } from '@/types'

const props = defineProps<{
    /** 图片上传场景 */
    imgScene: string
}>()

const emit = defineEmits<{
    uploaded: [UploadResponse]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const cropVisible = ref(false)
const cropSrc = ref('')
const cropImgEl = ref<HTMLImageElement | null>(null)
const uploading = ref(false)
let cropper: Cropper | null = null
let cropFile: File | null = null

function open() {
    fileInput.value?.click()
}
defineExpose({ open })
function onFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    // 先清空 input，保证同一文件可重复选择
    target.value = ''
    if (!file) return

    cropFile = file
    cropSrc.value = URL.createObjectURL(file)
    cropVisible.value = true
}

// 初始化cropper
function initCropper() {
    if (!cropImgEl.value) return
    cropper?.destroy()
    cropper = new Cropper(cropImgEl.value, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        background: false,
    })
}
async function onCropConfirm() {
    if (!cropper || !cropFile) return

    uploading.value = true
    try {
        const canvas = cropper.getCroppedCanvas({ width: 512, height: 512 })
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve))
        if (!blob) {
            setToast('error', '图片上传失败', '裁剪生成图片失败，请重试')
            return
        }
        const uploaded = await uploadImage(new File([blob], 'image.png'), props.imgScene)
        if (!uploaded) return

        emit('uploaded', uploaded)
        cropVisible.value = false
    } finally {
        uploading.value = false
    }
}

// 弹窗关闭后，销毁cropper，释放临时图片
watch(cropVisible, (visible) => {
    if (visible) return
    cropper?.destroy()
    cropper = null
    if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
    cropSrc.value = ''
    cropFile = null
})
</script>

<template>
    <input
        ref="fileInput"
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
        style="display: none"
        @change="onFileChange"
    />

    <Dialog v-model:visible="cropVisible" header="裁剪图片" modal :closable="!uploading" class="dialog-cropper">
        <img ref="cropImgEl" :src="cropSrc" class="crop-img" alt="待裁剪图片" @load="initCropper" />
        <template #footer>
            <Button label="取消" severity="secondary" text :disabled="uploading" @click="cropVisible = false" />
            <Button label="确认并上传" icon="pi pi-upload" :loading="uploading" @click="onCropConfirm" />
        </template>
    </Dialog>
</template>

<style lang="less">
.dialog-cropper {
    .p-dialog-content {
        max-width: 60vw;
        max-height: 55vh;
        padding: 0;
    }

    .cropper-container {
        max-width: calc(60vw - 48px);
        max-height: calc(55vh - 18px);
        margin: 0 24px 18px 24px;
    }
}
</style>
