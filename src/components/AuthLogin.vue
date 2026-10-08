<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import cookies from 'js-cookie'

import { Button, Checkbox, FloatLabel, IconField, InputIcon, InputText, Message } from 'primevue'
import { Form } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'

import { initAuthStore } from '@/utils/initAuthStore'
import request from '@/utils/request'
import setToast from '@/utils/setToast'

const router = useRouter()
const emit = defineEmits<{ forgot: [] }>()

const initialValues = ref({
    account: '',
    password: '',
    isAccepted: false,
})

const loginData = ref({
    account: '',
    password: '',
    device: 'web',
    isAccepted: false,
})

const loginSchema = z.object({
    account: z.string().min(1, { message: '请填写用户名' }),
    password: z.string().min(1, { message: '请填写密码' }),
    isAccepted: z.literal(true),
})
const loginResolver = zodResolver(loginSchema)

const isSubmitting = ref(false)

async function onLogin() {
    if (isSubmitting.value) return
    if (!loginSchema.safeParse(loginData.value).success) {
        return
    }

    isSubmitting.value = true
    try {
        const resp = await request({
            url: '/auth/login',
            method: 'POST',
            data: loginData.value,
        })

        if (resp.code == 200) {
            cookies.set('token', resp.data.token, {
                expires: 20,
                secure: true,
                sameSite: 'Lax',
                path: '/',
            })
            // 刷新令牌单独持久化，供后续刷新流程使用（TODO: 接入刷新接口）
            cookies.set('refresh_token', resp.data.refresh_token, {
                expires: 20,
                secure: true,
                sameSite: 'Lax',
                path: '/',
            })
            await initAuthStore()
            router.push('/user')
        } else {
            setToast('error', '登录失败', resp.message)
        }
    } catch (err: any) {
        setToast('error', '登录失败', err.response?.data?.message || '未知错误，请联系负责后端的同学')
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <Form v-slot="$form" :resolver="loginResolver" :initial-values="initialValues" class="wrapper" @submit="onLogin">
        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-users" />
                    <InputText v-model="loginData.account" name="account" size="large" class="input-box" />
                </IconField>
                <label for="on_label">用户名 / 邮箱 / 学号</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.account?.invalid">{{ $form.account.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-lock" />
                    <InputText
                        v-model="loginData.password"
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
            <Checkbox v-model="loginData.isAccepted" input-id="isAccepted" name="isAccepted" binary />
            <label for="isAccepted">&nbsp;&nbsp;我已阅读并同意<a href="#" target="_blank">《用户协议》</a></label>
        </div>

        <br />
        <Button type="submit" label="登录" class="input-box" :loading="isSubmitting" />

        <p class="link" @click="emit('forgot')">忘记密码？</p>
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
