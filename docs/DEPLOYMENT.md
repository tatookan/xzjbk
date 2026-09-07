# 心智门户与剧本库部署手册

## 推荐形态

当前版本使用单机 Docker Compose：反向代理负责 HTTPS，应用、PostgreSQL 和私有文件各自独立；数据库与文件目录使用两个持久卷。应用只监听服务器本机 `127.0.0.1:3000`，数据库不开放公网端口。

这套结构适合当前业务量，也保留了后续把数据库迁往托管 PostgreSQL、把 `StorageProvider` 切换为 OSS 的接口。

## 首次部署

1. 准备一台安装了 Docker Engine、Compose 插件和 HTTPS 反向代理的 Linux 服务器。
2. 复制 `env.production.example.txt` 为 `.env.production`，将权限设置为 `600`，替换全部占位值。
3. `NEXT_PUBLIC_APP_URL` 必须是最终 HTTPS 域名；`NEXT_PUBLIC_STUDIO_CN_URL` 和 `NEXT_PUBLIC_STUDIO_GLOBAL_URL` 分别保持为国内版、海外版 Studio 的正式入口。两个密钥必须分别随机生成且不能相同。
4. `DATABASE_URL` 中的主机名使用 `database`。数据库密码应使用 URL 安全字符；如果包含特殊字符，需要先做 URL 编码。
5. 应用、备份、备份校验与自检统一使用容器 UID/GID `1000:1000`，与私有文件 0600 权限匹配。不要改成宿主登录用户 ID。在项目目录执行 `sudo install -d -m 0700 -o 1000 -g 1000 var/backups` 准备备份目录；部署用户 ID 不同时通过 sudo 管理备份。旧 BACKUP_UID/BACKUP_GID 配置已不再使用。
6. 执行：

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d --build
docker compose --env-file .env.production -f compose.production.yaml --profile ops run --rm preflight
EXPECT_PRODUCTION_HEADERS=true SMOKE_BASE_URL=https://scripts.example.com npm run deploy:smoke
```

迁移任务成功后应用才会启动。`preflight` 以应用用户身份检查生产配置、全部迁移的数量/时间/哈希、私有存储实际读写，并逐个核对文件大小与 SHA-256；路径逃逸、不可读文件和未支持的存储 provider 会被拒绝。自检需要在停止写入或维护窗口中运行，避免资源正在替换时出现暂时不一致。

首次创建管理员时，临时加入 `INITIAL_ADMIN_NAME`、`INITIAL_ADMIN_EMAIL` 和 `INITIAL_ADMIN_PASSWORD`，执行：

```bash
docker compose --env-file .env.production -f compose.production.yaml run --rm migrate npm run auth:bootstrap-admin
```

成功后立即从 `.env.production` 删除 `INITIAL_ADMIN_PASSWORD`，再重新创建应用容器。生产自检会拒绝仍携带初始管理员密码的环境。

## HTTPS 反向代理

域名应反向代理到 `http://127.0.0.1:3000`，并传递 `Host`、`X-Real-IP`、`X-Forwarded-For` 和 `X-Forwarded-Proto`。代理必须覆写来自公网的真实 IP 标头，避免客户端伪造限流来源。上传为一个封面和三份文件的 multipart 请求；默认每份文件上限 50 MiB、封面上限 12 MiB，请将请求体总上限配置为 170 MiB。调整单文件限制时同步调整代理总上限。

不要直接把 3000 端口或 PostgreSQL 端口暴露到公网。应用内已启用登录频率限制、跨站写请求拦截、CSP、HSTS、防嵌入及 MIME 防猜测响应头。

## 发布新版本

发布前先创建并验证备份，然后重新构建。数据库变化只能通过新增迁移发布：

```bash
docker compose --env-file .env.production -f compose.production.yaml stop app
docker compose --env-file .env.production -f compose.production.yaml --profile ops run --rm backup
BACKUP_NAME=xinzhi-TIMESTAMP docker compose --env-file .env.production -f compose.production.yaml --profile ops run --rm backup-verify
docker compose --env-file .env.production -f compose.production.yaml up -d --build
docker compose --env-file .env.production -f compose.production.yaml --profile ops run --rm preflight
EXPECT_PRODUCTION_HEADERS=true SMOKE_BASE_URL=https://scripts.example.com npm run deploy:smoke
```

