# Agent API规则

正式入口由本机凭证配置中的 `server` 决定。所有写入请求仅可发往同一服务器的 `/api/agent/v1/` 路径。

## 请求头

- `Authorization: Bearer <API Key>`
- `X-Xinzhi-Skill-Version: 1.1.0`
- `Idempotency-Key: <8-100位稳定编号>`

API Key只能由 `scripts/xinzhi_agent.py` 从外部凭证配置读取。不得回显或写入任务文件。

## 版本检查

`GET /api/agent/v1/skill/version` 不需要Key。每次工作前必须检查，Skill版本必须等于服务器要求的版本。

## 创建草稿

`POST /api/agent/v1/imports` 接收 `multipart/form-data`：

- 字段来自 `metadata-schema.md`，正式Skill只提交 `bilingual-package`，`genre`只允许BL/GL/GB，`previewUnitLabel`固定为“段”，制作执行摘要为500–1000中文字符。
- 文件字段固定为 `cover`、`english`、`secondary`、`director`。
- 服务器忽略客户端提交的价格和上架状态，始终创建价格为0的草稿。
- 封面支持 JPG、PNG、WebP、AVIF；剧本文件支持 DOC、DOCX、TXT、MD。
- 单次导入总文件不超过100 MB，单文件仍受服务器上传上限限制。

同一导入重试必须沿用相同的 `Idempotency-Key`。服务器已成功处理时会返回同一个草稿编号；处理中或此前失败时不会重复创建。

## 状态处理

- `201`：草稿创建成功。
- `401`：Key缺失、过期、撤销或用户灰度权限已关闭。
- `409`：幂等任务冲突或用户尚未开通。
- `422`：字段或文件不符合要求。
- `426`：Skill版本不一致，必须更新。
- `429`：达到限流，读取响应中的 `retryAfterSeconds` 后停止并等待。

不得通过重试、改变路径或改用网页后台接口绕过拒绝。
