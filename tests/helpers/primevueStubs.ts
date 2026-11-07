import { defineComponent, h, ref, type PropType } from 'vue'

// 只保留业务代码用到的 v-model / 事件契约，避免把 PrimeVue 内部 DOM 带进测试

export const InputTextStub = defineComponent({
    name: 'InputText',
    props: {
        modelValue: { type: [String, Number], default: '' },
        disabled: Boolean,
        size: String,
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        return () =>
            h('input', {
                value: props.modelValue,
                disabled: props.disabled,
                onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
            })
    },
})

export const TextareaStub = defineComponent({
    name: 'Textarea',
    props: {
        modelValue: { type: String, default: '' },
        disabled: Boolean,
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        return () =>
            h('textarea', {
                value: props.modelValue,
                disabled: props.disabled,
                onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
            })
    },
})

export const SelectStub = defineComponent({
    name: 'Select',
    props: {
        modelValue: { type: [Number, String], default: null },
        options: { type: Array as PropType<unknown[]>, default: () => [] },
        optionLabel: { type: String, default: 'label' },
        optionValue: { type: String, default: 'value' },
        placeholder: String,
        inputId: String,
        disabled: Boolean,
    },
    emits: ['update:modelValue', 'change'],
    setup(props, { emit }) {
        function onChange(event: Event) {
            const value = (event.target as HTMLSelectElement).value
            const option = props.options
                .map((item) => item as Record<string, unknown>)
                .find((item) => String(item[props.optionValue]) === value)
            emit('update:modelValue', option ? option[props.optionValue] : value)
            emit('change')
        }

        return () =>
            h(
                'select',
                {
                    id: props.inputId,
                    value: props.modelValue ?? '',
                    disabled: props.disabled,
                    'data-testid': 'select',
                    onChange,
                },
                props.options.map((option) => {
                    const item = option as Record<string, unknown>
                    return h('option', { value: String(item[props.optionValue]) }, String(item[props.optionLabel]))
                })
            )
    },
})

export const DatePickerStub = defineComponent({
    name: 'DatePicker',
    props: {
        modelValue: { type: Object as PropType<Date | null>, default: null },
        maxDate: { type: Object as PropType<Date | null>, default: null },
        inputId: String,
        disabled: Boolean,
    },
    emits: ['update:modelValue'],
    setup(props) {
        return () => h('div', { id: props.inputId, 'data-testid': 'datepicker' })
    },
})

export const CheckboxStub = defineComponent({
    name: 'Checkbox',
    props: {
        modelValue: Boolean,
        binary: Boolean,
        inputId: String,
        disabled: Boolean,
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        return () =>
            h('input', {
                type: 'checkbox',
                id: props.inputId,
                checked: props.modelValue,
                disabled: props.disabled,
                'data-testid': 'checkbox',
                onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).checked),
            })
    },
})

export const ToggleSwitchStub = defineComponent({
    name: 'ToggleSwitch',
    props: {
        modelValue: Boolean,
        inputId: String,
        disabled: Boolean,
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        return () =>
            h('input', {
                type: 'checkbox',
                id: props.inputId,
                checked: props.modelValue,
                disabled: props.disabled,
                'data-testid': 'toggle',
                onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).checked),
            })
    },
})

export const ButtonStub = defineComponent({
    name: 'Button',
    props: {
        label: String,
        icon: String,
        severity: String,
        text: Boolean,
        disabled: Boolean,
        loading: Boolean,
    },
    emits: ['click'],
    setup(props, { emit }) {
        return () =>
            h(
                'button',
                {
                    disabled: props.disabled,
                    'data-loading': String(props.loading),
                    onClick: () => emit('click'),
                },
                props.label
            )
    },
})

export const MessageStub = defineComponent({
    name: 'Message',
    props: {
        severity: String,
        size: String,
        variant: String,
    },
    setup(_, { slots }) {
        return () => h('div', { class: 'message-stub' }, slots.default ? slots.default() : [])
    },
})

