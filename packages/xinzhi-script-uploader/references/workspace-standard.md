# 工作目录、选材与发布包规范

## 项目边界与选材

一次只处理一个明确项目根目录。源目录只读。不得自动选择以下路径：

`90-制作记录/**`、`99-历史归档/**`、`**/*副本*`、`**/*backup*`、`**/*备份*`、`**/*old*`、`**/*pre-correction*`、`**/*before-*`、`**/.ai-translation-work*/**`、任何隐藏目录。

优先级：用户明确指定 > `workflow-status.md`锁定路径 > 稳定标准目录/名称 > 生成记录与SHA-256 > 修改时间提示。相同角色有多个候选时停止，不得只取最新文件。封面必须只有一张正式图。

正式 `bilingual-package` 必须映射四个文件：

1. `cover`：真实像素精确2:3的PNG/JPG/WebP/AVIF。
2. `english`：美国本土化英文正式剧本。
3. `secondary`：美国本土化中英对照正式剧本。
4. `director`：未删改的完整正式导演阐述。

另须提供正式中英对照试读版。当前不启用 `parallel-production`。

## 发布包

生成到创作项目之外：

```text
<工作区>/心智发布区/<project-id>/<package-id>/
├── xinzhi-manifest.json
├── cover/cover.<原扩展名>
├── scripts/
│   ├── english.<原扩展名>
│   └── bilingual.<原扩展名>
├── director/director-statement.<原扩展名>
├── preview/preview.json
└── review/
    ├── file-checksums.json
    └── approval-status.json
```

manifest只保存包内相对路径和源项目相对路径，同时记录大小、SHA-256、验证证据与固定幂等编号，不依赖源机器绝对路径。可选独立中文剧本以后放 `scripts/chinese.<ext>`；当前 `secondary` 固定是bilingual文件。

完整字段示例见 [manifest-example.json](manifest-example.json)。

## 命令

```bash
python3 scripts/xinzhi_agent.py prepare \
  --project /path/to/one-project \
  --workspace /path/to/workspace \
  --metadata /temporary/metadata.json \
  --cover /path/to/one-project/cover.png \
  --english /path/to/one-project/english.md \
  --bilingual /path/to/one-project/bilingual.md \
  --director /path/to/one-project/director.md \
  --preview /path/to/one-project/03-试读版/preview.md

python3 scripts/xinzhi_agent.py validate-package --package /path/to/package
python3 scripts/xinzhi_agent.py approve --package /path/to/package
python3 scripts/xinzhi_agent.py import-package --package /path/to/package
```

`approve`只能在用户明确确认展示摘要后运行。网络失败后直接对同一包重跑 `import-package`，不得重新prepare来换幂等编号。
