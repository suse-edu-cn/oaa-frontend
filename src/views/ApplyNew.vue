<!-- 创建申请页 /apply/new -->
<script lang="ts" setup>
import { computed, onMounted, reactive, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'

import { Button, Checkbox, DatePicker, InputText, Message, Select, Textarea, ToggleSwitch } from 'primevue'

import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import request from '@/utils/request'
import { uploadImage } from '@/utils/uploader'
import setToast from '@/utils/setToast'
import type { ApiResponse } from '@/types/api'
import type { ApplicationCreateData } from '@/types/application'
import type { TermInfo } from '@/types/term'

const router = useRouter()
const authStore = useAuthStore()
const orgStore = useOrgStore()

const applicationSchema = z.object({
    college: z.string().min(1, { message: '请填写学院' }),
    major_class: z.string().min(1, { message: '请填写班级' }),
    gender: z.string().min(1, { message: '请选择性别' }),
    phone: z.string().regex(/^1\d{10}$/, { message: '请填写有效的手机号' }),
    qq: z.string().regex(/^\d{5,10}$/, { message: '请填写有效的 QQ 号' }),
    political_status: z.string().min(1, { message: '请填写政治面貌' }),
    birth_date: z.string().min(10, { message: '请选择出生日期' }),
    avatar: z.string().min(1, { message: '请上传头像' }),
    resume: z.string().min(1, { message: '请填写简历' }),
    reason: z.string().min(1, { message: '请填写申请理由' }),
})

const formData = ref({
    termId: null as number | null,
    college: '',
    major_class: '',
    gender: '',
    phone: '',
    qq: '',
    political_status: '',
    avatar: '',
    firstDept: null as number | null,
    firstRole: null as number | null,
    secondDept: null as number | null,
    secondRole: null as number | null,
    allow_adjust: false,
    resume: '',
    reason: '',
})
const birthDate = ref<Date | null>(null)
// 信息属实确认
const confirmed = ref(false)
const confirmId = useId()
const submitting = ref(false)

// ================= 周期 =================
const terms = ref<TermInfo[]>([])

// 加载可选的活动周期
async function loadTerms() {
    const resp = await request<ApiResponse<TermInfo[]>>({
        url: '/term/list',
        method: 'GET',
    })
    if (resp?.code == 200) {
        terms.value = resp.data ?? []
    } else {
        setToast('error', '获取活动周期列表失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

// 图片上传处理
const fileInput = ref<HTMLInputElement | null>(null)
const avatarUrl = ref('')

async function uploadAvatar(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const uploaded = await uploadImage(file, 'application')
    if (!uploaded) {
        target.value = ''
        return
    }

    formData.value.avatar = uploaded.uri
    avatarUrl.value = uploaded.url || avatarUrl.value
    setToast('success', '头像上传成功', '')

    target.value = ''
}

// ================= 提交 =================
function toDateString(d: Date | null) {
    if (!d) return ''
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
}

// 已交互过的字段
const touched = reactive(new Set<string>())
const initial = { ...formData.value }
// 边填边显示其格式错误
watch(
    [formData, birthDate],
    () => {
        for (const key of Object.keys(formData.value) as (keyof typeof initial)[]) {
            if (formData.value[key] !== initial[key]) touched.add(key)
        }
        if (birthDate.value) touched.add('birth_date')
    },
    { deep: true }
)

// 全量校验各字段
const allErrors = computed<Record<string, string>>(() => {
    const result: Record<string, string> = {}

    // 申请周期必须选择
    if (!formData.value.termId) result.termId = '请选择申请周期'

    // 志愿的部门与职位需成对填写
    if (!formData.value.firstDept) result.firstDept = '请选择第一志愿的部门'
    if (!formData.value.firstRole) result.firstRole = '请选择第一志愿的职位'
    if (!formData.value.secondDept) result.secondDept = '请选择第二志愿的部门'
    if (!formData.value.secondRole) result.secondRole = '请选择第二志愿的职位'

    // 其余字段与创建申请请求体一一对应
    const parsed = applicationSchema.safeParse({ ...formData.value, birth_date: toDateString(birthDate.value) })
    if (!parsed.success) {
        for (const issue of parsed.error.issues) {
            const field = String(issue.path[0])
            if (!result[field]) result[field] = issue.message
        }
    }

    return result
})

// 页面显示格式错误：只包含已交互字段
const errors = computed(() =>
    Object.fromEntries(Object.entries(allErrors.value).filter(([field]) => touched.has(field)))
)

/** 所有必填项均已填写，且已确认信息属实 */
const canSubmit = computed(() => confirmed.value && !Object.keys(allErrors.value).length)

async function onSubmit() {
    // 按钮 disabled 已保证均已选择，此处仅用于收窄类型
    const { termId, firstDept, firstRole, secondDept, secondRole } = formData.value
    if (!termId || !firstDept || !firstRole || !secondDept || !secondRole) return

    const payload: ApplicationCreateData = {
        term_id: termId,
        college: formData.value.college,
        major_class: formData.value.major_class,
        gender: formData.value.gender,
        phone: formData.value.phone,
        qq: formData.value.qq,
        political_status: formData.value.political_status,
        birth_date: toDateString(birthDate.value),
        avatar: formData.value.avatar,
        first_choice: { department_id: firstDept, role_id: firstRole },
        second_choice: { department_id: secondDept, role_id: secondRole },
        allow_adjust: formData.value.allow_adjust,
        resume: formData.value.resume,
        reason: formData.value.reason,
    }

    submitting.value = true
    const resp = await request<ApiResponse<null>>({
        url: '/application/create',
        method: 'POST',
        data: payload,
    })
    submitting.value = false

    if (resp?.code == 200) {
        setToast('success', '提交成功', '申请已提交，请等待审核')
        router.push('/apply')
    } else {
        setToast('error', '提交失败', resp?.message || '未知错误，请联系负责后端的同学')
    }
}

onMounted(() => {
    orgStore.ensureLoaded()
    loadTerms()
})
</script>

<template>
    <main>
        <h1 class="e-title">添加新申请</h1>

        <div class="form-body">
            <div class="form-main">
                <!-- 周期 -->
                <div class="form-section">
                    <h2>申请周期</h2>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>活动周期</label>
                            <Select
                                v-model="formData.termId"
                                :options="terms"
                                option-label="title"
                                option-value="id"
                                placeholder="请选择要申请的活动周期"
                            />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.termId }}
                            </Message>
                        </div>
                    </div>
                </div>

                <!-- 个人信息 -->
                <div class="form-section">
                    <h2>个人信息</h2>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>姓名</label>
                            <InputText :model-value="authStore.userInfo?.name ?? '—'" disabled />
                            <Message variant="simple" />
                        </div>
                        <div class="form-item">
                            <label>学号</label>
                            <InputText :model-value="authStore.userInfo?.student_id ?? '—'" disabled />
                            <Message variant="simple" />
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>学院</label>
                            <InputText v-model="formData.college" placeholder="请输入学院" />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.college }}
                            </Message>
                        </div>
                        <div class="form-item">
                            <label>班级</label>
                            <InputText v-model="formData.major_class" placeholder="如：计科241" />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.major_class }}
                            </Message>
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>性别</label>
                            <Select v-model="formData.gender" :options="['男', '女']" placeholder="请选择" />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.gender }}
                            </Message>
                        </div>
                        <div class="form-item">
                            <label>出生日期</label>
                            <DatePicker v-model="birthDate" date-format="yy-mm-dd" placeholder="请选择出生日期" />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.birth_date }}
                            </Message>
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>手机号</label>
                            <InputText v-model="formData.phone" placeholder="请输入手机号" />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.phone }}
                            </Message>
                        </div>
                        <div class="form-item">
                            <label>QQ</label>
                            <InputText v-model="formData.qq" placeholder="请输入 QQ 号" />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.qq }}
                            </Message>
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>政治面貌</label>
                            <InputText v-model="formData.political_status" placeholder="请输入政治面貌" />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.political_status }}
                            </Message>
                        </div>
                    </div>
                </div>

                <!-- 志愿 -->
                <div class="form-section">
                    <h2>志愿</h2>

                    <h3>第一志愿</h3>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>部门</label>
                            <Select
                                v-model="formData.firstDept"
                                :options="orgStore.departments"
                                option-label="name"
                                option-value="id"
                                placeholder="请选择部门"
                            />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.firstDept }}
                            </Message>
                        </div>
                        <div class="form-item">
                            <label>职位</label>
                            <Select
                                v-model="formData.firstRole"
                                :options="orgStore.roles"
                                option-label="name"
                                option-value="id"
                                placeholder="请选择职位"
                            />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.firstRole }}
                            </Message>
                        </div>
                    </div>

                    <h3>第二志愿</h3>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>部门</label>
                            <Select
                                v-model="formData.secondDept"
                                :options="orgStore.departments"
                                option-label="name"
                                option-value="id"
                                placeholder="请选择部门"
                            />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.secondDept }}
                            </Message>
                        </div>
                        <div class="form-item">
                            <label>职位</label>
                            <Select
                                v-model="formData.secondRole"
                                :options="orgStore.roles"
                                option-label="name"
                                option-value="id"
                                placeholder="请选择职位"
                            />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.secondRole }}
                            </Message>
                        </div>
                    </div>
                    <div class="form-item">
                        <label>是否服从调剂</label>
                        <ToggleSwitch v-model="formData.allow_adjust" />
                    </div>
                </div>

                <!-- 材料 -->
                <div class="form-section">
                    <h2>申请材料</h2>
                    <div class="form-item">
                        <label>简历</label>
                        <Textarea v-model="formData.resume" rows="5" placeholder="个人经历、项目经历等" />
                        <Message severity="error" size="small" variant="simple">
                            {{ errors.resume }}
                        </Message>
                    </div>
                    <div class="form-item">
                        <label>申请理由</label>
                        <Textarea v-model="formData.reason" rows="5" placeholder="希望加入的理由" />
                        <Message severity="error" size="small" variant="simple">
                            {{ errors.reason }}
                        </Message>
                    </div>
                </div>
            </div>

            <!-- 照片 -->
            <div class="form-image">
                <div class="wrapper" @click="fileInput?.click()">
                    <img v-if="avatarUrl" :src="avatarUrl" alt="照片" />
                    <div v-else class="placeholder"><i class="pi pi-user"></i></div>
                    <div class="overlay"><span class="pi pi-upload"></span></div>
                </div>
                <div class="tip">上传本人真实照片，大小不得超过 4MB</div>
                <Message severity="error" size="small" variant="simple">
                    {{ errors.avatar }}
                </Message>
                <input
                    ref="fileInput"
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
                    style="display: none"
                    @change="uploadAvatar"
                />
            </div>
        </div>

        <div class="confirm-row">
            <Checkbox v-model="confirmed" :input-id="confirmId" binary />
            <label :for="confirmId">我确认以上填写信息均属实</label>
        </div>

        <Button
            label="提交申请"
            icon="pi pi-send"
            :disabled="!canSubmit"
            :loading="submitting"
            @click="onSubmit"
        />&nbsp;
        <Button label="取消" severity="secondary" @click="router.back()" />
    </main>
