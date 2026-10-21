# AGENTS.md

本文件面向在本仓库工作的 AI 编码代理（Codex、Claude Code、Cursor 等），说明项目结构、约定与硬性要求。人类贡献者也可以把它当作速查手册。

## 项目概览

“青蟹 Web” 是四川轻化工大学开放原子开源协会的协会管理系统前端，后端仓库为 [suse-oaa-backend](https://github.com/suse-edu-cn/suse-oaa-backend)。技术栈：

- Vue 3（`<script setup>` + TypeScript strict）、Vite 8 + `vite-plugin-pwa`（首页 SSG）
- PrimeVue v4 + Aura、Pinia（setup）、vue-router 5、axios、zod + `@primevue/forms`
- 样式：Less，全局 CSS 变量在 `src/styles/variables.less`

## 环境要求

- Node.js ≥ 24（CI 26）、pnpm ≥ 9（CI 11），见 `README.md`；只用 pnpm，不要用 npm / yarn。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发服务器，连内网后端，端口 3011 |
| `pnpm dev:public` | 开发服务器，连公网后端 |
| `pnpm build` | 公网生产构建（含首页预渲染） |
| `pnpm build:internal` | 内网生产构建 |
| `pnpm preview` | 预览构建产物 |
| `pnpm lint` | oxlint + eslint |
| `pnpm lint:fix` | 自动修复 lint 问题 |
| `pnpm test` | Vitest 单元 / 集成 / 组件测试（单次运行） |
| `pnpm test:watch` | Vitest 监听模式 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm test:e2e` | Playwright E2E（Chromium + dev server + 全量接口 mock） |
| `pnpm type-check` | `vue-tsc --noEmit`（含测试配置） |
| `pnpm format` | oxfmt 检查格式（不改文件） |
| `pnpm format:write` | oxfmt 写入格式修复 |

## 环境变量与构建模式

四种模式（配置在 `.env.*`，只放公开配置，**不要写密钥**）：`development` 用 `VITE_API_URL=/v2` 经 `VITE_PROXY_API_TARGET` 代理到内网；`development-public` 代理到公网；`production` 直连 `https://v2-api.suseoaa.com/v2`；`internal` 直连 `https://api.in.suseoaa.com/v2`。

新增变量同步补到 `src/env.d.ts` 的 `ImportMetaEnv`；`base` 由 `VITE_OSS_ORIGIN` 拼成 `.../oaa-fe/v{version}/`（内网 `-internal`），产物在 `_oaa/`。`vite.config.ts` 用 `define` 注入 `__BUILD_INFO__`，类型见 `env.d.ts`，设置页版本信息来自它。

## 目录结构

```
tests/                 # Vitest（unit / integration / component）与 Playwright（e2e）用例
src/
├── main.ts            # 浏览器入口
├── entry-ssg.ts       # 预渲染入口（createSSRApp）
├── App.vue            # 根布局：Header + Drawer + Footer + Toast
├── router/            # 路由与守卫（鉴权、权限等级、标题、进度条）
├── layouts/           # Header / Drawer / Footer
├── views/             # 页面，按业务域分目录（home、user、manage、announcement、apply、settings、error）
├── components/        # 可复用组件（ConfirmDialog、MarkdownEditor、ImageCropper 等）
├── api/               # 接口层，按后端模块拆分，业务端点只在这里出现一次
├── stores/            # Pinia：auth、org、settings
├── utils/             # request、session、setToast、uploader、markdown、date、uriConverter、initAuthStore
├── types/             # 接口类型，按后端模块拆分，由 types/index.ts 统一导出
├── styles/            # reset.less（基础样式）、markdown.less（Markdown 编辑器样式）、variables.less（设计变量）
└── env.d.ts           # 环境变量与全局常量类型
```

构建脚本 `scripts/prerender.mjs` 会在 `vite build` 后单独打包 SSR 入口、渲染首页、注入 `dist/index.html`，并附带内联脚本，避免 SPA fallback 闪现首页。

## 架构要点

### 入口与全局注册

- `main.ts` 与 `entry-ssg.ts` 必须保持同步：新增 PrimeVue 插件、指令、全局组件时两边都要注册，否则预渲染页会缺样式或报错。
- PrimeVue 组件统一从 `primevue` 桶导入（`import { Button, Dialog } from 'primevue'`）。Toast 需在 `App.vue` 中 `initToast(useToast())` 注入后才可用。
- SSG 环境没有 `document`，涉及 DOM 的逻辑先判断 `import.meta.env.SSR`（参考 `src/router/index.ts`）。

### 鉴权与请求

- 登录态是 `token` / `refresh_token` 两个 cookie（20 天，`SameSite=Lax`），刷新 token 只需 `refresh_token`。cookie 的读写统一走 `src/utils/session.ts`，不要在组件 / store / 请求层直接 import `js-cookie`。
- `useAuthStore` 持有登录态并提供 `hydrate` / `applyTokens` / `beginLogin` / `setUserInfo` / `clearSession` / `markReady`；`isAuthed` 由 token + userInfo 派生，`hasSession` 只表示有 token。登录用 `beginLogin`（会清掉旧用户），刷新 token 用 `applyTokens`（保留用户）；`hydrate` 发现 token 变化或为空时也会清掉旧用户信息。`initAuthStore.ts` 是唯一异步初始化入口（共享 Promise，`isReady` 表示完成）；登录提交前会先等待初始化，避免旧 `/user/me` 响应覆盖新会话。
- `request<T>()` **不抛异常**：失败时返回 `error.response?.data`（可能为 `undefined`），签名已如实标为 `Promise<T | undefined>`，调用方必须用 `resp?.code == 200` 判断并配合 `setToast` 提示；接口调用统一走 `src/api/<模块>.ts`。
- 401 已在 `src/utils/request.ts` 统一处理（自动刷新 token 并重试一次，`/auth/*` 除外），业务代码不要重复处理。刷新失败后的跳转 / 提示由 `main.ts` 通过 `configureRequestAuth` 注入，请求层不直接 import router。
- 路由默认需要登录，公开页面显式写 `meta: { requiresAuth: false }`；`meta.level` 表示最低 `role_level`（现有 20 / 50 / 80），不足会跳转 `/403`。

### 接口层（src/api）

- 按后端模块拆分：`auth`、`org`、`term`、`user`、`announcement`、`application`、`interview`。业务端点一个对应一个导出函数，URL 写完整字面量；`/auth/refresh` 与上传端点分别在 `request.ts`、`utils/uploader.ts` 内部处理。
- 命名：列表 `getXList`（如 `getTermList`，`getMyApplications` 是例外）、单条 `getX` / `getCurrentUser`、写操作 `createX` / `updateX` / `deleteX`。
- 非 CRUD 动作用业务语义名：`publishAnnouncement`、`sendVerificationCode`；带条件的关联查询把条件写进名字：`getRolesByDepartment`、`getDepartmentsByRole`。如果整体改 `listX`，一次同步，不要混用。
- 接口函数只负责「路径 + method + 请求 / 响应类型」，不写 toast、loading、跳转、重试；统一返回 `Promise<ApiResult<T>>`（`ApiResponse<T> | undefined`），调用方负责判空和提示。
- 请求体类型要如实描述线上 payload：不要把 UI 状态混进去（`login` 的 `isAccepted` 是待清理遗留）；更新类主键用 `number`，不要用 `number | null`。
- 类型放 `src/types/<模块>.ts` 并注明端点；新增端点先加类型，再写 `src/api` 函数，最后替换调用点。页面 / 组件不要直接 import `request`，上传不要另建 API 文件。
- 已知约束：`request` 不再依赖 router，但 `api/*` 仍通过 `request → stores/auth` 访问登录态；接口调用必须放在函数体内，禁止在模块顶层发请求或读取 `request`。

### 数据与状态

- Store 一律 setup 风格（`defineStore('x', () => { ... })`）。
- 登录态只通过 `useAuthStore` 的 action 修改；组件和请求层不要直接改 `token` / `isAuthed` / cookie。`isAuthed` 是派生值，不可赋值。
- 部门 / 职位等引用数据走 `useOrgStore`：`ensureLoaded()` 只请求一次，强制刷新用 `refresh()`。
- 表单校验用 zod + `@primevue/forms` 的 `zodResolver`，错误文案用中文。
- 上传统一走 `src/utils/uploader.ts`（`uploadImage` 限 4MB 常见图片格式，`uploadFile` 默认 100MB），不要另写上传请求。

### 样式约定

- 单文件组件用 `<style lang="less" scoped>`；只有在覆写 PrimeVue 内部结构时才用非 scoped。
- 全局类名以 `e-` 开头（`e-title`、`e-card`、`e-banner` 等），页面内容包在 `<main>` 里。
- 颜色与尺寸优先用 CSS 变量：`--e-color-theme`（emerald-500）、`--e-border-radius`、`--e-content-h-padding`，以及 PrimeVue 的 `--p-*`；不要硬编码主题色。
- 深色模式由 `html.p-dark` 切换（`src/utils/theme.ts`），自定义颜色统一引用 `variables.less` 中成对定义的 `--e-*` 语义变量（`--e-bg`、`--e-surface`、`--e-border-color`、`--e-accent-soft` 等），不要在组件里写死浅色值。
- 响应式断点沿用 `variables.less` 中的 800px / 1300px。

## 编码规范

- 格式以 oxfmt 为准：4 空格缩进、单引号、无分号、`printWidth` 120、`trailingComma` es5；文件 UTF-8、LF 换行、结尾留空行。
- TypeScript `strict` 已开启，不要用 `any` 绕过类型问题；`request`、`setToast` 等边界层的历史 `any` 除外。
- 注释、Toast、页面文案统一用中文；注释解释「为什么」，不复述代码。
- 组件文件名用多词（`ConfirmDialog.vue`）；`views/**` 可单词，用 `defineOptions` 避免冲突。
- 导入顺序：`vue` / `vue-router` → 第三方库 → `@/` 别名模块 → 类型，组间空一行。
- 优先复用 `utils/date.ts`、`utils/markdown.ts`、`MarkdownEditor`，避免为小功能引入 lodash、moment 之类的大依赖。

## 提交规范

- 遵循 Conventional Commits，描述用中文，scope 用模块名（router、user、announcement 等）：`feat(router): 页面标题跟随路由切换`。
- 改动较大时拆成多个提交，用 `[1/2]` 形式标注顺序。
- pre-commit 由 husky + lint-staged 对暂存文件运行 oxfmt，提交前先执行 `pnpm format:write`。

## 验证清单

改动完成前至少执行：

```bash
pnpm lint
pnpm type-check
pnpm test
```

涉及构建配置、SSG、PWA、路由或请求层（`src/utils/request.ts`、`src/api`）时，再执行 `pnpm build`，并确认 `dist/index.html` 中已注入首页 HTML。涉及登录态、权限、公告、申请等跨页面链路时，再执行 `pnpm test:e2e`。UI 改动需用 `pnpm dev` 实际过一遍：桌面与移动端布局、加载与空状态、Toast、权限跳转。

测试框架为 Vitest（jsdom + Vue Test Utils），配置见 `vitest.config.ts`，用例放在 `tests/` 下，统一 `*.spec.ts`，并显式 `import` vitest API（不开全局）。集成测试用 MSW 在网络层 mock，未匹配请求会直接失败；组件测试用 `tests/helpers/primevueStubs.ts` 的轻量 stub，不挂真实 PrimeVue；`tests/setup.ts` 负责 cookie 等测试间清理。新增工具函数、store、关键组件时同步补测试；修 bug 先写回归测试。测试不得依赖真实后端与当前时间。覆盖率门槛已启用（70 / 70 / 65 / 70）。

E2E 使用 Playwright（只装 Chromium），配置见 `playwright.config.ts`，用例在 `tests/e2e/`。`tests/e2e/fixtures.ts` 用 `page.route` 拦截全部 `/v2/**` 请求并记录调用，未 mock 的接口会返回 404 且测试结束时报错，**不要让它穿透到开发代理**；`api.scenario` 切换场景，`signIn()` 预置登录 cookie。涉及登录态、权限、公告、申请等跨页面链路时执行 `pnpm test:e2e`（首次需 `pnpm exec playwright install chromium`）。

## 硬性约束

1. **提交与推送需经用户确认**：不要自行 `git commit`、`git push`、变基或改写历史，除非用户明确要求。
2. **新增依赖前必须先征询**：安装任何包之前说明用途与体积影响，得到同意后再执行 `pnpm add`。
3. **完成任务前必须通过 `pnpm lint` 与 `pnpm type-check`**：两者任一失败都不得声称完成。
