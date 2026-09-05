<!--
    简易图片灯箱！
    其实是不想用 Fancybox 也用不了 Primevue v5 的 Gallery，所以让 AI 整出来的小东西（笑
-->
<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const visible = defineModel<boolean>()
const props = defineProps<{
    /** 图片地址 */
    src?: string
    alt?: string
}>()

const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const transform = computed(() => `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`)

function reset() {
    scale.value = 1
    offset.value = { x: 0, y: 0 }
}

function close() {
    visible.value = false
}

// 缩放，以相对 viewport 中心的偏移为锚点，默认为 viewport 中心
function zoomAt(factor: number, cx = 0, cy = 0) {
    const next = Math.min(8, Math.max(0.2, scale.value * factor))
    if (next === scale.value) return
    // 缩放前后锚点须指向图片上的同一点：m = t + s·p，求 s' 下的 t'
    offset.value = {
        x: cx - (next * (cx - offset.value.x)) / scale.value,
        y: cy - (next * (cy - offset.value.y)) / scale.value,
    }
    scale.value = next
}

// 滚轮缩放，以鼠标位置为锚点
function onWheel(event: WheelEvent) {
    zoomAt(
        event.deltaY > 0 ? 1 / 1.2 : 1.2,
        event.clientX - window.innerWidth / 2,
        event.clientY - window.innerHeight / 2
    )
}

function zoomIn() {
    zoomAt(1.2)
}
function zoomOut() {
    zoomAt(1 / 1.2)
}
const displayScale = computed(() => `${Math.round(scale.value * 100)}%`)

// 拖拽平移
const dragging = ref(false)
let dragStart = { x: 0, y: 0, ox: 0, oy: 0 }
function onPointerDown(event: PointerEvent) {
    dragging.value = true
    dragStart = { x: event.clientX, y: event.clientY, ox: offset.value.x, oy: offset.value.y }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function onPointerMove(event: PointerEvent) {
    if (!dragging.value) return
    offset.value = {
        x: dragStart.ox + event.clientX - dragStart.x,
        y: dragStart.oy + event.clientY - dragStart.y,
    }
}
function onPointerUp() {
    dragging.value = false
}
function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') close()
}

// 打开时锁背景滚动并监听 ESC
watch(visible, (value) => {
    if (value) {
        reset()
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeydown)
    } else {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', onKeydown)
    }
})
onBeforeUnmount(() => {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
    <Teleport to="body">
        <Transition name="fade">
            <div v-if="visible" class="lightbox" @click="close">
                <img
                    :src="props.src"
                    :alt="props.alt ?? ''"
                    :style="{ transform }"
                    draggable="false"
                    @wheel.prevent="onWheel"
                    @dblclick="reset"
                    @pointerdown="onPointerDown"
                    @pointermove="onPointerMove"
                    @pointerup="onPointerUp"
                    @pointercancel="onPointerUp"
                    @click.stop
                />
                <button class="circle-btn close" type="button" aria-label="关闭" @click="close">
                    <i class="pi pi-times"></i>
                </button>
                <div class="controls" @click.stop>
                    <button class="circle-btn" type="button" aria-label="放大" @click="zoomIn">
                        <i class="pi pi-plus"></i>
                    </button>
                    <span class="scale">{{ displayScale }}</span>
                    <button class="circle-btn" type="button" aria-label="缩小" @click="zoomOut">
                        <i class="pi pi-minus"></i>
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style lang="less" scoped>
.lightbox {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.8);

    img {
        max-width: 90vw;
        max-height: 90vh;
        user-select: none;
        cursor: grab;

        &:active {
            cursor: grabbing;
        }
    }

    .circle-btn {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.15);
        color: #fff;
        font-size: 16px;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
            background-color: rgba(255, 255, 255, 0.3);
        }
    }

    .close {
        position: absolute;
        top: 16px;
        right: 16px;
    }

    .controls {
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 12px;

        .scale {
            min-width: 72px;
            text-align: center;
            font-size: 18px;
            color: #fff;
            user-select: none;
        }
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
