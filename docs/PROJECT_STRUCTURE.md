# 心智门户与剧本库项目结构说明

本文用尽量直白的语言说明项目每个目录负责什么、前后端分别在哪里、核心代码在哪里，以及一个请求是如何从页面走到数据库和私有文件的。

> 本文是长期维护文档。目录、模块边界、部署结构发生实质变化时，需要同步更新本文和 `docs/llm/STATE.yaml`。

## 一句话理解项目

这是一个“前后端逻辑分离、部署不分离”的模块化单体项目。

- 前端页面和后端 API 在同一个 Next.js 仓库里。
- 前端不直接访问数据库，只通过 `/api/v1` 调用后端。
- 后端按身份、剧本、交易、心源和门户海报拆成独立模块。
- 当前只需要部署一个应用服务和一个 PostgreSQL，保持轻量。
- 将来业务量变大时，可以把后端模块拆成独立服务，前端页面不必推倒重写。

## 项目总目录

```text
next-shadcn-dashboard-starter/
├── src/                      核心源代码，项目最重要的目录
│   ├── app/                  页面地址和 API 地址
│   ├── features/             前端业务界面
│   ├── modules/              后端核心业务规则
│   ├── infrastructure/       数据库、文件存储、支付适配器
│   ├── shared/               全项目共用的底层能力
│   ├── components/           通用前端组件
│   ├── styles/               全局视觉样式
│   └── lib/                  小型通用工具
├── drizzle/                  数据库版本和升级记录
├── packages/                 可供用户下载的官方 Agent Skill 源码
├── openapi/                  外部 Agent API 的机器可读契约
├── public/                   品牌标志、门户固定图片和 PV 视频
├── scripts/                  初始化、检查、备份等运维脚本
├── docs/                     项目、部署和 LLM Wiki 文档
├── var/                      上传、备份与临时任务目录，运行内容不提交 Git
├── Dockerfile                生产镜像构建方式
├── compose.yaml              本地开发数据库
├── compose.production.yaml   正式服务器部署结构
├── package.json              项目依赖和常用命令
├── next.config.ts            Next.js 和安全响应头配置
├── env.example.txt           本地环境变量模板
└── env.production.example.txt 生产环境变量模板
```

## 前端在哪里

前端主要由 `src/app`、`src/features`、`src/components`、`src/styles` 和 `public` 组成。

### `src/app`：网址入口

`src/app` 决定访问哪个网址时显示哪个页面。

```text
src/app/
├── page.tsx                       门户首页 /
├── layout.tsx                     全站最外层框架
├── not-found.tsx                  404 页面
├── global-error.tsx               全局异常页面
└── (script-library)/
    ├── scripts/page.tsx           剧本库首页 /scripts
    ├── scripts/[id]/page.tsx      剧本详情 /scripts/剧本ID
    ├── login/page.tsx             登录注册 /login
    ├── account/page.tsx           个人中心 /account
    ├── agent/page.tsx             Agent说明与Skill下载 /agent
    ├── terms/page.tsx             用户协议 /terms
    ├── privacy/page.tsx           隐私政策 /privacy
    └── admin/page.tsx             管理后台 /admin
```

括号和方括号的含义：

- `(script-library)` 只是代码分组，不会出现在网址中。
- `[id]` 是动态参数，每个剧本会使用自己的 ID。

这些 `page.tsx` 应保持轻薄，主要负责把业务组件组装成页面，不在里面堆购买、扣费或权限规则。

### `src/features/portal`：公司门户

这里负责门户首页的具体交互：

- `hero-video.tsx`：首页 PV 播放与切换。
- `work-reel.tsx`：滚动作品封面。
- `mobile-navigation.tsx`：手机端导航。

门户页面总入口是 `src/app/page.tsx`。

### `src/features/script-library`：剧本库界面

这是剧本库前端的核心目录。

