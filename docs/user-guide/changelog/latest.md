# 最新版本与更新日志

> 当前主线：**4.10.10**（见根目录 `package.json`）

## 4.10.10 发布要点

`4.10.10` 是一次小版本维护发布，集中收录 `v4.10.9` 之后的近期主线改动。普通站点同步最新 `main` 后重新部署即可；只有需要内嵌子页面层级 URL 或 PWA 安装入口的站点，才需要新增可选配置。

### PWA 安装入口

- 新增可选配置 `PWA_ENABLE=true`，开启后 Android Chrome 可将博客安装到桌面。
- 安装入口由 Notion Config 或环境变量 `PWA_ENABLE` 控制，主题色可通过 `PWA_THEME_COLOR` 配置。
- manifest 使用固定路径 `/manifest.json`，默认指向首页 `/`，并使用站点标题、描述和站点图标生成安装信息。
- `PWA_NAME`、`PWA_SHORT_NAME`、`PWA_ICON` 可作为少数站点的备用覆盖项；默认情况下无需单独配置。
- 功能默认关闭，不影响未开启站点。

使用方法见 [PWA 安装入口](../config/pwa-install.md)。

### Notion 内嵌子页面 URL

- 新增可选配置，推荐在 Notion Config 中添加 `INNER_PAGE_URL_PARENT_PATH=true`。
- 也可以在部署平台添加 `NEXT_PUBLIC_INNER_PAGE_URL_PARENT_PATH=true`。开启后，未收录到数据库的 Notion 内嵌子页面 URL 会跟随当前文章路径，例如 `/article/fpga-studying-notes/{pageId}`。
- 已收录到 NotionNext 数据库、并拥有明确 `slug / href` 的页面仍优先跳转自己的正式地址，避免影响 sitemap、RSS、站内搜索和旧链接兼容。
- 该能力只优化访问路径和层级表达；未收录子页面不会因此自动进入 sitemap、RSS 或搜索索引。需要 SEO 收录的页面仍建议加入主数据库并配置明确 `slug`。

