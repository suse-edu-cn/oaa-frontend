<!-- 申请表单：创建（/apply/new）与编辑（/apply/edit/:id）共用 -->
<script lang="ts" setup>
import { computed, nextTick, onMounted, reactive, ref, useId, watch } from 'vue'

import { Button, Checkbox, DatePicker, InputText, Message, Select, Skeleton, Textarea, ToggleSwitch } from 'primevue'

import { getDepartmentsByRole, getRolesByDepartment } from '@/api/application'
import { useOrgStore } from '@/stores/org'
import { useTermStore } from '@/stores/term'
import { toastApiError } from '@/utils/apiError'
import { APPLICATION_FIELD_LIMITS, getApplicationFormErrors } from '@/utils/applicationFormValidation'
import { fromDate, toDate } from '@/utils/date'
import { uploadImage } from '@/utils/uploader'
import setToast from '@/utils/setToast'

import type { DepartmentItem, ApplicationFormPrefill, ApplicationFormData, RoleItem } from '@/types'

const props = withDefaults(
    defineProps<{
        /** 预填数据，编辑页由申请数据构造，创建页留空 */
        initial?: ApplicationFormPrefill
        /** 活动周期是否仅展示（编辑页不可修改） */
        termDisabled?: boolean
        submitLabel?: string
        submitIcon?: string
        /** 提交请求进行中，由页面的请求状态驱动 */
        submitting?: boolean
    }>(),
    {
        initial: () => ({}),
        termDisabled: false,
        submitLabel: '提交申请',
        submitIcon: 'pi pi-send',
        submitting: false,
    }
)

const emit = defineEmits<{ submit: [data: ApplicationFormData, termId: number | null] }>()

// 提交失败时用于把视图带回表单顶部
const formRoot = ref<HTMLElement | null>(null)

const orgStore = useOrgStore()
const termStore = useTermStore()
const LIMIT = APPLICATION_FIELD_LIMITS

// 预填即为基线，此后的改动才视为已交互
const p = props.initial
const formData = ref({
    termId: p.termId ?? null,
    college: p.college ?? '',
    major_class: p.major_class ?? '',
    gender: p.gender ?? '',
    phone: p.phone ?? '',
    qq: p.qq ?? '',
    political_status: p.political_status ?? '',
    avatar: p.avatar ?? '',
    firstDept: p.firstDept ?? null,
    firstRole: p.firstRole ?? null,
    secondDept: p.secondDept ?? null,
    secondRole: p.secondRole ?? null,
    allow_adjust: p.allow_adjust ?? false,
    resume: p.resume ?? '',
    reason: p.reason ?? '',
})
const birthDate = ref<Date | null>(toDate(p.birth_date))
// 信息属实确认
const confirmed = ref(false)
const confirmId = useId()

// ================= 周期 =================
const terms = computed(() => termStore.terms)

// 图片上传处理
const fileInput = ref<HTMLInputElement | null>(null)
const avatarUrl = ref(p.avatar_url ?? '')
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

// ================= 志愿 =================
// 各志愿部门下可供申请的职位，空数组表示未按部门过滤，回退到全量职位列表
const firstRoles = ref<RoleItem[]>([])
const secondRoles = ref<RoleItem[]>([])
// 选项请求进行中时禁用对应下拉
const firstRolesLoading = ref(false)
const secondRolesLoading = ref(false)
const firstDeptsLoading = ref(false)
const secondDeptsLoading = ref(false)

// 获取部门下可供申请的职位
// 返回 null 表示请求失败，避免把失败当成空列表处理
async function fetchRoles(departmentId: number | null): Promise<RoleItem[] | null> {
    if (!departmentId) return []
    const resp = await getRolesByDepartment(departmentId)
    if (resp?.code == 200) return resp.data ?? []
    toastApiError('获取职位列表失败', resp)
    return null
}

