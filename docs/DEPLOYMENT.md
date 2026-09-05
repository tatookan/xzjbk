# 心智门户与剧本库部署手册

## 推荐形态

当前版本使用单机 Docker Compose：反向代理负责 HTTPS，应用、PostgreSQL 和私有文件各自独立；数据库与文件目录使用两个持久卷。应用只监听服务器本机 `127.0.0.1:3000`，数据库不开放公网端口。

这套结构适合当前业务量，也保留了后续把数据库迁往托管 PostgreSQL、把 `StorageProvider` 切换为 OSS 的接口。

## 首次部署

1. 准备一台安装了 Docker Engine、Compose 插件和 HTTPS 反向代理的 Linux 服务器。
2. 复制 `env.production.example.txt` 为 `.env.production`，将权限设置为 `600`，替换全部占位值。
3. `NEXT_PUBLIC_APP_URL` 必须是最终 HTTPS 域名。两个密钥必须分别随机生成且不能相同。
4. `DATABASE_URL` 中的主机名使用 `database`。数据库密码应使用 URL 安全字符；如果包含特殊字符，需要先做 URL 编码。
5. `BACKUP_UID` 和 `BACKUP_GID` 填写部署用户的 UID/GID，并确保该用户可以写入 `var/backups`。
6. 执行：

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d --build
docker compose --env-file .env.production -f compose.production.yaml --profile ops run --rm preflight
EXPECT_PRODUCTION_HEADERS=true SMOKE_BASE_URL=https://scripts.example.com npm run deploy:smoke
```

迁移任务成功后应用才会启动。`preflight` 会检查生产配置、数据库迁移、私有存储读写能力，并逐个核对数据库记录对应文件的大小。

首次创建管理员时，临时加入 `INITIAL_ADMIN_NAME`、`INITIAL_ADMIN_EMAIL` 和 `INITIAL_ADMIN_PASSWORD`，执行：

```bash
docker compose --env-file .env.production -f compose.production.yaml run --rm migrate npm run auth:bootstrap-admin
```

成功后立即从 `.env.production` 删除 `INITIAL_ADMIN_PASSWORD`，再重新创建应用容器。生产自检会拒绝仍携带初始管理员密码的环境。

## HTTPS 反向代理

域名应反向代理到 `http://127.0.0.1:3000`，并传递 `Host`、`X-Real-IP`、`X-Forwarded-For` 和 `X-Forwarded-Proto`。上传请求体上限应略高于 `MAX_UPLOAD_BYTES`，当前建议配置为 55 MB。

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
3. 把 `storage.tar.gz` 解压到新的空目录。
4. 使用新数据库和新文件目录运行 `npm run deploy:check`，再完成登录、试读、后台和下载验收。
5. 验收通过后切换应用配置；旧数据保留一个回滚窗口，不在恢复过程中删除。

至少每季度做一次恢复演练。只有经过恢复验证的备份，才算真正可用。

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