停止应用后备份，可以确保数据库快照与剧本文件处于同一业务时点。备份完成即可恢复应用，维护窗口通常只需要几分钟。

## 备份策略

备份目录包含：

- `database.dump`：PostgreSQL custom format，可选择性恢复并保留数据类型。
- `storage.tar.gz`：封面、完整剧本和导演阐述等文件。
- `checksums.sha256`：两个备份文件的 SHA-256。
- `manifest.txt`：备份时间和格式。

建议每天备份，保留最近 7 份日备份、4 份周备份和 6 份月备份，并额外复制到与服务器不同的加密存储位置。仅留在本机不算完整备份。

## 恢复原则

不要直接覆盖当前生产数据。先验证备份，再恢复到新的空数据库与新的空文件目录：

1. 使用 `backup-verify` 服务验证备份；本地已经安装 PostgreSQL 客户端时，也可执行 `npm run backup:verify -- /absolute/path/to/backup`。
2. 创建一个全新的 PostgreSQL 数据库，用 `pg_restore --no-owner --no-privileges --dbname NEW_DATABASE database.dump` 恢复。
3. 把 `storage.tar.gz` 用 `tar --no-same-owner` 解压到新的空目录。生产应以应用 UID/GID `1000:1000` 执行；如果由运维账号恢复，切换前仅对这个新恢复目录校正属主，不能误操作现有存储卷。
4. 使用新数据库和新文件目录运行 `npm run deploy:check`，再完成登录、试读、后台和下载验收。
5. 验收通过后切换应用配置；旧数据保留一个回滚窗口，不在恢复过程中删除。

至少每季度做一次恢复演练。只有经过恢复验证的备份，才算真正可用。

## 本地回归与生产验证的边界

`npm run test:audit` 会创建独立测试数据库和独立存储，覆盖权限、并发成交、编辑冲突、调账重试、注册码、自检和真实备份恢复。通过 `AUDIT_DATABASE_URL` 提供本机或测试实例上具有 CREATE DATABASE 权限的连接；不要为业务账号增加这个权限，也不要把测试指向生产实例。测试仅删除本次创建的随机命名测试库与任务目录，业务数据库不参与测试写入。

`npm run test:browser` 在独立无头浏览器中使用合成 API 响应，检查切换身份时的缓存隔离；运行前启动开发服务器并执行 `npx playwright install chromium --only-shell`。它不代替真实身份的 API 验证。两套测试的运行产物位于 `var/tmp/`，结束时自动清理。

2026-09-06 已在本机 PostgreSQL 14.20 完成隔离回归和恢复演练。生产目标仍为 PostgreSQL 17；本机没有 Docker，所以干净 Linux 容器、UID/GID 1000 实际运行、目标域名 TLS 和 PostgreSQL 17 的验收仍须在目标环境执行，不能据本地构建通过宣称完成。

发布本轮更新时先执行新增迁移 `0005_points-operation-id`。后台剧本编辑/删除现在要求携带列表或详情中 version 对应的 `If-Match: "版本号"`；调账接口要求稳定的 operationId，网络重试必须复用原值。前后端应同版发布。

## 上线检查清单

- 门户、剧本库首页和登录页可公开访问。
- 游客无法读取导演阐述、试读详情、账户和后台接口。
- 白名单用户可查看试读，不能在购买前下载完整文件。
- 购买只扣费一次，成交后其他用户只能看到已售出卡片。
- 买家可以从详情页和个人中心下载三份交付文件。
- 管理员上传、编辑、删除、注册码、调账和订单查询正常。
- 支付宝按钮保持“暂未开放”，`PAYMENT_DRIVER=disabled`。
- `/api/v1/readiness` 返回 200，生产安全响应头存在。
- 数据库卷、私有文件卷和异机备份均已配置。
