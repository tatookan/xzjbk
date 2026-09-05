# 心智 XINZHI

心智 AI 漫剧门户与剧本库。项目正在从已确认的 UI 原型进入正式开发，采用 API 优先的模块化单体架构：一个仓库和一个部署单元，内部保持清晰的业务与基础设施边界。

## 当前范围

- 品牌门户：双 PV 播放与切换、作品封面滚动、国内/海外 Studio 入口
- 剧本库：首页筛选、可售/已售状态、解说/演绎类型
- 白名单体验：登录、导演阐述、受限中英对照试读
- 用户账户：积分、折扣、电脑端支付宝充值演示
- 管理后台：剧本上传与编辑、试读维护、用户积分与折扣、注册码、订单与充值记录

当前 UI 演示数据仍保存在浏览器内存中；正式后端基础层、PostgreSQL 数据结构、版本迁移、统一 API 响应和可替换文件存储接口已经建立，业务模块将分阶段接入。

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
│   └── storage/            # 本地/OSS 可替换存储接口
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
- 剧本试读接口只返回允许展示的片段，完整文件不得进入浏览器响应。
- 文件通过 `StorageProvider` 操作，业务表只保存 provider 与 object key，不保存磁盘绝对路径。

## 文件存储与迁移

初期文件保存在 `STORAGE_LOCAL_ROOT`，默认是不会被 Git 跟踪、也不会被 Next.js 静态公开的 `var/storage`。生产环境必须把这个目录挂载到持久磁盘；无持久磁盘的平台不适合使用本地驱动。

未来迁移 OSS 时：先实现同一 `StorageProvider` 接口的 OSS 适配器，再按 `media_assets` 中的 provider/object key 批量复制并校验 SHA-256，切换记录后保留一段回滚窗口。业务代码和 API 无需改写。

## 部署

门户可直接构建；带私有文件和数据库的完整服务推荐自托管。Docker 镜像内的本地存储目录是 `/data/xinzhi-storage`，部署时必须挂载持久卷。

本项目基于 MIT 许可的 `next-shadcn-dashboard-starter` 演进，原始许可见 [LICENSE](./LICENSE)。
