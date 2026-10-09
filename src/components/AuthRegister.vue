<script setup lang="ts">
import { ref } from 'vue'
import { z } from 'zod'

import { Button, Checkbox, FloatLabel, IconField, InputIcon, InputText, Message } from 'primevue'
import { Form } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'

import { register } from '@/api/auth'
import setToast from '@/utils/setToast'

const emit = defineEmits<{ switchMode: [] }>()

const initialValues = ref({
    student_id: '',
    name: '',
    username: '',
    email: '',
    password: '',
})

const registerData = ref({
    student_id: '',
    username: '',
    name: '',
    email: '',
    password: '',
})

// 用户协议勾选
const isAccepted = ref(false)

const registerSchema = z.object({
    student_id: z.string().min(1, { message: '请填写学号' }).regex(/^\d+$/, { message: '学号必须为数字' }),
    name: z.string().min(1, { message: '请填写姓名' }),
    username: z.string().min(1, { message: '请填写用户名' }),
    email: z.email({ message: '邮箱格式不正确' }),
    password: z.string().min(1, { message: '请填写密码' }),
})
const registerResolver = zodResolver(registerSchema)

const isSubmitting = ref(false)

async function onRegister() {
    if (isSubmitting.value) return
    if (!isAccepted.value) {
        setToast('warn', '无法注册', '请先阅读并同意《用户协议》')
        return
    }

    if (!registerSchema.safeParse(registerData.value).success) {
        return
    }

    isSubmitting.value = true
    try {
        const resp = await register(registerData.value)

        if (resp?.code == 200) {
            setToast('success', '注册成功', '使用你的通行证登录吧！')
            emit('switchMode')
        } else {
            setToast('error', '注册失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } catch (err: any) {
        setToast('error', '注册失败', err.response?.data?.message || '未知错误，请联系负责后端的同学')
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <Form
        v-slot="$form"
        :resolver="registerResolver"
        :initial-values="initialValues"
        class="wrapper"
        @submit="onRegister"
    >
        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-id-card" />
                    <InputText v-model="registerData.student_id" name="student_id" size="large" class="input-box" />
                </IconField>
                <label for="on_label">学号</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.student_id?.invalid">{{ $form.student_id.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-user" />
                    <InputText v-model="registerData.name" name="name" size="large" class="input-box" />
                </IconField>
                <label for="on_label">姓名</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.name?.invalid">{{ $form.name.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-users" />
                    <InputText v-model="registerData.username" name="username" size="large" class="input-box" />
                </IconField>
                <label for="on_label">用户名</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.username?.invalid">{{ $form.username.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-envelope" />
                    <InputText v-model="registerData.email" name="email" size="large" class="input-box" />
                </IconField>
                <label for="on_label">邮箱</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.email?.invalid">{{ $form.email.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-lock" />
                    <InputText
                        v-model="registerData.password"
                        name="password"
                        type="password"
                        size="large"
                        class="input-box"
                    />
                </IconField>
                <label for="on_label">密码</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.password?.invalid">{{ $form.password.error?.message }}</span
                >&nbsp;
            </Message>
        </div>
        <div class="input-box">
            <Checkbox v-model="isAccepted" input-id="isAccepted" name="isAccepted" binary />
            <label for="isAccepted">&nbsp;&nbsp;我已阅读并同意<a href="#" target="_blank">《用户协议》</a></label>
        </div>
        <br />
        <Button type="submit" label="注册" class="input-box" :loading="isSubmitting" />
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
}
</style>