- `library-home.tsx`：搜索、筛选、剧本卡片和已售状态。
- `script-detail.tsx`：导演阐述、试读、购买和文件下载。
- `login-screen.tsx`：登录、白名单注册和协议同意。
- `account-screen.tsx`：心源余额、已购剧本、整包下载、流水、充值占位和密码修改。
- `admin-dashboard.tsx`：管理员后台总界面。
- `agent-manager.tsx`：Agent灰度授权、Key、导入记录和待审核草稿。
- `script-upload-flow.tsx`：上传新剧本。
- `script-editor.tsx`：编辑剧本资料和白名单试读。
- `showcase-manager.tsx`：管理门户滚动海报。
- `library-header.tsx`：剧本库导航、用户头像和账户菜单。
- `legal-document.tsx`：用户协议与隐私政策共用的阅读版式。
- `demo-modal.tsx`：通用弹窗。
- `api/types.ts`：前端使用的数据结构定义。

`demo-context.tsx` 是早期 UI 原型留下的文件名。目前它已经连接正式 API、登录状态、购买和后台数据，不是纯演示数据。后续可以在不改变行为的情况下改名为 `script-library-provider.tsx`。

### 通用界面资源

- `src/styles/globals.css`：全站颜色、字体、动画和响应式样式。
- `src/components/icons.tsx`：统一图标入口。
- `src/components/xinzhi-brand.tsx`：全站复用的心智标志与横版品牌组合。
- `src/components/ui/`：多个页面复用的基础 UI。
- `public/brand/`：彩色、单色、应用图标和高清 PNG 品牌资产。
- `public/portal/`：门户固定图片、封面和两支 PV 视频。

`public` 中的内容可以被浏览器直接访问，因此完整剧本绝不能放在这里。

## 后端在哪里

后端由三层组成：API 入口、业务模块、基础设施。

```text
浏览器
  ↓
src/app/api                 接收请求
  ↓
src/modules                 执行业务规则
  ↓
src/infrastructure          操作数据库、文件或支付适配器
  ↓
PostgreSQL / 私有文件目录
```

### `src/app/api`：后端入口

这里是前端可以调用的正式接口。

```text
/api/auth/...                        登录、退出和会话
/api/v1/auth/register               白名单注册码注册
/api/v1/scripts                     剧本列表
/api/v1/scripts/[id]                剧本详情
/api/v1/scripts/[id]/purchase       购买剧本
/api/v1/scripts/[id]/files/[kind]   下载已购文件
/api/v1/scripts/[id]/files/all      下载全部交付物料 ZIP
/api/v1/account                     个人账户和心源流水
/api/v1/admin/scripts               后台剧本管理
/api/v1/admin/users                 用户管理
/api/v1/admin/users/[id]/points     管理员增减心源
/api/v1/admin/invite-codes          注册码管理
/api/v1/admin/orders                订单查询
/api/v1/admin/showcase-posters      门户海报管理
/api/v1/admin/agent                 Agent灰度资格、Key和导入记录
/api/agent/v1/skill/version         官方Skill版本与更新地址
/api/agent/v1/imports               外部Agent受限提交草稿
/api/v1/health                      服务存活检查
/api/v1/readiness                   数据库和存储就绪检查
```

API 路由只负责四件事：

1. 检查登录和角色。
2. 检查请求来源是否合法。
3. 校验用户提交的数据格式。
4. 把任务交给对应业务模块。

复杂业务规则不能写进 API 路由。

### `src/modules`：后端业务大脑

这是最核心的后端目录。

#### `identity`

负责登录会话、管理员/会员角色、一次性注册码、白名单注册、协议版本留痕、密码修改和注册码撤销。

#### `script-catalog`

负责剧本卡片、详情、导演阐述、试读、解说/演绎类型、销售状态、后台上传编辑和文件信息。

系统不自动解析管理员上传的正文。公开介绍与试读由管理员填写，避免不同 Word、TXT、Markdown 格式导致解析错误。

#### `commerce`

负责独家购买、订单、剧本锁定、心源扣除、售出下架、买家归属和安全下载授权。

购买时，锁定剧本、创建订单、扣心源、写流水和标记已售出在一个数据库事务中完成。任一步失败，整笔操作一起撤销，避免出现扣了钱却没买到的情况。

#### `points`

负责心源余额、充值档位、管理员调账、账户流水和已购剧本编号。

当前固定 `1 元 = 100 心源`，不同充值档位通过赠送心源实现优惠，最高等效四折，不做账号折扣分层。

#### `showcase`

负责门户滚动海报的上传、编辑、排序、上下架、删除和跳转配置。

#### `agent-access` 与 `agent-import`

