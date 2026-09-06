import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs([
    {
        name: 'app/files-to-lint',
        files: ['**/*.{js,mjs,jsx,ts,vue}'],
    },

    globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

    {
        languageOptions: {
            globals: {
                ...globals.browser,
                __GIT_VERSION__: 'readonly',
            },
        },
    },

    js.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    vueTsConfigs.recommended,
    {
        name: 'app/rules-override',
        rules: {
            // 边界层（request / setToast / catch）沿用既有 any 风格
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        name: 'app/views-override',
        files: ['src/views/**/*.vue'],
        rules: {
            'vue/multi-word-component-names': 'off',
        },
    },
    skipFormatting,
])
