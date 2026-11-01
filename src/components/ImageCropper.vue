<!-- 图片裁剪弹窗 -->
<script lang="ts" setup>
import { ref, watch } from 'vue'

import { Button, Dialog } from 'primevue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

import setToast from '@/utils/setToast'

const props = withDefaults(
    defineProps<{
        /** 裁剪框宽高比 */
        aspect?: number
        /** 输出图片的边长 */
        outputSize?: number
        /** 调用方正在上传 */
        uploading?: boolean
    }>(),
    {
        aspect: 1,
        outputSize: 512,
        uploading: false,
    }
)

const emit = defineEmits<{ cropped: [blob: Blob] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const cropVisible = ref(false)
const cropSrc = ref('')
const cropImgEl = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null
let cropFile: File | null = null

function open() {
    fileInput.value?.click()
}

function close() {
    cropVisible.value = false
}
defineExpose({ open, close })

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
        aspectRatio: props.aspect,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        background: false,
    })
}

async function onCropConfirm() {
    if (!cropper || !cropFile || props.uploading) return

    const canvas = cropper.getCroppedCanvas({ width: props.outputSize, height: props.outputSize })
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
    if (!blob) {
        setToast('error', '图片上传失败', '裁剪生成图片失败，请重试')
        return
    }

    emit('cropped', blob)
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

    <Dialog
        v-model:visible="cropVisible"
        header="裁剪图片"
        modal
        :closable="!uploading"
        :close-on-escape="!uploading"
        class="dialog-cropper"
    >
        <img ref="cropImgEl" :src="cropSrc" class="crop-img" alt="待裁剪图片" @load="initCropper" />
        <template #footer>
            <Button label="取消" severity="secondary" text :disabled="uploading" @click="close" />
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

@media screen and (max-width: 800px) {
    .dialog-cropper {
        .p-dialog-content {
            max-width: 100%;
            max-height: 60vh;
        }

        .cropper-container {
            max-width: calc(100vw - 48px);
            max-height: calc(60vh - 18px);
        }
    }
}
</style>