`agent-access`负责灰度资格、用户绑定Key、版本校验、数据库限流和使用记录；`agent-import`负责幂等导入任务及其审计状态。外部Agent只能创建价格为0的草稿，不能发布或调用网页管理接口。

## 数据库和文件

### `src/infrastructure/database`

`client.ts` 负责连接 PostgreSQL，`schema/` 定义数据库中的表。

- `identity.ts`：用户、登录账号、会话、注册码和协议同意记录。
- `scripts.ts`：剧本、试读、交付文件关系。
- `commerce.ts`：购买订单、充值档位、心源流水、支付预留表。
- `assets.ts`：图片和原文件记录。
- `showcase.ts`：门户海报。
- `audit.ts`：敏感操作审计记录。
- `agent.ts`：Agent灰度资格、Key摘要、限流桶和导入任务。
- `index.ts`：统一导出所有表。

### `drizzle`

这里保存数据库的版本升级文件。可以把它理解成数据库的安装和升级历史。

已经运行过的迁移文件不能修改。增加字段或表时，必须新增下一份迁移文件。

### `src/infrastructure/storage`

这里负责管理员上传的文件保存在哪里。

当前使用本地私有目录 `var/storage/`，但业务模块只能调用 `StorageProvider`，不能直接拼接磁盘路径。未来接入 OSS 时，只需要增加 OSS 版本的存储适配器。

文件规则：

- 门户固定 PV 和固定视觉素材放在 `public/portal`。
- 管理员上传的完整剧本放在 `var/storage`。
- 完整剧本不能通过静态网址直接访问。
- 下载必须经过 API，并再次检查买家身份和已完成订单。
- 即使用户知道原始文件名，也不能绕过下载权限。

### `src/infrastructure/payments`

这里是支付宝适配器的预留边界。

目前 `PAYMENT_DRIVER=disabled`，不会创建支付宝交易。以后接入时实现 `PaymentProvider`，不需要把支付宝代码写进个人中心、心源模块或订单模块。

## 公共底层能力

### `src/shared/api`

统一 API 成功格式、失败格式、请求编号、数据错误、来源检查和跨站请求防护。

### `src/shared/config`

统一读取和校验服务端环境变量。生产环境会拒绝默认密钥、非 HTTPS 域名、未实现的 OSS 驱动和未实现的支付宝驱动。

### `src/shared/security`

负责登录、注册和购买频率限制，减少暴力尝试和恶意重复请求。

## 辅助目录

### `scripts`

- `bootstrap-admin.ts`：首次创建管理员。
- `validate-deployment.ts`：部署前检查密钥、数据库迁移和全部资源文件。
- `smoke-test.ts`：检查公开页面、游客权限和安全配置。
- `backup-create.sh`：备份 PostgreSQL 和剧本文件。
- `backup-verify.sh`：验证备份完整性。
- `audit-regression.ts`：独立数据库中的业务、权限、并发、自检和备份恢复回归。
- `browser-regression.mjs`：独立浏览器与合成响应中的账户切换、缓存隔离回归。
- `package-agent-skill.mjs`：把官方Skill源码生成可下载ZIP，生产构建前自动执行。

### `packages` 与 `openapi`

`packages/xinzhi-script-uploader/` 是官方剧本入库Skill源码。`SKILL.md`是执行入口；`references/`冻结API、内容和工作目录规范；`scripts/xinzhi_workspace.py`负责离线确定性校验与标准发布包，`scripts/xinzhi_agent.py`负责外部凭证、版本更新和受限上传；`tests/`覆盖成功与阻断场景，但不会打进用户下载包。Skill首次运行引导用户在终端配置Key，凭证保存在操作系统用户配置目录，不能进入Skill包。每次导入前检查服务器版本，用户确认后才能运行官方更新程序。

`openapi/agent-v1.yaml` 是Agent接口的机器可读契约；不可突破的权限与安全规则记录在 `docs/agent/API_CONSTITUTION.md`。工作目录标准冻结前，另一台生产电脑的只读勘察任务记录在 `docs/agent/WORKSPACE_STANDARD_DISCOVERY.md`。接口变化时三处必须同步更新。

### `docs`

