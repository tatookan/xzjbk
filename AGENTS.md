# 心智剧本库开发约定

## 开发入口与 LLM Wiki

任何模型或新开发者开始改动前，必须按顺序阅读：

1. `docs/llm/README.md`：Wiki 使用与更新规则。
2. `docs/llm/STATE.yaml`：当前阶段、完成项、限制与下一步。
3. `docs/llm/DECISIONS.md`：已经确认的关键产品和架构决策。
4. 涉及目录或职责时阅读 `docs/PROJECT_STRUCTURE.md`。
5. 涉及部署、环境变量、备份或恢复时阅读 `docs/DEPLOYMENT.md`。

阅读后检查 `git status` 和实际代码。代码是行为的最终依据；发现文档与代码不一致时应明确指出并修正文档，不得静默依赖过期说明。

如果一次改动改变了产品模块、主要目录、API/数据库/存储/支付/身份/部署架构、项目阶段或长期业务规则，必须在同一次任务中更新对应 Wiki 文件。小型文案和样式修复不需要机械更新。

禁止在 Wiki 中记录密码、注册码、Cookie、密钥、数据库连接串、完整剧本正文或真实用户隐私。父级 ChatGPT 项目中的 `sources/` 始终只读。

## 产品范围

这是心智 AI 漫剧门户与剧本库项目。门户、剧本库、用户账户和管理员后台是当前核心模块。

## 目录边界

- `src/app`：路由、页面元数据与页面组装。
- `src/features/portal`：门户业务组件。
- `src/features/script-library`：剧本库业务组件、类型与 API 服务边界。
- `src/modules`：按垂直业务拆分的正式服务端模块。
- `src/infrastructure/database`：仅服务端可访问的数据库客户端和表结构。
- `src/infrastructure/storage`：可替换的私有文件存储适配器。
- `src/shared/api`：跨模块统一的 API 响应、错误与请求追踪规范。
- `src/components`：至少被两个业务模块复用的通用组件。
- `src/lib`：无业务语义的通用函数。

## 开发原则

- 默认使用服务端组件；需要交互或浏览器状态时再声明客户端组件。
- 业务数据统一通过模块内 `api` 层访问，组件不直接耦合数据库或第三方接口。
- `/api/v1` 路由保持轻薄：校验输入、调用业务服务、转换输出，不在路由内堆积业务规则。
- 数据库结构变更必须生成新迁移；已经部署的迁移禁止回写。
- 文件必须通过 `StorageProvider` 保存，数据库不得记录机器绝对路径。
- 新增后台能力时，同步确认用户端展示状态，避免两套数据定义。
- 登录、白名单、积分、折扣、购买和下载权限必须在服务端再次校验。
- 试读接口仅返回可展示内容；不要把完整剧本放入客户端、静态资源或页面源码。
- 保持深色、克制、影视编辑感的心智视觉语言，不引入无关模板主题。

## 提交前检查

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

提交前再确认：如果本次属于 Wiki 规定的实质变化，`docs/llm/STATE.yaml`、`docs/llm/DECISIONS.md` 或 `docs/PROJECT_STRUCTURE.md` 已同步更新。
