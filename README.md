# 心智 XINZHI

心智 AI 漫剧门户与剧本库前端项目。当前版本用于确认门户、剧本浏览、白名单登录、账户充值及管理员后台的完整 UI 与交互。

## 当前范围

- 品牌门户：PV 播放、作品封面滚动、国内/海外 Studio 入口
- 剧本库：首页筛选、可售/已售状态、解说/演绎类型
- 白名单体验：登录、导演阐述、受限中英对照试读
- 用户账户：积分、折扣、电脑端支付宝充值演示
- 管理后台：剧本上传与编辑、试读维护、用户积分与折扣、注册码、订单与充值记录

目前数据和业务操作保存在浏览器内存中，仅用于交互验收；真实鉴权、数据库、文件存储、支付宝支付与防泄露接口将在后端阶段接入。

## 技术栈

- Next.js 16（App Router）
- React 19 + TypeScript
- Tailwind CSS 4
- npm

## 开发

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

常用检查：

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## 项目结构

```text
src/
├── app/
│   ├── (script-library)/   # 剧本库、登录、账户、管理员路由
│   ├── layout.tsx          # 全站根布局
│   └── page.tsx            # 品牌门户
├── features/
│   ├── portal/             # 门户独立模块
│   └── script-library/
│       ├── api/            # 前后端数据契约与服务边界
│       └── components/     # 剧本库业务界面与交互
├── components/             # 跨模块共享组件
├── lib/                    # 通用工具
└── styles/                 # 全局样式
```

## 架构约定

- 页面路由只负责组装，不直接承载业务数据逻辑。
- 门户与剧本库按业务模块隔离，后续可独立扩展。
- UI 通过 `features/script-library/api` 中的类型和服务访问数据；接入后端时保持组件契约稳定。
- 管理端和用户端最终必须由服务端鉴权与权限校验，不能依赖前端隐藏按钮。
- 剧本试读接口只返回允许展示的片段，完整文件不得进入浏览器响应。

## 部署

Vercel 可直接构建。自托管时可设置 `BUILD_STANDALONE=true` 并使用仓库内的 Dockerfile。

本项目基于 MIT 许可的 `next-shadcn-dashboard-starter` 演进，原始许可见 [LICENSE](./LICENSE)。
