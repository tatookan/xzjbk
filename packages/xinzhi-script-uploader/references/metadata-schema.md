# 正式元数据字段

`prepare`输入为UTF-8 JSON。AI填写语义字段，程序计算其余字段：

```json
{
  "projectId": "npc-butler",
  "packageId": "20260913-r1",
  "title": "NPC管家又被欺负了",
  "englishTitle": "The NPC Butler Gets Bullied Again",
  "genre": "BL",
  "tags": ["ABO", "豪门", "契约关系"],
  "presentationMode": "解说",
  "directorStatement": "## 制作核心\n……500–1000个中文字符的制作执行摘要……",
  "previewRationale": "选择EP01–EP04：建立主角身份……避开成人内容与结局反转。",
  "previewVisibleCount": 4,
  "adultContentReviewed": true,
  "majorSpoilerReviewed": true,
  "coverHasEnglishTitle": true,
  "coverEnglishTitle": "The NPC Butler Gets Bullied Again"
}
```

- `genre`只能是 `BL`、`GL`、`GB`，由核心恋爱关系决定。
- `tags`不含genre，不重复、不放同义词；核心世界观标签优先。
- `presentationMode`只能是 `解说` 或 `演绎`。
- `directorStatement`是500–1000中文字符的制作执行摘要，不是完整导演阐述；完整原文件作为 `director` 交付。
- 封面有英文标题时必须填写 `coverEnglishTitle`，并与页面英文剧名一致。
- 两项审查布尔值只能在AI读过正式试读并完成检查后设为 `true`。

程序从正式材料计算并冻结：`logline`、`synopsis`、`sourceUnitCount`、`previewUnitLabel=段`、`packageMode=bilingual-package`、`episodes`、`preview`。

上传API最终字段仍包括：`title`、`englishTitle`、`genre`、`logline`、`synopsis`、`directorStatement`、`previewRationale`、`sourceUnitCount`、`previewUnitLabel`、`presentationMode`、`packageMode`、`episodes`、`tags`、`preview`、`previewVisibleCount`。
