<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { z } from 'zod'
import { Button, FloatLabel, IconField, InputIcon, InputText, Message } from 'primevue'
import { Form } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'

import { resetPassword, sendVerificationCode } from '@/api/auth'
import setToast from '@/utils/setToast'

withDefaults(
    defineProps<{
        // 0: AuthView 登录页
        // 1: 用户编辑页弹窗内
        scene?: number
    }>(),
    { scene: 0 }
)

const emit = defineEmits<{ switchMode: [] }>()

const initialValues = ref({
    account: '',
    code: '',
    password: '',
    confirmPassword: '',
})

const resetData = ref({
    account: '',
    code: '',
    password: '',
    confirmPassword: '',
})

const resetSchema = z
    .object({
        account: z.string().min(1, { message: '请填写用户名、学号或邮箱' }),
        code: z.string().regex(/^\d{6}$/, { message: '验证码格式错误' }),
        password: z.string().min(1, { message: '请填写新密码' }),
        confirmPassword: z.string().min(1, { message: '请再次输入新密码' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: '两次输入的新密码不一致',
        path: ['confirmPassword'],
    })
const resetResolver = zodResolver(resetSchema)

// 发送验证码
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const isSending = ref(false)

async function sendCode() {
    if (isSending.value || countdown.value > 0) {
        return
    }

    if (!resetSchema.shape.account.safeParse(resetData.value.account).success) {
        setToast('warn', '无法发送验证码', '请先填写用户名、学号或邮箱')
        return
    }

    isSending.value = true
    try {
        const resp = await sendVerificationCode({
            account: resetData.value.account,
            scene: 'reset_password',
        })

        if (resp?.code == 200) {
            setToast('success', '验证码已发送', '请前往账号绑定的邮箱查收')
            countdown.value = 60
            countdownTimer = setInterval(() => {
                countdown.value--
                if (countdown.value <= 0 && countdownTimer) {
                    clearInterval(countdownTimer)
                    countdownTimer = null
                }
            }, 1000)
        } else {
            setToast('error', '发送失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } catch (err: any) {
        setToast('error', '发送失败', err.response?.data?.message || '未知错误，请联系负责后端的同学')
    } finally {
        isSending.value = false
    }
}

onUnmounted(() => {
    if (countdownTimer) {
        clearInterval(countdownTimer)
    }
})

const isSubmitting = ref(false)

async function onReset() {
    if (isSubmitting.value) return
    if (!resetSchema.safeParse(resetData.value).success) {
        return
    }

    isSubmitting.value = true
    try {
        const resp = await resetPassword({
            account: resetData.value.account,
            code: resetData.value.code,
            password: resetData.value.password,
        })

        if (resp?.code == 200) {
            setToast('success', '重置成功', '请使用新密码登录')
            emit('switchMode')
        } else {
            setToast('error', '重置失败', resp?.message || '未知错误，请联系负责后端的同学')
        }
    } catch (err: any) {
        setToast('error', '重置失败', err.response?.data?.message || '未知错误，请联系负责后端的同学')
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <Form v-slot="$form" :resolver="resetResolver" :initial-values="initialValues" class="wrapper" @submit="onReset">
        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-user" />
                    <InputText v-model="resetData.account" name="account" size="large" class="input-box" />
                </IconField>
                <label for="on_label">用户名 / 学号 / 邮箱</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.account?.invalid">{{ $form.account.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <div class="code-row">
                <FloatLabel variant="on" class="code-field">
                    <IconField>
                        <InputIcon class="pi pi-unlock" />
                        <InputText v-model="resetData.code" name="code" size="large" class="code-input" />
                    </IconField>
                    <label for="on_label">验证码</label>
                </FloatLabel>
                <Button
                    type="button"
                    class="send-btn"
                    :label="countdown > 0 ? `${countdown}s 后重发` : '发送验证码'"
                    :disabled="countdown > 0"
                    :loading="isSending"
                    @click="sendCode"
                />
            </div>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.code?.invalid">{{ $form.code.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-key" />
                    <InputText
                        v-model="resetData.password"
                        name="password"
                        type="password"
                        size="large"
                        class="input-box"
                    />
                </IconField>
                <label for="on_label">新密码</label>
            </FloatLabel>
            <Message severity="error" size="small" variant="simple">
                <span v-if="$form.password?.invalid">{{ $form.password.error?.message }}</span
                >&nbsp;
            </Message>
        </div>

        <div class="input-box">
            <FloatLabel variant="on">
                <IconField>
                    <InputIcon class="pi pi-shield" />
                    <InputText
                        v-model="resetData.confirmPassword"
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
        <Button type="submit" label="重置密码" class="input-box" :loading="isSubmitting" />

        <p class="link" @click="emit('switchMode')">{{ scene === 0 ? '返回登录' : '返回修改密码' }}</p>
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

    .code-row {
        display: flex;
        gap: 8px;
        align-items: center;

        .code-field {
            flex: 1;

            .code-input {
                width: 100%;
            }
        }

        .send-btn {
            flex-shrink: 0;
        }
    }

    .link {
        color: var(--e-color-theme);
        cursor: pointer;
    }
}
</style>