export const DialogStub = defineComponent({
    name: 'Dialog',
    props: {
        visible: Boolean,
        header: String,
        modal: Boolean,
        closable: { type: Boolean, default: true },
    },
    emits: ['update:visible'],
    setup(props, { slots }) {
        return () =>
            props.visible
                ? h('div', { 'data-testid': 'dialog' }, [
                      ...(slots.default ? slots.default() : []),
                      ...(slots.footer ? slots.footer() : []),
                  ])
                : null
    },
})

export const SkeletonStub = defineComponent({
    name: 'Skeleton',
    props: {
        shape: String,
        size: String,
        width: { type: [String, Number], default: '100%' },
        height: { type: [String, Number], default: '1rem' },
        borderRadius: String,
        animation: String,
    },
    setup() {
        return () => h('div', { 'data-testid': 'skeleton' })
    },
})

// 只渲染 header / content / footer 三个插槽，便于断言卡片内部结构
export const CardStub = defineComponent({
    name: 'Card',
    setup(_, { slots }) {
        return () =>
            h('div', { 'data-testid': 'card' }, [
                ...(slots.header ? slots.header() : []),
                ...(slots.content ? slots.content() : []),
                ...(slots.footer ? slots.footer() : []),
            ])
    },
})

export const TagStub = defineComponent({
    name: 'Tag',
    props: {
        value: { type: [String, Number], default: '' },
        severity: String,
    },
    setup(props) {
        return () => h('span', { 'data-testid': 'tag' }, String(props.value))
    },
})

// popup
// 业务代码通过 ref 调 toggle / show 展开，这里用按钮模拟菜单项
export const MenuStub = defineComponent({
    name: 'Menu',
    props: {
        model: { type: Array as PropType<Record<string, unknown>[]>, default: () => [] },
        popup: Boolean,
    },
    emits: ['show', 'hide'],
    setup(props, { emit, expose }) {
        const open = ref(false)

        function setOpen(value: boolean) {
            open.value = value
            emit(value ? 'show' : 'hide')
        }

        expose({
            toggle: () => setOpen(!open.value),
            show: () => setOpen(true),
            hide: () => setOpen(false),
        })

        function runCommand(item: Record<string, unknown>) {
            const command = item.command as ((event: unknown) => void) | undefined
            command?.({})
            setOpen(false)
        }

        return () =>
            open.value
                ? h(
                      'ul',
                      { 'data-testid': 'menu' },
                      props.model.map((item) =>
                          h('li', {}, [
                              h(
                                  'button',
                                  {
                                      type: 'button',
                                      'data-testid': 'menu-item',
                                      onClick: () => runCommand(item),
                                  },
                                  String(item.label)
                              ),
                          ])
                      )
                  )
                : null
    },
})

// 纯布局包装组件，只透传 slot 保证输入框仍然可查询
export const FloatLabelStub = defineComponent({
    name: 'FloatLabel',
    props: { variant: String },
    setup(_, { slots }) {
        return () => h('label', { class: 'float-label-stub' }, slots.default ? slots.default() : [])
    },
})

export const IconFieldStub = defineComponent({
    name: 'IconField',
    setup(_, { slots }) {
        return () => h('div', { class: 'icon-field-stub' }, slots.default ? slots.default() : [])
    },
})

export const primevueStubs = {
    InputText: InputTextStub,
    Textarea: TextareaStub,
    Select: SelectStub,
    DatePicker: DatePickerStub,
    Checkbox: CheckboxStub,
    ToggleSwitch: ToggleSwitchStub,
    Button: ButtonStub,
    Message: MessageStub,
    Dialog: DialogStub,
    Menu: MenuStub,
    Skeleton: SkeletonStub,
    Card: CardStub,
    Tag: TagStub,
    FloatLabel: FloatLabelStub,
    IconField: IconFieldStub,
}