// 各志愿职位可供申请的部门，空数组表示未按职位过滤，回退到全量部门列表
const firstDepts = ref<DepartmentItem[]>([])
const secondDepts = ref<DepartmentItem[]>([])
const firstDeptOptions = computed(() => (firstDepts.value.length ? firstDepts.value : orgStore.departments))
const secondDeptOptions = computed(() => (secondDepts.value.length ? secondDepts.value : orgStore.departments))
// 各志愿部门下可供申请的职位
const firstRoleOptions = computed(() => (firstRoles.value.length ? firstRoles.value : orgStore.roles))
const secondRoleOptions = computed(() => (secondRoles.value.length ? secondRoles.value : orgStore.roles))

// 获取职位可供申请的部门，null 语义同上
async function fetchDepts(roleId: number | null): Promise<DepartmentItem[] | null> {
    if (!roleId) return []
    const resp = await getDepartmentsByRole(roleId)
    if (resp?.code == 200) return resp.data ?? []
    toastApiError('获取部门列表失败', resp)
    return null
}

// 切换部门后刷新对应职位，并清空已选职位
async function onFirstDeptChange() {
    const deptId = formData.value.firstDept
    // 部门选项不再受职位约束，恢复全量可选
    firstDepts.value = []
    formData.value.firstRole = null
    // 先清空上一个部门的职位
    firstRoles.value = []
    firstRolesLoading.value = true
    try {
        const roles = await fetchRoles(deptId)
        // 期间用户又切换了部门丢弃过期结果
        if (formData.value.firstDept !== deptId) return
        firstRoles.value = roles ?? []
    } finally {
        // 只有最新一次请求能解除禁用
        if (formData.value.firstDept === deptId) firstRolesLoading.value = false
    }
}
async function onSecondDeptChange() {
    const deptId = formData.value.secondDept
    secondDepts.value = []
    formData.value.secondRole = null
    secondRoles.value = []
    secondRolesLoading.value = true
    try {
        const roles = await fetchRoles(deptId)
        if (formData.value.secondDept !== deptId) return
        secondRoles.value = roles ?? []
    } finally {
        if (formData.value.secondDept === deptId) secondRolesLoading.value = false
    }
}

// 切换职位后刷新可供申请的部门，过滤部门选项
async function onFirstRoleChange() {
    const roleId = formData.value.firstRole
    firstDeptsLoading.value = true
    try {
        const depts = await fetchDepts(roleId)
        // 期间用户又切换了职位时，丢弃过期结果
        if (formData.value.firstRole !== roleId) return
        // 请求失败时只解除职位对部门的过滤，保留用户已选的部门
        if (depts === null) {
            firstDepts.value = []
            return
        }
        firstDepts.value = depts
        // 当前部门已不可申请该职位时清空，职位选项随之恢复全量
        if (roleId && formData.value.firstDept && !depts.some((d) => d.id === formData.value.firstDept)) {
            formData.value.firstDept = null
            firstRoles.value = []
        }
    } finally {
        if (formData.value.firstRole === roleId) firstDeptsLoading.value = false
    }
}
async function onSecondRoleChange() {
    const roleId = formData.value.secondRole
    secondDeptsLoading.value = true
    try {
        const depts = await fetchDepts(roleId)
        if (formData.value.secondRole !== roleId) return
        if (depts === null) {
            secondDepts.value = []
            return
        }
        secondDepts.value = depts
        if (roleId && formData.value.secondDept && !depts.some((d) => d.id === formData.value.secondDept)) {
            formData.value.secondDept = null
            secondRoles.value = []
        }
    } finally {
        if (formData.value.secondRole === roleId) secondDeptsLoading.value = false
    }
}

// 预填了志愿时，拉取对应的可选项
async function loadPrefillOptions() {
    const { firstDept, secondDept, firstRole, secondRole } = formData.value
    const [firstRoleOpts, secondRoleOpts, firstDeptOpts, secondDeptOpts] = await Promise.all([
        fetchRoles(firstDept),
        fetchRoles(secondDept),
        fetchDepts(firstRole),
        fetchDepts(secondRole),
    ])
    // 期间用户已改动时丢弃过期结果，请求失败保留上一次的可选项
    if (formData.value.firstDept === firstDept && firstRoleOpts !== null) firstRoles.value = firstRoleOpts
    if (formData.value.secondDept === secondDept && secondRoleOpts !== null) secondRoles.value = secondRoleOpts
    if (formData.value.firstRole === firstRole && firstDeptOpts !== null) firstDepts.value = firstDeptOpts
    if (formData.value.secondRole === secondRole && secondDeptOpts !== null) secondDepts.value = secondDeptOpts
}

