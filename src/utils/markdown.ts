// md-editor-v3 全局扩展通用配置
import { config } from 'md-editor-v3'
import hljs from 'highlight.js/lib/common'
import katex from 'katex'

import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'

config({
    editorExtensions: {
        highlight: { instance: hljs },
        katex: { instance: katex },
    },
})
