<!-- 二次确认对话框 -->
<script lang="ts" setup>
import { ref, useId, watch } from 'vue'
import { Button, Checkbox, Dialog } from 'primevue'

const visible = defineModel<boolean>({ default: false })

withDefaults(
    defineProps<{
        /** 确认操作进行中 */
        loading?: boolean
        /** 确认按钮的样式 */
        confirmButton?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast'
    }>(),
    {
        loading: false,
        confirmButton: 'danger',
    }
)

const emit = defineEmits<{ confirm: [] }>()

const ackId = useId()
const acknowledged = ref(false)

// 每次打开时重置勾选状态
watch(visible, (value) => {
    if (value) acknowledged.value = false
})
</script>

<template>
    <Dialog v-model:visible="visible" modal :header="'确认操作'" :style="{ width: '26rem' }">
        <slot />
        <div :style="{ margin: '1rem 0' }">
            <Checkbox v-model="acknowledged" :input-id="ackId" binary />&nbsp;
            <label :for="ackId">我已知晓该操作不可恢复</label>
        </div>
        <template #footer>
            <Button label="取消" severity="secondary" text @click="visible = false" />
            <Button
                label="确认"
                :severity="confirmButton"
                :disabled="!acknowledged"
                :loading="loading"
                @click="emit('confirm')"
            />
        </template>
    </Dialog>
</template>