</template>

<style lang="less" scoped>
// 表单主体：，右侧为本人照片
.form-body {
    display: flex;
    align-items: flex-start;
    gap: 48px;

    .form-main {
        // 表单左侧，各项输入字段
        flex: 1;
        min-width: 0;
    }

    .form-section {
        // 表单分组
        padding-bottom: 16px;
        margin-bottom: 24px;
        border-bottom: 1px solid #f0f0f0;

        &:last-of-type {
            border-bottom: none;
            margin-bottom: 0;
        }

        h2 {
            margin: 0 0 1em;
            font-size: 20px;
        }

        h3 {
            margin: 0 0 0.75em;
            font-size: 17px;
        }
    }

    .form-grid {
        // 表单双栏布局
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    .form-item {
        // 表单项
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;

        label {
            font-size: 14px;
            color: var(--p-text-muted-color);
        }

        .p-select,
        .p-inputtext,
        .p-datepicker,
        .p-textarea {
            width: 100%;
        }

        // 校验提示固定占一行，出错时表单不跳动
        .p-message {
            min-height: 1.25em;
        }
    }
}

// 照片
.form-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 160px;

    .wrapper {
        position: relative;
        width: 160px;
        height: 180px;

        img,
        .placeholder {
            width: 100%;
            height: 100%;
            border-radius: var(--e-border-radius);
            border: 1px solid #ddd;
            object-fit: cover;
        }

        .placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            color: var(--p-text-muted-color);
            background-color: var(--p-slate-100);
        }

        .overlay {
            position: absolute;
            inset: 0;
            border-radius: var(--e-border-radius);
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
        font-size: 14px;
        line-height: 1.5;
        text-align: center;
        color: var(--p-text-muted-color);
    }

    .p-message {
        min-height: 1.25em;
    }
}

.confirm-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 14px;

    label {
        cursor: pointer;
    }
}

@media screen and (max-width: 800px) {
    .form-grid {
        grid-template-columns: 1fr;
    }

    // 窄屏时照片移到表单上方
    .form-body {
        flex-direction: column-reverse;
        align-items: center;
    }

    .form-main {
        width: 100%;
    }
}
</style>
