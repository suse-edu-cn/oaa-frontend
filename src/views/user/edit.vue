<!-- 编辑个人信息页 /user/edit -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'

import { Button, Dialog, IconField, InputIcon, InputText, Message } from 'primevue'
import { Form } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'

import AuthChangePass from '@/components/AuthChangePass.vue'

import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'
import request from '@/utils/request'
import { uploadImage } from '@/utils/uploader'

const router = useRouter()
const authStore = useAuthStore()
const userInfo = authStore.userInfo

const infoSchema = z.object({
    username: z.string().min(1, { message: '请填写用户名' }),
    email: z.email({ message: '请填写有效的邮箱' }),
    avatar: z.string().min(1, { message: '请上传有效的头像' }),
})
const resolver = zodResolver(infoSchema)
// updateData 仅承载表单字段：avatar 保存相对路径 uri，供更新接口使用
const updateData = ref({
    student_id: userInfo?.student_id ?? '',
    name: userInfo?.name ?? '',
    username: userInfo?.username ?? '',
    email: userInfo?.email ?? '',
    avatar: userInfo?.avatar?.uri ?? '',
})
const showChangePass = ref(false) // 修改密码弹窗

async function onUpdateData() {
    if (!infoSchema.safeParse(updateData.value).success) {
        return
    }

    try {
        const resp = await request({
            url: '/user/me/update',
            method: 'POST',
            data: {
                username: updateData.value.username,
                email: updateData.value.email,
                avatar: updateData.value.avatar,
            },
        })
        if (resp.code == 200) {
            setToast('success', '修改成功', '个人信息已更新！')
            await initAuthStore()
            router.push('/user')
        } else {
            setToast('error', '修改失败', resp.message)
        }
    } catch (err: any) {
        setToast('error', '修改失败', err.response.data.message || '未知错误，请联系负责后端的同学')
    }
}

const fileInput = ref<HTMLInputElement | null>(null)
const avatar = ref(userInfo?.avatar?.url || '')

async function uploadAvatar(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) return

    const uploaded = await uploadImage(file, 'avatar')
    if (!uploaded) {
        target.value = ''
        return
    }

    updateData.value.avatar = uploaded.uri
    avatar.value = uploaded.url || avatar.value
    setToast('success', '头像更新成功', '')

    target.value = ''
}

onMounted(() => {
    // 如果因刷新等原因导致 authStore 未初始化，则先 init
    if (!authStore.isReady) {
        initAuthStore()
    }
    if (!authStore.isAuthed) {
        setToast('error', '获取用户信息失败', '当前尚未登录！')
        router.push('/auth')
    }
})
</script>

<template>
    <main>
        <h1 class="e-title">编辑个人信息</h1>

        <Form v-slot="$form" :resolver="resolver" :initial-values="userInfo ?? undefined" @submit="onUpdateData">
            <!-- 头像 -->
            <div class="avatar">
                <div>设置头像</div>
                <br />
                <div class="wrapper" @click="fileInput?.click()">
                    <img :src="avatar" alt="用户头像" />
                    <div class="overlay">
                        <span class="pi pi-upload"></span>
                    </div>
                </div>
                <div class="tip">头像支持 JPG、PNG、GIF、WEBP、AVIF 格式，大小不得超过 4MB</div>
                <input
                    ref="fileInput"
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
                    style="display: none"
                    @change="uploadAvatar"
                />
                <InputText name="avatar" v-model="updateData.avatar" type="hidden" />
            </div>

            <!-- 表单 -->
            <div class="info">
                <div>
                    <label for="student_id">学号</label>
                    <IconField>
                        <InputIcon class="pi pi-id-card" />
                        <InputText name="student_id" v-model="updateData.student_id" disabled />
                    </IconField>
                    <Message severity="error" size="small" variant="simple">&nbsp;</Message>
                </div>
                <div>
                    <label for="name">姓名</label>
                    <IconField>
                        <InputIcon class="pi pi-user" />
                        <InputText name="name" v-model="updateData.name" disabled />
                    </IconField>
                    <Message severity="error" size="small" variant="simple">&nbsp;</Message>
                </div>
                <div>
                    <label for="username">用户名</label>
                    <IconField>
                        <InputIcon class="pi pi-users" />
                        <InputText name="username" v-model="updateData.username" />
                    </IconField>
                    <Message severity="error" size="small" variant="simple">
                        <span v-if="$form.username?.invalid">{{ $form.username.error?.message }}</span
                        >&nbsp;
                    </Message>
                </div>
                <div>
                    <label for="email">邮箱</label>
                    <IconField>
                        <InputIcon class="pi pi-envelope" />
                        <InputText name="email" v-model="updateData.email" />
                    </IconField>
                    <Message severity="error" size="small" variant="simple">
                        <span v-if="$form.email?.invalid">{{ $form.email.error?.message }}</span
                        >&nbsp;
                    </Message>
                </div>

                <div class="button-group">
                    <Button type="submit" label="保存修改" icon="pi pi-save" />
                    <Button
                        type="button"
                        label="修改密码"
                        icon="pi pi-lock"
                        severity="secondary"
                        @click="showChangePass = true"
                    />
                </div>
            </div>
        </Form>

        <!-- 修改密码 -->
        <Dialog v-model:visible="showChangePass" header="修改密码" modal class="reset-dialog">
            <br />
            <AuthChangePass @switch-mode="showChangePass = false" />
        </Dialog>
    </main>
</template>

<style lang="less" scoped>
form {
    display: flex;
    width: 100%;
    flex-direction: var(--container-direction);
    gap: var(--container-gap);

    .avatar {
        flex: 1;

        .wrapper {
            position: relative;
            width: 8rem;
            height: 8rem;
            margin-bottom: 0.5rem;

            img {
                width: 8rem;
                height: 8rem;
                border-radius: 50%;
                border: 1px solid #ddd;
            }

            .overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background-color: rgba(0, 0, 0, 0.25);
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s;
                cursor: pointer;
            }

            &:hover .overlay {
                opacity: 1;
            }
        }

        .tip {
            margin-top: 1rem;
            font-size: 14px;
            color: #666;
        }
    }

    label {
        display: var(--label-display);
        width: 3rem;
        text-align: var(--label-align);
        margin-bottom: 0.5rem;
        margin-right: 1rem;
        font-weight: 500;
    }

    .p-iconfield {
        display: var(--label-display);
    }

    .p-inputtext {
        width: var(--label-width);
        min-width: 15rem;
        max-width: 30rem;
    }

    .p-message {
        margin: 3px 4rem;
    }

    .button-group {
        display: flex;
        gap: 1rem;
        margin: 1rem 0 3rem var(--button-margin);
    }

    --container-direction: row-reverse;
    --container-gap: 5vw;
    --label-align: right;
    --label-display: inline-block;
    --label-width: 25vw;
    --button-margin: 4rem;
}

@media screen and (max-width: 800px) {
    form {
        --container-direction: column;
        --container-gap: 2rem;
        --label-align: left;
        --label-display: block;
        --label-width: 90%;
        --button-margin: 0;
    }
}
</style>

<style lang="less">
// Dialog 默认 teleport 到 body，scoped 样式无法命中，用全局样式控制宽度
.reset-dialog {
    width: 24rem;
    max-width: 90vw;
}
</style>
