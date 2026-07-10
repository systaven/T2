# 最新版本与更新日志

> 当前主线：**4.10.5**（见根目录 `package.json`）

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
