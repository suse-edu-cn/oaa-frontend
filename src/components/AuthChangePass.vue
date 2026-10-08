<script setup lang="ts">
import { ref } from 'vue'
import { z } from 'zod'
import { Button, FloatLabel, IconField, InputIcon, InputText, Message } from 'primevue'
import { Form } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'

import AuthResetPass from '@/components/AuthResetPass.vue'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

const emit = defineEmits<{ switchMode: [] }>()

// change 为修改密码表单，reset 为忘记原密码时的重置流程
const mode = ref('change')

const initialValues = ref({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
})

const changeData = ref({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
})

const changeSchema = z
    .object({
        oldPassword: z.string().min(1, { message: '请填写旧密码' }),
        newPassword: z.string().min(1, { message: '请填写新密码' }),
        confirmPassword: z.string().min(1, { message: '请再次输入新密码' }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: '两次输入的新密码不一致',
        path: ['confirmPassword'],
    })
const changeResolver = zodResolver(changeSchema)

const isSubmitting = ref(false)

async function onChangePass() {
    if (isSubmitting.value) return
    if (!changeSchema.safeParse(changeData.value).success) {
        return
    }

    isSubmitting.value = true
    try {
        const resp = await request({
            url: '/auth/password/update',
            method: 'POST',
            data: {
                old_password: changeData.value.oldPassword,
                new_password: changeData.value.newPassword,
            },
        })

        if (resp.code == 200) {
            setToast('success', '密码修改成功', '请使用新密码重新登录')
            emit('switchMode')
        } else {
            setToast('error', '修改失败', resp.message)
        }
    } catch (err: any) {
        setToast('error', '修改失败', err.response?.data?.message || '未知错误，请联系负责后端的同学')
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <!-- 忘记原密码时切换到重置流程 -->
    <AuthResetPass v-if="mode === 'reset'" :scene="1" @switch-mode="mode = 'change'" />

    <Form
        v-else
        v-slot="$form"
        :resolver="changeResolver"
        :initial-values="initialValues"
        class="wrapper"
        @submit="onChangePass"
    >
        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-lock" />
                    <InputText
                        v-model="changeData.oldPassword"
                        name="oldPassword"
                        type="password"
                        size="large"
                        class="input-box"
                    />
                </IconField>
                <label for="on_label">旧密码</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.oldPassword?.invalid">{{ $form.oldPassword.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-key" />
                    <InputText
                        v-model="changeData.newPassword"
                        name="newPassword"
                        type="password"
                        size="large"
                        class="input-box"
                    />
                </IconField>
                <label for="on_label">新密码</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.newPassword?.invalid">{{ $form.newPassword.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-shield" />
                    <InputText
                        v-model="changeData.confirmPassword"
                        name="confirmPassword"
                        type="password"
                        size="large"
                        class="input-box"
                    />
                </IconField>
                <label for="on_label">确认新密码</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.confirmPassword?.invalid">{{ $form.confirmPassword.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <br />
        <Button type="submit" label="修改密码" class="input-box" :loading="isSubmitting" />

        <p class="link" @click="mode = 'reset'">忘记原密码？重置密码</p>
    </Form>
</template>

<style lang="less" scoped>
.wrapper {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: 4px;
    justify-content: center;
    align-items: center;

    .input-box {
        width: 100%;
    }

    .link {
        color: var(--e-color-theme);
        cursor: pointer;
    }
}
</style>
