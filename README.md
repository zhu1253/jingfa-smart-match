# 京发智配原型

跨境融资客户录入、产品准入比对与方案输出的 React + Vite 原型。

## 已实现

- 首页汇总资金方、融资产品、生态伙伴与待补全客户
- 工作台支持切换不同客户，并同步更新客户画像与产品匹配结果
- 渠道方一次性录入客户资料
- 缺失项集中提示，不逐条追问
- 24 个产品档案，其中9个已启用自动匹配、15个因口径或客户字段不足转入人工复核
- 49 家资金、场景、数据与渠道伙伴档案
- 全产品逐条比对并按匹配度排序
- 每个产品标注“可做”或“不建议”，展示符合项或明确卡点
- 建议顺序、预估额度、利率、期限和材料清单
- 一键复制客户转发摘要、下载文本匹配报告
- 产品中心、生态伙伴、资料库和公司介绍
- 公司介绍依据用户提供的《京发云数科整体介绍2026版(1).pdf》（36页）整理，数据集中在 `src/company-profile.ts`；此前PPT不作为当前公司介绍来源
- 系统设置支持默认进入页面、导航默认收起、列表密度与减少动效，按账号在当前浏览器保存；提供账号管理、资料库锁定和代理连通性检测
- 已接入 Jfclaw-1.0 通用业务智能体，可使用客户、产品、生态伙伴与资料库内容进行问答、查询、总结、分析和报告生成
- 产品匹配作为独立模式且默认关闭，仅在用户主动开启后发送规则引擎结果
- 智能体支持快捷提问、Markdown 表格、发送中状态、超时与失败重试
- 客户、产品和伙伴列表支持详情查看、返回及编辑操作
- 资料库默认锁定，使用 Web Crypto PBKDF2 派生验证并采用会话级解锁
- 浏览器本地保存最近填写的客户资料
- 账号登录、真实身份菜单、退出和修改密码；MySQL 保存加盐密码哈希、会话摘要及登录限流记录

## 账号系统部署

正式站使用 `jingfa-auth` 独立后端服务（`server/auth-server.mjs`），通过 `deploy/Caddyfile.gateway` 为页面、静态资源和智能体接口统一验证登录。登录页单独构建，匿名请求无法读取业务包。会话 Cookie 采用 HttpOnly、Secure 和 SameSite=Lax，有效期8小时；退出会撤销服务端会话，修改密码会撤销该账号全部会话。登录页面不会展示默认凭据。

初始化流程：先备份并应用 `004_account_sessions.sql`，创建仅能读写账号、会话和限流表的专用 MySQL 账号，再填写服务器私有 `auth.env`（参考 `server/auth.env.example`）。管理员通过 `server/bootstrap-account.mjs` 从后端环境变量 `BOOTSTRAP_USERNAME`、`BOOTSTRAP_PASSWORD` 和可选 `BOOTSTRAP_DISPLAY_NAME` 创建：脚本输出的 SQL 只包含 scrypt 加盐哈希，重复导入不会重置已有密码。实际密码和环境文件不得提交仓库。

运行 `pnpm build:all` 同时构建业务页面 `dist/` 和独立登录页 `dist-login/`。将登录构建放在账号服务的 `public-login/` 下，并在服务目录执行 `npm ci --omit=dev --ignore-scripts`。`deploy/compose.auth.yml` 在私有 Docker 网络运行账号服务；`deploy/compose.web-static.yml` 使前端源站不再公开端口。配置、数据和旧容器应先备份再替换，最终在 Caddy 校验成功后热加载。

账号服务健康检查为内部 `/health`；对外接口为 `/api/auth/login`、`session`、`logout` 和 `password`。所有写入接口严格校验同源请求。前端账号信息来自服务端，密码、Cookie 或登录令牌不保存在 localStorage。客户草稿按用户ID分别保存在浏览器中；业务资料的编辑落库仍属于独立功能。

个人偏好使用带版本号的 `jingfa-preferences:v1:<user-id>` localStorage 键，不写入密码或服务密钥，不跨设备同步。默认进入页面仅在无有效页面 hash 时使用，已有深链接优先；减少动效同时遵循设备偏好。设置需保存后生效，支持取消、填入默认值及保存失败后重试。智能体“检测连接”仅调用同域 `/api/agent/health`，不发送对话、不验证上游模型可用性。

本地开发需先连接开发用 MySQL，设置 `PUBLIC_ORIGIN=http://127.0.0.1:4173`、`COOKIE_SECURE=false` 和数据库配置，再启动账号服务（3100端口）与 `pnpm dev`。Vite 已配置账号和登录页代理。本地开发账号应独立创建，不要使用生产数据库测试。`pnpm test:auth` 覆盖密码哈希、登录、会话、CSRF、过期、限流、改密及异常处理。

GitHub Pages 的静态托管无法运行服务端登录，因此其入口发布为正式站跳转页；GitHub 继续保存维护源码。

## 本地运行

```powershell
pnpm install
pnpm dev
```

默认本地访问地址：`http://localhost:4173/`