// ================= 校验 =================
const touched = reactive(new Set<string>()) // 已交互过的字段
const submitted = ref(false) // 是否点过提交
const baseline = { ...formData.value }
// 边填边显示其格式错误
watch(
    [formData, birthDate],
    () => {
        for (const key of Object.keys(formData.value) as (keyof typeof baseline)[]) {
            if (formData.value[key] !== baseline[key]) touched.add(key)
        }
        if (birthDate.value) touched.add('birth_date')
    },
    { deep: true }
)

// 校验各字段
const allErrors = computed<Record<string, string>>(() =>
    getApplicationFormErrors(
        { ...formData.value, birth_date: fromDate(birthDate.value) },
        { termDisabled: props.termDisabled }
    )
)

// 页面显示错误
const errors = computed(() =>
    Object.fromEntries(Object.entries(allErrors.value).filter(([field]) => submitted.value || touched.has(field)))
)

// ================= 提交 =================
function onSubmit() {
    if (props.submitting) return

    // 提交时把校验结果整体交给用户
    submitted.value = true
    const missing = Object.values(allErrors.value)
    if (missing.length) {
        setToast('warn', '请完善申请信息', missing[0])
        void nextTick(() => formRoot.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
        return
    }

    // 此处用于收窄类型
    const { firstDept, firstRole, secondDept, secondRole } = formData.value
    if (!firstDept || !firstRole || !secondDept || !secondRole) return

    emit(
        'submit',
        {
            college: formData.value.college.trim(),
            major_class: formData.value.major_class.trim(),
            gender: formData.value.gender,
            phone: formData.value.phone.trim(),
            qq: formData.value.qq.trim(),
            political_status: formData.value.political_status.trim(),
            birth_date: fromDate(birthDate.value),
            avatar: formData.value.avatar,
            first_choice: { department_id: firstDept, role_id: firstRole },
            second_choice: { department_id: secondDept, role_id: secondRole },
            allow_adjust: formData.value.allow_adjust,
            resume: formData.value.resume.trim(),
            reason: formData.value.reason.trim(),
        },
        formData.value.termId
    )
}

// 下拉选项（周期 / 部门 / 职位）加载完成前用骨架占位
const optionsLoading = ref(true)

onMounted(async () => {
    try {
        await Promise.all([orgStore.ensureLoaded(), termStore.ensureLoaded(), loadPrefillOptions()])
    } finally {
        optionsLoading.value = false
    }
})
</script>

<template>
    <div ref="formRoot">
        <div class="form-body">
            <div class="form-main">
                <!-- 周期 -->
                <div class="form-section">
                    <h2>申请周期</h2>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>活动周期</label>
                            <Skeleton v-if="optionsLoading" height="32px" width="100%" />
                            <Select
                                v-else
                                v-model="formData.termId"
                                :options="terms"
                                option-label="title"
                                option-value="id"
                                placeholder="请选择要申请的活动周期"
                                :disabled="termDisabled"
                            />
                            <Message v-if="termDisabled" variant="simple" />
                            <Message v-else severity="error" size="small" variant="simple">
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
                            <InputText :model-value="props.initial?.name || '—'" disabled />
                            <Message variant="simple" />
                        </div>
                        <div class="form-item">
                            <label>学号</label>
                            <InputText :model-value="props.initial?.student_id || '—'" disabled />
                            <Message variant="simple" />
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-item">
                            <label>学院</label>
                            <InputText v-model="formData.college" placeholder="请输入学院" :maxlength="LIMIT.college" />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.college }}
                            </Message>
                        </div>
                        <div class="form-item">
                            <label>班级</label>
                            <InputText
                                v-model="formData.major_class"
                                placeholder="如：计科241"
                                :maxlength="LIMIT.major_class"
                            />
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
                            <InputText
                                v-model="formData.political_status"
                                placeholder="请输入政治面貌"
                                :maxlength="LIMIT.political_status"
                            />
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
                            <Skeleton v-if="optionsLoading" height="2.5rem" width="100%" />
                            <Select
                                v-else
                                v-model="formData.firstDept"
                                :options="firstDeptOptions"
                                option-label="name"
                                option-value="id"
                                placeholder="请选择部门"
                                :disabled="firstDeptsLoading"
                                @change="onFirstDeptChange"
                            />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.firstDept }}
                            </Message>
                        </div>
                        <div class="form-item">
                            <label>职位</label>
                            <Skeleton v-if="optionsLoading" height="2.5rem" width="100%" />
                            <Select
                                v-else
                                v-model="formData.firstRole"
                                :options="firstRoleOptions"
                                option-label="name"
                                option-value="id"
                                placeholder="请选择职位"
                                :disabled="firstRolesLoading"
                                @change="onFirstRoleChange"
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
                            <Skeleton v-if="optionsLoading" height="2.5rem" width="100%" />
                            <Select
                                v-else
                                v-model="formData.secondDept"
                                :options="secondDeptOptions"
                                option-label="name"
                                option-value="id"
                                placeholder="请选择部门"
                                :disabled="secondDeptsLoading"
                                @change="onSecondDeptChange"
                            />
                            <Message severity="error" size="small" variant="simple">
                                {{ errors.secondDept }}
                            </Message>
                        </div>
                        <div class="form-item">
                            <label>职位</label>
                            <Skeleton v-if="optionsLoading" height="2.5rem" width="100%" />
                            <Select
                                v-else
                                v-model="formData.secondRole"
                                :options="secondRoleOptions"
                                option-label="name"
                                option-value="id"
                                placeholder="请选择职位"
                                :disabled="secondRolesLoading"
                                @change="onSecondRoleChange"
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
                        <Textarea
                            v-model="formData.resume"
                            rows="5"
                            placeholder="个人经历、项目经历等"
                            :maxlength="LIMIT.resume"
                        />
                        <div class="char-count">{{ formData.resume.length }} / {{ LIMIT.resume }}</div>
                        <Message severity="error" size="small" variant="simple">
                            {{ errors.resume }}
                        </Message>
                    </div>
                    <div class="form-item">
                        <label>申请理由</label>
                        <Textarea
                            v-model="formData.reason"
                            rows="5"
                            placeholder="希望加入的理由"
                            :maxlength="LIMIT.reason"
                        />
                        <div class="char-count">{{ formData.reason.length }} / {{ LIMIT.reason }}</div>
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
            :label="submitLabel"
            :icon="submitIcon"
            :disabled="!confirmed || submitting"
            :loading="submitting"
            @click="onSubmit"
        />&nbsp;
        <slot />
    </div>
</template>

<style lang="less" scoped>
// 表单主体：左侧为各项字段，右侧为本人照片
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
        border-bottom: 1px solid var(--e-border-subtle);

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

        // 字数提示靠右贴住输入框，不额外占一行
        .char-count {
            align-self: flex-end;
            font-size: 12px;
            line-height: 1.4;
            color: var(--p-text-muted-color);
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
            border: 1px solid var(--e-border-color);
            object-fit: cover;
        }

        .placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            color: var(--p-text-muted-color);
            background-color: var(--e-surface-subtle);
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
    .form-body .form-grid {
        grid-template-columns: 1fr;
    }

    // 窄屏时照片移到表单上方
    .form-body {
        flex-direction: column-reverse;
        align-items: center;
        gap: 24px;
    }

    .form-main {
        width: 100%;
    }

    .form-image {
        width: 140px;

        .wrapper {
            width: 140px;
            height: 160px;
        }
    }
}
</style>
