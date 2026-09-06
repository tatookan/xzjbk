# 心智 XINZHI

心智 AI 漫剧门户与剧本库。核心正式功能已经完成，当前处于部署准备阶段。项目采用 API 优先的模块化单体架构：一个仓库和一个部署单元，内部保持清晰的业务与基础设施边界。

## 开发入口

新开发者或模型进入项目前，先阅读 [LLM Wiki 入口](./docs/llm/README.md) 和 [当前项目状态](./docs/llm/STATE.yaml)。需要了解前后端位置与完整目录职责时，阅读 [项目结构说明](./docs/PROJECT_STRUCTURE.md)；涉及上线时阅读 [部署手册](./docs/DEPLOYMENT.md)。

## 当前范围

- 品牌门户：双 PV 播放与切换、作品封面滚动、国内/海外 Studio 入口
- 剧本库：首页筛选、可售/已售状态、解说/演绎类型；目录数据已经接入正式 API 与数据库
- 白名单体验：登录、协议同意注册、导演阐述、由管理员控制数量的受限中英对照试读
- 用户账户：头像菜单、心源余额、充值档位、账户流水、改密码、已购剧本与完整交付包下载；支付宝电脑网站支付仅保留扩展位，当前不开放充值
- 管理后台：门户海报上传/编辑/排序/上下架/删除；剧本上传、编辑、发布、试读数量控制与删除；注册码管理；用户心源调账和正式订单查询

门户海报、剧本目录、剧本详情、白名单试读、管理员剧本维护、心源账户、调账流水、充值档位、独家购买、订单和安全下载已经接入正式 API 与 PostgreSQL。支付宝充值暂不接入，只保留独立适配器边界与数据结构。

## 技术栈

- Next.js 16（App Router）
- React 19 + TypeScript
- Tailwind CSS 4
- PostgreSQL 17 + Drizzle ORM
- npm

## 开发

```bash
npm install --legacy-peer-deps
cp env.example.txt .env.local
docker compose up -d database
npm run db:migrate
npm run auth:bootstrap-admin
npm run dev
```

首次启动前，在 `.env.local` 配置 `BETTER_AUTH_SECRET`、`INVITE_CODE_PEPPER` 和三个 `INITIAL_ADMIN_*` 变量，然后执行一次管理员初始化命令。管理员创建成功后，应从运行环境删除 `INITIAL_ADMIN_PASSWORD`。

访问 `http://localhost:3000`。

常用检查：

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run db:check
npm run deploy:smoke
```

数据库结构变更使用版本迁移：

```bash
npm run db:generate -- --name=change-name
npm run db:migrate
```

不要修改已经部署过的迁移文件；新变化必须生成新的迁移。

## 项目结构

```text
src/
├── app/
│   ├── (script-library)/   # 剧本库、登录、账户、管理员路由
│   ├── api/v1/             # 有版本的 HTTP API 与健康检查
│   ├── layout.tsx          # 全站根布局
│   └── page.tsx            # 品牌门户
├── features/
│   ├── portal/             # 门户独立模块
│   └── script-library/
│       ├── api/            # 前后端数据契约与服务边界
│       └── components/     # 剧本库业务界面与交互
├── components/             # 跨模块共享组件
├── infrastructure/
│   ├── database/           # 数据库客户端和按领域拆分的表结构
│   ├── storage/            # 本地/OSS 可替换存储接口
│   └── payments/           # 支付提供方接口；支付宝适配器暂不实现
├── modules/                # 身份、海报、剧本、交易等服务端垂直模块
├── shared/
│   ├── api/                # 统一成功、错误、请求编号规范
│   └── config/             # 服务端环境变量校验
├── lib/                    # 通用工具
└── styles/                 # 全局样式
```

## 架构约定

- 页面路由只负责组装，不直接承载业务数据逻辑。
- 门户与剧本库按业务模块隔离，后续可独立扩展。
- UI 通过 `features/script-library/api` 中的类型和服务访问数据；接入后端时保持组件契约稳定。
- 所有外部客户端使用 `/api/v1`；路由只做输入输出转换，业务规则进入领域服务。
- 数据库只允许服务端模块访问，结构变化统一记录在 `drizzle/` 迁移目录。
- 管理端和用户端最终必须由服务端鉴权与权限校验，不能依赖前端隐藏按钮。
- 门户 `/` 和剧本库首页 `/scripts` 始终公开；个人中心和管理后台由服务端会话保护。
- 邮箱注册只允许通过管理员生成的一次性注册码，完整注册码不写入数据库，后台刷新后不再回显。
- 注册必须勾选用户协议和隐私政策，后端再次校验并记录所同意版本与时间。
- 剧本试读接口只返回允许展示的片段，完整文件不得进入浏览器响应。
- 游客接口只返回卡片所需字段；导演阐述和试读必须经过白名单登录校验，已售出剧本仅保留不可点击的公开卡片状态。
- 管理员上传完整剧本、配套稿和导演阐述时，系统只保存文件，不解析正文；公开介绍与试读内容由管理员填写。
- 文件通过 `StorageProvider` 操作，业务表只保存 provider 与 object key，不保存磁盘绝对路径。
- 门户海报上传后统一校验并转为 WebP；后台排序、发布状态和删除操作通过 `/api/v1/admin/showcase-posters` 管理，门户只读取已发布内容。
- 支付驱动默认是 `disabled`；支付宝接入时实现 `PaymentProvider`，无需把支付 SDK 写进账户或订单业务。
- 剧本统一使用心源定价和扣费，不设置账号折扣。基础兑换固定为 `1 元 = 100 心源`，充值优惠只增加赠送心源，数据库限制最低等效价格为 4 折。
- 管理员人工增减心源必须填写原因；余额、流水和审计记录在同一数据库事务中更新，余额禁止小于零。
- 购买操作在同一数据库事务中完成剧本锁定、心源扣除、订单创建、流水记录和售出下架；并发购买只允许一笔成交，重复请求不会重复扣费。
- 购买后原购买按钮直接变为完整交付包下载；整包 ZIP 与单文件下载都必须在服务端核验订单归属。

## 文件存储与迁移

初期文件保存在 `STORAGE_LOCAL_ROOT`，默认是不会被 Git 跟踪、也不会被 Next.js 静态公开的 `var/storage`。生产环境必须把这个目录挂载到持久磁盘；无持久磁盘的平台不适合使用本地驱动。

剧本封面会被校验并转为 WebP 后公开；英文稿、中文/中英稿和导演阐述原文件始终按私有资源保存。下载接口会在服务端核验已完成订单和买家身份，响应禁止缓存并强制以附件形式下载；完整交付包在授权通过后动态生成 ZIP，未购买用户无法读取原文件。

未来迁移 OSS 时：先实现同一 `StorageProvider` 接口的 OSS 适配器，再按 `media_assets` 中的 provider/object key 批量复制并校验 SHA-256，切换记录后保留一段回滚窗口。业务代码和 API 无需改写。

## 部署

门户可直接构建；带私有文件和数据库的完整服务推荐自托管。Docker 镜像内的本地存储目录是 `/data/xinzhi-storage`，部署时必须挂载持久卷。

生产环境使用 `compose.production.yaml`，数据库迁移、生产配置自检、健康检查、数据库与私有文件备份均已独立配置。完整上线、备份和恢复步骤见 [部署手册](./docs/DEPLOYMENT.md)。支付宝适配器完成之前，生产自检会强制要求 `PAYMENT_DRIVER=disabled`。

本项目基于 MIT 许可的 `next-shadcn-dashboard-starter` 演进，原始许可见 [LICENSE](./LICENSE)。