阿里云正式入口：[https://jfsmartfit.xyz/](https://jfsmartfit.xyz/)

Cloudflare 备用入口：[https://jingfa-jfyxy.olforms1253.workers.dev/](https://jingfa-jfyxy.olforms1253.workers.dev/)

GitHub Pages 备用入口：[https://zhu1253.github.io/jingfa-smart-match/](https://zhu1253.github.io/jingfa-smart-match/)

## 智能体代理

阿里云正式站使用同域 `/api/agent` 代理，API Key 只保存在服务器权限为 `600` 的环境变量文件中，不进入浏览器构建产物和 Git 仓库。代理服务运行在 Docker 内部网络，不对公网直接开放端口。

服务端变量模板见 `server/agent.env.example`，实际文件使用 `server/agent.env` 并已被 Git 忽略。Node 入口为 `server/agent-server.mjs`，它复用 Worker 的请求校验、业务提示词、重试与降级逻辑。

Cloudflare Worker 作为备用代理，API Key 通过 Worker Secret 注入：

```powershell
npx wrangler deploy --config worker/wrangler.jsonc
npx wrangler secret put AGENT_API_KEY --config worker/wrangler.jsonc
```

Cloudflare 备用入口通过独立的 `jingfa-jfyxy` Worker 提供 HTTPS。源站地址仅保存在 Worker Secret 中：

```powershell
npx wrangler deploy --config site-worker/wrangler.jsonc
npx wrangler secret put ORIGIN_BASE_URL --config site-worker/wrangler.jsonc
```

两个代理均限制请求频率、消息数量、单条长度和总体积；上游错误会转换为不含服务端细节的提示。阿里云同域代理用于改善中国大陆网络下的可达性。由于备用 Worker 的上游使用非标准 HTTP 端口，`UPSTREAM_ORIGIN_URL` 通过指向同一服务器 IP 的 DNS 名称解决 Cloudflare 自定义端口路由限制；上游 IP 变化时需要同步更新该配置。

## 独立 MySQL 数据库

阿里云正式环境使用独立的 `jingfa-mysql` 容器和 `jingfa_smartfit` 数据库。数据库仅加入 `jingfa_internal` Docker 私有网络，不发布公网端口；应用通过 `jingfa-mysql:3306` 和最小权限账号 `jingfa_app` 连接。实际凭据保存在服务器 `/opt/jingfa-smart-match/database/mysql/mysql.env`，文件权限为 `600`，不会进入前端构建产物或 Git 仓库。

版本化初始化文件位于 `database/mysql/migrations`，覆盖用户、客户、产品、准入规则、生态伙伴、资料及版本、文档分段、导入任务、Skill、会话和审计日志。原始 PDF、Word、Excel 等文件应保存在阿里云 OSS 或受控文件目录，MySQL 保存文件索引、提取文本、版本和检索引用。

新增迁移文件后，应先备份，再在服务器执行 `/opt/jingfa-smart-match/database/mysql/migrate.sh`；脚本只执行尚未登记的迁移。不要依赖 Docker 初始化目录自动升级已有数据卷，因为该目录只会在首次创建数据卷时执行。

产品、机构与资料索引共用同一份安全目录清单。前端目录更新后运行 `pnpm catalog:export` 生成 `database/mysql/catalog/financial-catalog-20260914.json`，再执行：

```bash
python3 database/mysql/import_catalog.py database/mysql/catalog/financial-catalog-20260914.json --execute
python3 database/mysql/import_knowledge_bundle.py /opt/jingfa-smart-match/private/imports/2026-09-14 --execute
```

第二条命令只接受通过隐私检查的私有导入包。受限协议仅建立元数据与文件索引，不生成智能体检索分块；原始文件保存在服务器私有目录，不进入 Git 仓库或前端构建产物。

备份脚本为 `database/mysql/backup.sh`，默认生成压缩 SQL、SHA-256 校验文件并保留 14 天。生产服务器已启用 `jingfa-mysql-backup.timer`，每天北京时间 03:20 后随机延迟最多 20 分钟执行，备份保存在 `/opt/jingfa-smart-match/database/backups`。对应的 systemd 单元位于 `database/mysql/systemd`。

应用账号只有业务表所需的数据权限：可读取全库、读写业务记录、写入审计日志，但不能执行 DDL、修改迁移记录、修改既有审计记录或修改工作区配置。当前前端目录由版本化清单构建，MySQL 同步保存规范化产品、伙伴、资料元数据和安全文本分块；浏览器侧编辑仍是会话内状态，后续接入管理 API 后由 MySQL 作为唯一写入源。

## 安全边界

GitHub Pages 是静态托管环境。资料库密码不会以明文写入前端代码，当前采用 PBKDF2 派生值进行验证，适合作为演示环境的访问门槛；真实机密资料仍需接入服务端身份认证、权限校验和受控文件存储。使用智能体时，当前客户的经营、征信摘要和产品匹配结果会经 Worker 发送至已配置的上游服务，请按实际业务的数据授权与隐私政策使用。

## 数据说明

首批自动规则根据微众、富融、PAOB、平安、浦发、中关村、汇丰、丰泊与天逸等资料整理。本批新增Olea浩立、Qupital桥彼道、联易融国际Unloq和简单汇产品/方案；没有完整准入红线或无法由现有客户字段判定的记录不会自动标为“可做”。产品政策可能变化，所有页面均保留“以资金方最终审批为准”的提示。
