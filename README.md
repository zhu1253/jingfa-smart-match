# 京发智配原型

跨境融资客户录入、产品准入比对与方案输出的 React + Vite 原型。

## 已实现

- 首页汇总资金方、融资产品、生态伙伴与待补全客户
- 工作台支持切换不同客户，并同步更新客户画像与产品匹配结果
- 渠道方一次性录入客户资料
- 缺失项集中提示，不逐条追问
- 9 个首批产品的结构化准入规则
- 全产品逐条比对并按匹配度排序
- 每个产品标注“可做”或“不建议”，展示符合项或明确卡点
- 建议顺序、预估额度、利率、期限和材料清单
- 一键复制客户转发摘要、下载文本匹配报告
- 产品中心、生态伙伴、资料库和公司介绍
- 已接入 Jfclaw-1.0 通用业务智能体，可使用客户、产品、生态伙伴与资料库内容进行问答、查询、总结、分析和报告生成
- 产品匹配作为独立模式且默认关闭，仅在用户主动开启后发送规则引擎结果
- 智能体支持快捷提问、Markdown 表格、发送中状态、超时与失败重试
- 客户、产品和伙伴列表支持详情查看、返回及编辑操作
- 资料库默认锁定，使用 Web Crypto PBKDF2 派生验证并采用会话级解锁
- 浏览器本地保存最近填写的客户资料

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

备份脚本为 `database/mysql/backup.sh`，默认生成压缩 SQL、SHA-256 校验文件并保留 14 天。生产服务器已启用 `jingfa-mysql-backup.timer`，每天北京时间 03:20 后随机延迟最多 20 分钟执行，备份保存在 `/opt/jingfa-smart-match/database/backups`。对应的 systemd 单元位于 `database/mysql/systemd`。

应用账号只有业务表所需的数据权限：可读取全库、读写业务记录、写入审计日志，但不能执行 DDL、修改迁移记录、修改既有审计记录或修改工作区配置。当前前端仍使用静态演示数据；后续接入上传和管理 API 后再迁移到 MySQL，避免影响现有线上功能。

## 安全边界

GitHub Pages 是静态托管环境。资料库密码不会以明文写入前端代码，当前采用 PBKDF2 派生值进行验证，适合作为演示环境的访问门槛；真实机密资料仍需接入服务端身份认证、权限校验和受控文件存储。使用智能体时，当前客户的经营、征信摘要和产品匹配结果会经 Worker 发送至已配置的上游服务，请按实际业务的数据授权与隐私政策使用。

## 数据说明

首批规则根据附件中的微众跨境电商贷、富融出海贷、PAOB 壹易贷、平安银行、浦发银行、中关村银行、汇丰银行、丰泊国际与天逸保理等资料整理。产品政策可能变化，所有页面均保留“以资金方最终审批为准”的提示。