- `PROJECT_STRUCTURE.md`：当前这份项目结构说明。
- `BRAND_IDENTITY.md`：Logo 概念、颜色、资产位置和使用规则。
- `brand/xinzhi-brand-concept.png`：用户确认的品牌概念板视觉参考。
- `DEPLOYMENT.md`：部署、HTTPS、备份和恢复手册。
- `llm/README.md`：模型进入项目的阅读入口。
- `llm/STATE.yaml`：当前阶段和待办状态。
- `llm/DECISIONS.md`：已经确定的关键架构和产品决策。

### `var`

```text
var/
├── storage/     管理员上传的真实文件
├── backups/     数据库和文件备份
└── tmp/         每次任务独立子目录，一次性运行产物结束后清理
```

这里不会提交到 Git。不要手工改名、移动或删除 `storage` 中的文件，因为数据库保存的是对应 object key。

`tmp/README.md` 是提交到 Git 的目录说明，其余临时内容被 Git 与 Docker 忽略。一次性调试脚本、截图、夹具、临时日志和恢复测试文件统一进入 `var/tmp/<任务随机目录>/`，任务结束时只清理自己创建的子目录；保留原因和清理条件写在该子目录说明中。正式测试程序属于 `scripts/`，长期结论属于 LLM Wiki。`storage/` 与 `backups/` 不适用临时清理规则。

## 典型业务流程

### 会员购买剧本

```text
用户点击购买
  ↓
script-detail.tsx
  ↓
POST /api/v1/scripts/[id]/purchase
  ↓
检查登录、会员身份、请求来源和频率
  ↓
commerce/service.ts
  ↓
锁定剧本 + 检查余额
  ↓
创建订单 + 扣心源 + 写流水 + 标记已售出
  ↓
PostgreSQL 提交事务
  ↓
前端原购买按钮变为“下载全部交付物料”
  ↓
下载时再次核验订单归属
  ↓
StorageProvider 返回私有文件，服务端生成完整 ZIP
```

### 管理员上传剧本

```text
管理员填写资料和试读
  ↓
script-upload-flow.tsx
  ↓
POST /api/v1/admin/scripts
  ↓
检查管理员身份和表单
  ↓
script-catalog 模块
  ↓
文件交给 StorageProvider
资料交给 PostgreSQL
  ↓
剧本库首页和详情页读取同一份正式数据
```

后台和前台不是两套数据。管理员修改后，用户端读取的是同一份数据库内容。

## 前后端是否分离

它不是“两套仓库、两个服务器”的物理分离，而是清晰的逻辑分离。

前端主要位于：

```text
src/app 中的页面
src/features
src/components
src/styles
public
```

后端主要位于：

```text
src/app/api
src/modules
src/infrastructure
src/shared/api
src/shared/config
src/shared/security
drizzle
```

两边只通过 `/api/v1` 和身份 API 通信，前端不直接访问数据库。

当前采用这种架构的原因：

- 一个仓库、一个部署单元，成本低。
- 不需要分别维护前端服务器和后端服务器。
- 登录 Cookie 和跨域配置简单。
- API 边界已经保留，App、小程序或海外站将来可以直接调用。
- 真正需要拆分时，可以把 `modules + infrastructure + API` 搬到独立后端，前端不必重写。

## 哪些部分最核心

按重要程度理解：

1. `src/modules`：业务大脑，决定谁能看、谁能买、怎么扣费。
2. `src/infrastructure/database/schema`：业务账本，决定数据怎么保存。
3. `src/features/script-library`：用户和管理员实际操作的产品界面。
4. `src/app/api/v1`：前后端之间的正式通道。
5. `src/infrastructure/storage`：保护完整剧本文件。
6. `drizzle`：保证数据库可以持续升级。
7. `scripts` 和 `compose.production.yaml`：保证项目能够部署、检查、备份和恢复。

最不应该承载复杂业务逻辑的是页面 `page.tsx` 和 API `route.ts`。真正的规则应进入对应的 `src/modules`。

## 不要直接修改的内容

- `node_modules/`：依赖安装结果，重新安装即可生成。
- `.next/`：Next.js 构建结果，不能手工编辑。
- 已经执行过的 `drizzle/*.sql`：只能增加新迁移，不能回写历史。
- `var/storage/` 中的文件名和目录：必须通过 `StorageProvider` 管理。
- `.env.local`、`.env.production`：包含密钥，不能提交到 Git 或写进文档。
- `package-lock.json`：由 npm 在依赖变化时维护，不手工拼改。
