# AGENTS.md

本文件面向在本仓库工作的 AI 编码代理（Codex、Claude Code、Cursor 等），说明项目结构、约定与硬性要求。人类贡献者也可以把它当作速查手册。

## 项目概览

“青蟹 Web” 是四川轻化工大学开放原子开源协会的协会管理系统前端，后端仓库为 [suse-oaa-backend](https://github.com/suse-edu-cn/suse-oaa-backend)。技术栈：

- Vue 3（`<script setup>` + TypeScript strict）、Vite 8 + `vite-plugin-pwa`（首页 SSG）
- PrimeVue v4 + Aura、Pinia（setup）、vue-router 5、axios、zod + `@primevue/forms`
- 样式：Less，全局 CSS 变量在 `src/styles/variables.less`

## 环境要求

- Node.js ≥ 24（CI 26）、pnpm ≥ 9（CI 11）。只用 pnpm，不要用 npm / yarn。
- `package.json` 目前没有 `engines` / `packageManager` 字段，本地与 CI 版本不一致时容易出现 lockfile 抖动；动依赖前先确认 `node -v` / `pnpm -v`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发服务器，连公网后端，端口 3011 |
| `pnpm build` | 生产构建（含首页预渲染） |
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
| `pnpm deploy` | 构建并发布（对象存储 + Nginx），见 README「部署」 |
| `pnpm deploy:no-build` | 复用现有 dist 重试部署 |
| `pnpm deploy:validate` | 只校验 dist 产物 |
| `pnpm deploy:check` | 只检查线上部署结果 |

## 环境变量与构建模式

三种模式（配置在 `.env.*`，只放公开配置，**不要写密钥**）：`development` 用 `VITE_API_URL=/v2` 经 `VITE_PROXY_API_TARGET` 代理到 `https://v2-api.suseoaa.com`；`production` 直连 `https://v2-api.suseoaa.com/v2`；`test` 供 Vitest 使用。

新增变量同步补到 `src/env.d.ts` 的 `ImportMetaEnv`；`base` 由 `VITE_OSS_ORIGIN` 拼成 `.../oaa-fe/v{version}/`，产物在 `_oaa/`。`vite.config.ts` 用 `define` 注入 `__BUILD_INFO__`，类型见 `env.d.ts`，设置页版本信息来自它。

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
├── components/        # 可复用组件（ApplicationForm、ImageUploader、ImageCropper、MarkdownEditor 等）
├── api/               # 接口层，按后端模块拆分，业务端点只在这里出现一次
├── stores/            # Pinia：auth、org、term、settings
├── utils/             # request、apiError、session、setToast、uploader、applicationFormValidation、markdown、date、uriConverter、initAuthStore、theme、pwa、useMediaQuery
├── types/             # 接口类型，按后端模块拆分，由 types/index.ts 统一导出
├── styles/            # reset.less（入口 + 基础 reset）、components.less（全局 e-* 组件类）、overrides.less（第三方覆写）、markdown.less、variables.less
└── env.d.ts           # 环境变量与全局常量类型
```

构建脚本 `scripts/prerender.mjs` 会在 `vite build` 后单独打包 SSR 入口、渲染首页、注入 `dist/index.html`，并附带内联脚本，避免 SPA fallback 闪现首页。

## 架构要点

### 入口与全局注册

- `main.ts` 与 `entry-ssg.ts` 必须保持同步：新增 PrimeVue 插件、指令、全局组件时两边都要注册，否则预渲染页会缺样式或报错。
- PrimeVue 组件统一从 `primevue` 桶导入（`import { Button, Dialog } from 'primevue'`）。Toast 需在 `App.vue` 中 `initToast(useToast())` 注入后才可用。
- SSG 环境没有 `document`，涉及 DOM 的逻辑先判断 `import.meta.env.SSR`（参考 `src/router/index.ts`）。
- 页面滚动容器是 `App.vue` 里的 `.e-view`（不是 window，首页除外）。路由切换后由 `App.vue` 监听 `route.path` 统一把 `.e-view` 与 window 复位到顶部；**不要**改用 `scrollBehavior`——它对内部滚动容器无效。

### 鉴权与请求

- 登录态是 `token` / `refresh_token` 两个 cookie（20 天，`SameSite=Lax`），刷新 token 只需 `refresh_token`。cookie 的读写统一走 `src/utils/session.ts`，不要在组件 / store / 请求层直接 import `js-cookie`。
- `useAuthStore` 持有登录态并提供 `hydrate` / `applyTokens` / `beginLogin` / `setUserInfo` / `clearSession` / `markReady`；`isAuthed` 由 token + userInfo 派生，`hasSession` 只表示有 token。登录用 `beginLogin`（会清掉旧用户），刷新 token 用 `applyTokens`（保留用户）；`hydrate` 发现 token 变化或为空时也会清掉旧用户信息。`initAuthStore.ts` 是唯一异步初始化入口（共享 Promise，`isReady` 表示完成）；登录提交前会先等待初始化，避免旧 `/user/me` 响应覆盖新会话。
- `request<T>()` **不抛异常**：失败时返回 `error.response?.data`（可能为 `undefined`），签名已如实标为 `Promise<T | undefined>`，调用方必须用 `resp?.code == 200` 判断；失败提示统一用 `src/utils/apiError.ts` 的 `toastApiError(action, resp)`，不要在业务侧写 `catch` 读取 `err.response`。成功后的 toast / 跳转 / 刷新仍由页面决定。
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
- 活动周期引用数据走 `useTermStore`：`ensureLoaded()` 会缓存并合并并发请求，周期增删改后调用 `refresh()`；页面 / 组件不要再各自调用 `getTermList()`。
- 表单校验用 zod + `@primevue/forms` 的 `zodResolver`，错误文案用中文；文本字段先 `trim` 再判空，提交时也要用同一份 `trim` 后的值，避免「校验通过但存进库的是带空格内容」。
- 申请表单的字段上限与后端 `applications` 表列宽对齐，统一定义在 `APPLICATION_FIELD_LIMITS`：学院 / 班级 64、政治面貌 32、简历 / 申请理由 5000 字符。改后端列宽时同步改这里，不要散落魔法数字；出生日期不得晚于今天。
- 上传统一走 `src/utils/uploader.ts`（`uploadImage` 限 4MB 常见图片格式，`uploadFile` 默认 100MB），不要另写上传请求。

### 图片上传与裁剪

- 图片统一走 `ImageUploader`，它负责预览、遮罩、可选裁剪、上传与上传态。`v-model:uri` 是提交给后端的对象存储路径，`v-model:url` 只用于预览，两者可能不同，不要混用。
- `ImageCropper` 只做裁剪与编码（`cropped` 事件给出 WebP blob），**不要**再让它调用上传接口；上传统一由 `ImageUploader` 负责，失败时保持弹窗打开，用户可原地重试。
- 上传中必须禁止再次选图：`ImageUploader` 用 `uploading` 状态 + 请求序号双重守卫。删掉守卫会出现并发上传，进而「预览是 A、提交是 B」。
- 服务端未返回 `url` 时要把预览清空显示占位，不能保留旧图——否则预览与将要提交的 `uri` 不一致。上传失败则保持原图不变。
- 新增上传场景只传 `scene`，不要在组件里写死 URL 或另建上传请求。

### 可访问性

- 每个 `<label>` 必须关联控件：用 `useId()` 生成前缀 + `fieldId(name)`，`label` 的 `:for` 与控件的 `id` 用同一个值；PrimeVue 的 `Select` / `DatePicker` / `ToggleSwitch` 用 `input-id`。
- 校验错误要让读屏能读到：错误提示加 `:id="fieldId(x) + '-error'"`，控件加 `:aria-invalid` 与 `:aria-describedby`。
- 可点击但不是链接的元素一律用 `<button type="button">`，不要用 `<div @click>`；补 `focus-visible` 描边，必要时加 `aria-label` / `aria-haspopup` / `aria-expanded`。
- 一组控件（如日期区间）不要硬套 `<label for>`：用普通文本说明分组，各控件自己给 `aria-label`；纯展示的字段名用 `<span>` 而不是 `<label>`。
- 改完表单或交互控件，用键盘（Tab / Enter / Space / Esc）实际走一遍。

### 样式约定

- 单文件组件用 `<style lang="less" scoped>`；只有在覆写 PrimeVue 内部结构时才用非 scoped。
- 全局类名以 `e-` 开头（`e-title`、`e-card`、`e-banner` 等），页面内容包在 `<main>` 里。
- 全局 `e-*` 组件 / 工具类放 `styles/components.less`；PrimeVue、nprogress、md-editor 等第三方覆写放 `styles/overrides.less`；页面级样式留在各自 SFC，不要往 `reset.less` 里继续堆。
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
- `tests/` 的改动与源码放在一起提交：修 bug 的回归测试、重构后更新的用例都不能只提交源码。提交前用 `git status` 确认没有遗留未跟踪的 `*.spec.ts`。
- pre-commit 由 husky + lint-staged 对暂存文件运行 oxfmt，提交前先执行 `pnpm format:write`。

## 验证清单

改动完成前至少执行：

```bash
pnpm lint
pnpm type-check
pnpm test
```

涉及构建配置、SSG、PWA、路由或请求层（`src/utils/request.ts`、`src/api`）时，再执行 `pnpm build`，并确认 `dist/index.html` 中已注入首页 HTML。涉及登录态、权限、公告、申请等跨页面链路时，再执行 `pnpm test:e2e`。UI 改动需用 `pnpm dev` 实际过一遍：桌面与移动端布局、加载与空状态、Toast、权限跳转。

测试框架为 Vitest（jsdom + Vue Test Utils），配置见 `vitest.config.ts`，用例放在 `tests/` 下，统一 `*.spec.ts`，并显式 `import` vitest API（不开全局）。集成测试用 MSW 在网络层 mock，未匹配请求会直接失败；`tests/setup.ts` 负责 cookie 等测试间清理。新增工具函数、store、关键组件时同步补测试；修 bug 先写回归测试。测试不得依赖真实后端与当前时间。

组件测试用 `tests/helpers/primevueStubs.ts` 的轻量 stub，不挂真实 PrimeVue。给 PrimeVue 控件新增 prop 时先在对应 stub 里声明（如 `inputId`、`maxDate`、`closable`），否则它只会落成根元素属性，`props()` 断言会拿到 `undefined`。

覆盖率门槛（70 / 70 / 65 / 70）只统计 `vitest.config.ts` 里 `coverage.include` 列出的文件，视图 / 布局不在其中——数字达标不代表页面有保护，改页面要靠组件测试或 E2E 兜底。

E2E 使用 Playwright（只装 Chromium），配置见 `playwright.config.ts`，用例在 `tests/e2e/`。`tests/e2e/fixtures.ts` 用 `page.route` 拦截全部 `/v2/**` 请求并记录调用，未 mock 的接口会返回 404 且测试结束时报错，**不要让它穿透到开发代理**；`api.scenario` 切换场景，`signIn()` 预置登录 cookie，`api.count()` / `api.lastBody()` 用于断言请求。现有场景覆盖首页冒烟、登录登出、路由权限、公告、申请提交、审核分页、会话续期与路由滚动。涉及登录态、权限、公告、申请等跨页面链路时执行 `pnpm test:e2e`（首次需 `pnpm exec playwright install chromium`）。

## 构建与部署

- 站点根只放三个固定 URL 文件：`index.html`、`sw.js`、`manifest.webmanifest`；其余静态资源（`_oaa/*`、`oaa.svg`、`apple-touch-icon.png`、`pwa-*.png`）都随 OSS 版本目录 `oaa-fe/v{version}/` 发布。
- manifest 图标是构建期拼出的 OSS 绝对地址（`vite.config.ts` 的 `pwaIcon()`），Service Worker 只预缓存 `manifest.webmanifest`（`includeManifestIcons: false`）——跨域图标不能进 precache。动 PWA 配置时这两条要一起看，否则会出现「浏览器去站点根找图标」的 404。
- `index.html` / `sw.js` / `manifest.webmanifest` 必须 `no-cache`，`_oaa/*` 与图标可长缓存；`manifest.webmanifest` 的 `Content-Type` 必须是 `application/manifest+json`，否则 Chrome 不认、PWA 安装失效。
- 版本号来自 `package.json`，同时决定 OSS 目录、manifest 与设置页展示；发版先改版本号再构建。
- 部署脚本在 `scripts/deploy/`，配置读 `scripts/deploy/deploy.local.json`（已 gitignore，含密钥）；命令与 Nginx 响应头要求见 `README.md` 的「部署」一节。「设置响应头」仍是人工步骤，`pnpm deploy:check` 只告警不代改。
- `pnpm deploy` 与 pnpm 内置 `deploy` 命令同名，`--dry-run` 这类 pnpm 参数会被吞掉；部署脚本没有试运行模式，`pnpm deploy --dry-run` 仍会真实部署。
- `sw.js` 用 `inlineWorkboxRuntime: true` 内联 Workbox 运行时，站点根因此仍只有三个文件；改 PWA 配置时别把 `workbox-*.js` 又外置出去。

## 已知行为与取舍

以下是有意为之的行为，不要当成 bug「顺手修掉」：

- `request` 默认超时 5 秒；上传单独放宽到 120 秒。
- 刷新 token 失败（含网络失败）会清空登录态并跳登录页，`tests/integration/request.spec.ts` 对此有断言。
- 前端密码校验只判非空，强度以后端为准。
- token 存在 JS 可读的 cookie 里，站点未配置 CSP；XSS 面靠「不使用 `v-html`、markdown 默认关闭原生 HTML」控制，新增富文本渲染前先评估。
- 公告正文由 md-editor-v3 渲染，默认 `html: false`；不要为了排版打开原生 HTML。
- 首页文案里提到的 SSO / 比赛功能尚未实现。

## 硬性约束

1. **提交与推送需经用户确认**：不要自行 `git commit`、`git push`、变基或改写历史，除非用户明确要求。
2. **新增依赖前必须先征询**：安装任何包之前说明用途与体积影响，得到同意后再执行 `pnpm add`。
3. **完成任务前必须通过 `pnpm lint` 与 `pnpm type-check`**：两者任一失败都不得声称完成。