使用方法见 [URL 自定义：内嵌子页面跟随父路径](../config/url-customize.md#内嵌子页面跟随父路径)。

### 阅读与主题体验

- 修复静态分享 SVG 被 Next/Image 优化导致的显示风险，分享图标继续按静态资源方式加载。
- Magzine 主题恢复文章页广告与侧栏间距，避免正文和广告区域贴得过近。
- 主题设置抽屉增加更顺滑的动效反馈。
- XuHome 主题完成主线集成，并补充深色模式对比度与调色板实时生效修复。
- NotionTabs 支持 keep-alive 行为，切换标签时可保留已渲染内容状态。
- Callout 嵌套子块和无图标 Callout 渲染更稳定。

相关文档：

- [主题目录](../themes/THEMES_CATALOG.md)
- [Magzine 主题](../themes/magzine.md)
- [代码样式与侧栏预览](../config/notion-next-code-style.md)

### 部署与依赖

- 继续跟进依赖维护和安全更新，包括 Next.js、Supabase、Vercel Functions 及开发依赖组。
- Notion 图片浏览器缓存和 Cloudflare 文档继续保持在新版手册中，方便站长按需配置。

相关文档：

- [部署指南索引](../deploy/index.md)
- [Notion 图片反代与缓存](../deploy/notion-image-proxy.md)

### 升级说明

- 普通 Vercel / Netlify / Cloudflare Pages / Docker 站点：同步最新 `main` 后重新部署即可。
- 如果要启用 Android Chrome PWA 安装入口，推荐在 Notion Config 添加 `PWA_ENABLE=true`。
- 如果要启用内嵌子页面父路径 URL，推荐在 Notion Config 添加 `INNER_PAGE_URL_PARENT_PATH=true`。
- 也可以在部署平台添加 `NEXT_PUBLIC_INNER_PAGE_URL_PARENT_PATH=true` 后重新部署。
- 如果你依赖 Docker 镜像，请等待本版本 GitHub Release 对应的 GHCR 镜像发布完成后再拉取。

### GitHub Release

- Release：[v4.10.10](https://github.com/notionnext-org/NotionNext/releases/tag/v4.10.10)
- 完整变更：[v4.10.9...v4.10.10](https://github.com/notionnext-org/NotionNext/compare/v4.10.9...v4.10.10)

## 4.10.9 发布要点

本版本集中合入 `v4.10.8` 之后的社区修复、Notion 渲染兼容、主题移动端体验、依赖安全更新和 Docker 发布增强。多数站点只需要同步最新 `main` 并重新部署，不需要新增环境变量。

- 新增 OpenAI 兼容 AI 助手代理，可通过 `AI_CHAT_*` 配置接入 DeepSeek 等兼容 `chat/completions` 的模型服务。

### Notion 数据与内容渲染

- Notion Config 读取兼容新版 Notion 数据库块：配置库既可以来自 `collection_view`，也可以来自 `collection_view_page`。
- 修复页面中包含数据库视图、HTML 块、空 `content` 字段或异常 transclusion 引用时，构建阶段出现 `content is not iterable` 的问题。
- 文章目录生成会跳过非数组内容，避免数据库视图或特殊块影响整页渲染。
- 支持 Notion Tabs 块渲染，适合在文章中整理多组并列内容。
- 自定义菜单可以指向 `Invisible` 页面，并优先使用该隐藏页最终生成的访问地址；`Draft` 等未发布页面不会因此被菜单暴露。

### 阅读与写作体验

- 长代码块在桌面端支持“侧栏查看”，便于阅读超长配置、脚本和日志。
- 分享按钮在移动端改为横向滚动，不再挤压变形。
- 加密文章提交按钮在多个主题中统一修复，窄屏下不会只显示半个“提交”。
- 原创存证、公开清单和一键复制证据能力已进入文档化使用路径，适合原创长文站点逐步启用。
- 内嵌 Notion 子页面可通过 Notion Config 配置 `INNER_PAGE_URL_PARENT_PATH=true`，或通过环境变量 `NEXT_PUBLIC_INNER_PAGE_URL_PARENT_PATH=true`，让未收录子页的访问地址跟随父级文章路径。

### 主题修复

- Matery 主题优化移动端文章标题、标签换行和正文页间距。
- Claude / Typography / Game / Nobelium / Plog 等主题补齐菜单和子菜单图标显示。
- Claude / Typography 子菜单图标条件修正，避免生成空图标占位。
- Matery 右下角悬浮按钮、分享按钮和标签布局相关修复已合入主线。

### 部署、依赖与安全

- Docker GHCR 镜像发布增加 provenance 与 SBOM attestation，便于自托管用户检查镜像来源和依赖清单。
- 依赖更新：`next`、`axios`、`@supabase/supabase-js`、`ip-address`、`nanoid` 等。
- GitHub Actions 更新：`actions/setup-node`、`actions/setup-python`、`actions/stale`、`actions/labeler`、`github/codeql-action`。

### 对应文档

- 升级方式：见 [版本升级指引](../update.md)。
- Notion 数据库与块兼容：见 [Notion 数据库](../notion-database.md)。
- 菜单与隐藏页：见 [菜单 Menu / SubMenu](../menu-secondary.md) 与 [隐藏页面](../notion/notionnext-hidden-page.md)。
- 代码侧栏预览：见 [代码块风格](../config/notion-next-code-style.md)。
- 主题变化：见 [主题全览](../themes/THEMES_CATALOG.md)、[Matery](../themes/matery.md)、[Claude](../themes/claude.md)、[Typography](../themes/typography.md)。
- Docker / VPS：见 [部署指南索引](../deploy/)。

### 升级说明

- 普通 Vercel / Netlify / Cloudflare Pages / Docker 站点同步最新代码并重新部署即可。
- 如果你使用 Notion Config 数据库作为配置来源，建议升级后打开首页确认站点名、主题、菜单等配置是否按预期读取。
- 如果菜单跳转到隐藏页面，升级后可将目标页面设为 `Invisible`，菜单会指向该页面的真实生成路径。
- 如果使用自定义主题或深度改过主题菜单组件，建议重点检查菜单图标、子菜单、加密文章提交按钮和移动端分享栏。

### GitHub Release

- Release：[v4.10.9](https://github.com/notionnext-org/NotionNext/releases/tag/v4.10.9)
- 完整变更：[v4.10.8...v4.10.9](https://github.com/notionnext-org/NotionNext/compare/v4.10.8...v4.10.9)

## 4.10.8 发布要点

本版本新增 Cloudflare Worker 版 Notion 图片反代示例，并补充完整站长教程。站长可以把 Notion 素材统一映射到自己的 CDN 域名，例如 `https://cdn.example.com`，让 `www.notion.so/image/...` 和 Notion 内置封面图经过自己的 Cloudflare 缓存。

### Notion 图片反代

- 新增 `cloudflare/notion-image-proxy` 最小 Worker 工程，默认只放行 `/image/` 和 `/images/`。
- Worker 支持 Notion 签名图片跳转链路，并使用 `caches.default` 显式缓存响应，重复访问同一图片可观察到 `X-Notion-Image-Proxy-Cache: HIT`。
- 示例配置使用 Cloudflare Custom Domain，生产示例域名为 `cdn.tangly1024.com`。
- 保持 NotionNext 侧接入方式不变：只需配置 `NEXT_PUBLIC_NOTION_HOST=https://你的CDN域名`。

### 文档

- 新增 Notion 图片反代教程，覆盖 Worker 部署、API Token 权限、Custom Domain 限制、本地预览、`yarn start` / `yarn export` 兼容性和缓存验证方式。
- 记录常见坑：`Write all resources` 仍缺 `User -> Memberships -> Read`、Custom Domain 不能带路径、浏览器内存缓存会显示旧的 `CF-Cache-Status: MISS`、`prod-files-secure` 不能直接请求 S3 原始地址。
- VitePress 部署目录新增「Notion 图片反代」入口。
- 新增原创存证教程，说明 `NEXT_PUBLIC_ORIGINALITY_PROOF_ENABLE`、Notion `proof` / `proofTime` / `proofHash` / `proofUrl` 字段，以及本地内容哈希的证明边界。
- 原创存证展示改为紧凑徽章，可展开查看详情并一键复制证据文本。
- 原创存证新增可选 GitHub 自动公开清单模式，构建时可生成 `public/proofs/originality.json`，用于公开保存文章哈希证据。
- 原创存证教程补充自动清单 JSON 示例、字段说明和 workflow 常见问题排查。

### 升级说明

- 该能力是可选增强，不影响默认 `https://www.notion.so` 图片加载。
- 动态部署和静态导出都可使用；静态站点只要重新构建，让 HTML 输出新的 `NEXT_PUBLIC_NOTION_HOST` 即可。
- 图片请求量大的站点建议使用 Workers Paid，因为每张图片请求都会计入 Worker request。

### 验证

- `node --check cloudflare/notion-image-proxy/worker.mjs`：通过。
- `curl -I` 连续请求真实 Notion 图片：第二次返回 `CF-Cache-Status: HIT` 与 `X-Notion-Image-Proxy-Cache: HIT`。
- `git diff --check`：通过，仅保留 Windows 工作区 LF/CRLF 提示。

## 2026-08-05 自动部署流程事故记录

::: warning 事件说明
部分使用 GitHub fork + Vercel 自动部署的站点，曾收到 `Upstream Sync` 或 `chore(release): bump package.json ... [skip-version]` 构建失败邮件；个别站点可能因此出现生产部署异常。
:::

### 影响范围

- 仅影响仍保留旧版自动同步或自动版本 bump 工作流的 fork 站点。
- 手动同步、未连接 Vercel Git 部署，或使用其他部署方式的站点不在此次自动触发范围内。
- 本次事件不涉及 Notion 数据丢失；问题发生在代码同步和部署触发链路。

### 原因分析

1. 旧版 `Upstream Sync` 使用定时任务，将上游 `main` 的提交自动合并到站长的 fork。
2. 旧版版本 bump 工作流在 `main` 更新后自动修改 `package.json`，即使只改变版本号，也会产生新的 Git 提交。
3. Vercel 对 fork 的 `main` 提交自动创建部署，因此版本号提交也会触发完整生产构建。
4. 提交信息中的 `[skip-version]` 只能阻止 GitHub Actions 自身重复 bump，不能让 Vercel 跳过构建。旧站点的构建失败后，可能出现错误部署记录或生产指向异常。

### 修复措施

- 关闭 `Upstream Sync` 默认定时任务，改为站长按需手动同步。
- 关闭版本 bump 工作流的 `push` 触发，仅保留手动执行。
- 在 `vercel.json` 中加入 `ignoreCommand`，让 Vercel 自动跳过带 `[skip-version]` 的版本号提交。
- 在升级教程中补充旧自动流程的恢复步骤和按需开启方法。

相关修复已合并到主线：

- [`0ca93d86`](https://github.com/notionnext-org/NotionNext/commit/0ca93d86946a97f9f1bc292e0468cda278e0a59b)

### 站长如何处理

如果站点已经出现失败部署：

1. 在 Vercel 的 `Deployments` 中找到最近一条绿色 `Ready` 的 `Production` 部署，使用 `Promote to Production` 或 `Redeploy` 恢复线上版本。
2. 将 fork 同步到最新的 NotionNext `main`，使新的工作流和 `vercel.json` 进入自己的仓库。
3. 后续无需重新开启旧的定时任务；需要更新时使用 GitHub 的 `Sync fork` 或手动合并上游代码。

上游仓库无法直接修改每个站长账号下的 Vercel 项目，也无法替旧 fork 远程执行同步。因此，历史旧 fork 至少需要完成一次同步，才能获得本次保护规则。

::: tip 当前状态
主线修复已发布，主线 CI 工作流、CodeQL、文档部署和关联 Vercel Production 部署均已验证通过。后续版本发布不再通过自动版本号提交触发所有 fork 的生产重建。
:::

### 2026-08-05 Notion API 403 后续修复

部分站点在同步最新代码后，Vercel 构建仍可能出现：

```text
[POST] https://www.notion.so/api/v3/loadPageChunk: 403 Forbidden
```

经与 [react-notion-x issue #710](https://github.com/NotionX/react-notion-x/issues/710) 对照确认，原因是 Notion 前置 Cloudflare 开始拦截 Node.js 请求中缺少 `User-Agent` 的非官方 API 请求。该问题不是站长的页面权限或 `NOTION_PAGE_ID` 配置突然失效。

修复内容：

- 在 `notion-client` 的全局 `ofetchOptions` 中补充 `NotionNext` 的 `User-Agent`。
- 保留 Notion 请求失败时的空数据兜底，避免 403 进一步导致页面静态序列化失败。

验证结果：同一接口请求不带 UA 返回 `403`，带 `NotionNext` UA 返回 `400`（空请求参数错误），证明 Cloudflare 拦截已解除。

站长处理方式：将 fork 同步到最新 `main` 后重新部署即可；无需修改 Node 版本，也无需反复修改页面权限。若仍出现 403，请先确认部署使用的是包含该修复的提交，并检查是否配置了自定义 `API_BASE_URL` 代理。

## 4.10.7 发布要点

本版本将主题颜色定制从 Tailwind 类名覆盖，过渡到主题语义色变量与调色板方案。早期使用 TailwindCSS 是为了快速开发；现在主题框架已经成熟，后续更适合通过 `*_COLOR_*` 配置项表达主色、背景、文字、边框等语义色，便于用户在 Notion Config 中快速调色，也避免 `.bg-indigo-600` 这类工具类被覆盖后产生语义混淆。

### 主题调色板

- 全局主题工具新增当前主题调色板，展示每个主题可覆盖的色号变量、CSS 变量名、默认色值和复制入口。
- 25 个内置主题均已在 `conf/themeSwitch.manifest.js` 声明 palette；切换主题后即可查看该主题的可配置色号。
- Fuwari 保留原有色相模型，调色板显示 `FUWARI_THEME_COLOR_HUE`，复制值为数字色相，避免破坏现有配置。
- Endspace、Heo、Claude 等多色主题提供更完整的背景、文字、强调色、边框等变量；Fuwari、Hexo、Medium 等单主色主题保持轻量色板。

### 配置与兼容

- 新增或整理各主题的 `*_COLOR_*` 配置项，用户可在 Notion Config 表、环境变量或主题 `config.js` 中覆盖。
- 保留既有 TailwindCSS 与旧配置的渲染路径，不要求用户立即迁移；推荐新调色优先使用主题色变量。
- 补充主题迁移指南与主题色 token roadmap，后续新增主题必须首版声明 `*_COLOR_*` 与 manifest 调色板。
- 各主题文档补充调色说明，说明如何从全局主题工具复制配置项并在 Notion Config 中覆盖。

### 验证

- Babel parser 定向解析：通过。
- `npx eslint` 定向检查主题色相关文件：通过。
- manifest smoke check：25 个内置主题 palette 覆盖率 100%。
- `git diff --check`：通过，仅保留 Windows 工作区 LF/CRLF 提示。

## 4.10.5 发布要点

本版本新增基于 Notion 数据库的 NotionComments 评论插件，并合入 `v4.10.4` 之后主线上的主题修复、Notion 渲染增强、复制权限配置、SEO 和依赖更新。

### NotionComments 评论插件

- 新增 `NEXT_PUBLIC_COMMENT_NOTION_ENABLE` 评论开关，可与 Waline、Giscus、Valine、GitTalk、Utterance、Cusdis、Twikoo 等评论插件并存，通过文章底部评论区 Tab 切换体验。
- 新增 `/api/notion-comments` 动态接口，评论数据写入用户自己的 Notion 数据库，支持文章维度查询、发表评论、回复评论、分页加载和失败重试。
- 新增评论区交互界面：加载中、空状态、错误重试、回复输入、收起回复、加载更多等基础状态都已覆盖。
- 新增 NotionComments 使用教程，包含 Notion Integration 创建、数据库字段配置、环境变量、部署方式、常见问题、使用效果截图，以及“独立评论数据库”和“Notion 页面原生评论”两种方案的取舍说明。
- 新增会员评论路线图文档，记录未来会员体系和评论能力继续结合 Notion 数据的可选方向。

### 主线功能与修复

- 支持文章级自定义版权模式，并补充 `CAN_COPY` 复制权限配置文档和侧边栏入口。
- 改进 SEO canonical metadata，减少错误 canonical 地址对搜索收录的影响。
- 支持 Notion Heading 4 渲染。
- 支持应用 Notion Collection View 的排序规则。
- 修复分类和标签静态路径生成的保护逻辑。
- 同步 Endspace 主题更新。
- 修复 Claude 主题侧栏在 Adsense 场景下的高度问题。
- 修复 Fuwari 固定主题色不生效问题。
- 修复 Magzine 主题文章标签换行问题。
- 为分享按钮和右侧浮动区域补充鼠标悬停提示。

### 依赖与工作流更新

- `form-data` 从 `4.0.5` 升级到 `4.0.6`。
- `@babel/core` 从 `7.28.3` 升级到 `7.29.7`。
- `axios` 从 `1.17.0` 升级到 `1.18.1`。
- `@vercel/functions` 从 `3.6.2` 升级到 `3.7.5`。
- `actions/checkout` 从 `4` 升级到 `7`。
- `docker/metadata-action` 从 `5` 升级到 `6`。

### 修复与回归保护

- 如需启用 NotionComments，需要新增：
  - `NEXT_PUBLIC_COMMENT_NOTION_ENABLE=true`
  - `NOTION_COMMENT_DATABASE_ID=你的评论数据库 ID`
  - `NOTION_TOKEN=你的 Notion Integration Token`
- NotionComments 依赖服务端 API Route，只支持 Vercel、Netlify、Node.js Server、Docker 等动态部署方式；使用 `yarn export` / 纯静态导出的站点不支持该插件。
- `NOTION_TOKEN` 是敏感凭据，只应保存在服务端环境变量中，不要提交到仓库，也不要暴露在公开截图或前端配置里。

### 自 v4.10.4 以来的提交

- `feat: add Notion database comments plugin`
- `docs: add optional membership comments roadmap`
- `fix(endspace): sync upstream theme updates`
- `fix: improve SEO canonical metadata (#4248)`
- `feat: support custom article copyright mode`
- `fix(claude): keep sidebar height with adsense (#4247)`
- `fix: guard category/tag static paths`
- `docs: explain adding CAN_COPY in Notion`
- `docs: expose copy permission guide in sidebar`
- `docs: add copy permission guide to config index`
- `feat: support per-post copy permissions`
- `fix(fuwari): honor fixed theme hue (#4243)`
- `fix(magzine): keep post tags on one line`
- `docs: fix post list style config comment (#4242)`
- `fix: support Notion heading 4 (#4241)`
- `fix: apply Notion collection view sorts (#4240)`
- `chore(share buttons): add tips for mouse hover (#4212)`
- `chore(right float area): add tips (#4213)`
- `chore: bump form-data from 4.0.5 to 4.0.6 (#4204)`
- `chore: bump @babel/core from 7.28.3 to 7.29.7 (#4211)`
- `chore: bump axios from 1.17.0 to 1.18.1 (#4222)`
- `chore: bump docker/metadata-action from 5 to 6 (#4228)`
- `chore: bump actions/checkout from 4 to 7 (#4229)`
- `chore: bump @vercel/functions from 3.6.2 to 3.7.5 (#4238)`

### 验收结果

- `jest __tests__/lib/plugins/notionComments.test.js --runInBand`：通过。
- `next lint --file components/NotionComments.js --file lib/plugins/notionComments.js --file __tests__/lib/plugins/notionComments.test.js`：通过。
- `git diff --check`：通过。
- `yarn docs:site:build`：通过。

> 说明：当前工作区直接运行 Jest 仍会被既有 `canvas.node` 原生绑定缺失问题阻塞；新增回归测试文件本身已通过 ESLint，并用运行态脚本验证了核心链接映射逻辑。

## 如何升级

- 站长升级：见 [版本升级指引](../update.md)。
- 构建性能与 Notion API 限流：见 [构建性能与 Notion API 限流](../deploy/build-tuning.md)。
- GitHub Release：[NotionNext Releases](https://github.com/notionnext-org/NotionNext/releases)。

## 历史版本全文

- [V4 历史](./v4-history.md)
- 源站：https://docs.tangly1024.com/article/latest
