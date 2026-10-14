#!/usr/bin/env python3
"""Deterministic validation and release-package builder for Xinzhi imports."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import struct
import uuid
import zipfile
from xml.etree import ElementTree


ALLOWED_GENRES = {"BL", "GL", "GB"}
ALLOWED_PRESENTATION_MODES = {"解说", "演绎"}
ALLOWED_TEXT_EXTENSIONS = {".md", ".txt", ".docx"}
ALLOWED_COVER_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif"}
FORBIDDEN_PARTS = {
    "90-制作记录",
    "99-历史归档",
    ".ai-translation-work",
}
FORBIDDEN_NAME_RE = re.compile(
    r"(?:副本|backup|备份|(?:^|[-_])old(?:[-_.]|$)|pre-correction|before-)", re.I
)
PLACEHOLDER_RE = re.compile(
    r"^(?:\.{3,}|…+|tbd|todo|n/?a|placeholder|unknown speaker|待补|待定|占位)$",
    re.I,
)
MODULE_RE = re.compile(r"^\s*【+(解说词|对白)】\s*[：:]\s*(.*)$")
WORD_RE = re.compile(r"[A-Za-z]+(?:['’\-][A-Za-z]+)*")
MARKDOWN_RE = re.compile(r"^\s*(?:#{1,6}\s+|[-*_]{3,}\s*$|```|>\s*)")
UNSAFE_PATTERNS = {
    "露骨性行为或性器官": re.compile(
        r"(?:强奸|轮奸|性器官|阴茎|阴道|裸体|全裸|插入|射精|口交|肛交|rape|genitals?|penis|vagina|nude|naked|penetrat|ejaculat|oral sex|anal sex)",
        re.I,
    ),
    "胁迫或性侵": re.compile(r"(?:性侵|迷奸|强迫发生关系|sexual assault|non[- ]?consensual|forced sex)", re.I),
    "年龄不明确的性内容": re.compile(
        r"(?:(?:未成年|少年|少女|学生|minor|underage|teen).{0,30}(?:性|裸体|sex|nude|naked))",
        re.I | re.S,
    ),
    "过度暴力": re.compile(r"(?:肢解|开膛|断肢|爆头|斩首|dismember|disembowel|decapitat)", re.I),
}


class ValidationError(RuntimeError):
    pass


@dataclass(frozen=True)
class Module:
    kind: str
    body: str


def read_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".md", ".txt"}:
        try:
            return path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError as error:
            raise ValidationError(f"文件不是UTF-8文本：{path.name}") from error
    if suffix == ".docx":
        try:
            with zipfile.ZipFile(path) as archive:
                xml = archive.read("word/document.xml")
        except (OSError, KeyError, zipfile.BadZipFile) as error:
            raise ValidationError(f"DOCX无法读取：{path.name}") from error
        root = ElementTree.fromstring(xml)
        paragraphs = []
        for paragraph in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
            text = "".join(
                node.text or ""
                for node in paragraph.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
            )
            paragraphs.append(text)
        return "\n".join(paragraphs)
    if suffix == ".doc":
        raise ValidationError("旧版DOC无法可靠解析，请另存为DOCX、Markdown或UTF-8 TXT")
    raise ValidationError(f"不支持的文本格式：{path.suffix}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def chinese_character_count(text: str) -> int:
    return len(re.findall(r"[\u3400-\u9fff]", text))


def normalize_heading(text: str) -> str:
    value = re.sub(r"^\s*#{0,6}\s*", "", text)
    value = re.sub(r"^[一二三四五六七八九十0-9]+\s*[、.．:：]\s*", "", value)
    return re.sub(r"[\s#：:、，,。\.（）()]+", "", value)


def extract_section(text: str, wanted: str, following: tuple[str, ...]) -> str:
    lines = text.replace("\r\n", "\n").split("\n")
    start = None
    for index, line in enumerate(lines):
        normalized = normalize_heading(line)
        if wanted in normalized:
            start = index + 1
            break
    if start is None:
        raise ValidationError(f"导演阐述中未稳定识别到“{wanted}”标题")
    end = len(lines)
    for index in range(start, len(lines)):
        normalized = normalize_heading(lines[index])
        if any(name in normalized for name in following) and lines[index].strip().startswith(("#", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十")):
            end = index
            break
    value = "\n".join(lines[start:end]).strip()
    if not value:
        raise ValidationError(f"导演阐述中的“{wanted}”为空")
    return value


def extract_logline_and_synopsis(director_text: str) -> tuple[str, str]:
    logline = extract_section(director_text, "一句话故事", ("故事梗概",))
    synopsis = extract_section(
        director_text,
        "故事梗概",
        ("人物", "角色", "世界观", "导演", "视觉", "叙事", "分集"),
    )
    return logline, synopsis


def english_word_count(text: str) -> int:
    return sum(len(WORD_RE.findall(module.body)) for module in extract_modules(text))


def compute_episodes(word_count: int) -> int:
    return max(1, round(word_count / 15000 * 35))


def extract_modules(text: str) -> list[Module]:
    modules: list[Module] = []
    for raw in text.replace("\r\n", "\n").split("\n"):
        match = MODULE_RE.match(raw)
        if not match:
            continue
        kind, body = match.groups()
        body = body.strip()
        if kind == "对白":
            parts = re.split(r"[:：]", body, maxsplit=1)
            if len(parts) == 2:
                role, body = parts[0].strip(), parts[1].strip()
                if PLACEHOLDER_RE.fullmatch(role) or role.lower() == "unknown speaker":
                    continue
        if not body or PLACEHOLDER_RE.fullmatch(body):
            continue
        modules.append(Module(kind=kind, body=body))
    return modules


def validate_bilingual_pairing(english_text: str, bilingual_text: str) -> tuple[int, int]:
    english_modules = extract_modules(english_text)
    bilingual_all = extract_modules(bilingual_text)
    if not english_modules:
        raise ValidationError("英文正式剧本未识别到有效【解说词】或【对白】模块")
    if len(bilingual_all) != len(english_modules) * 2:
        raise ValidationError(
            f"中英对照模块无法按英中双行一一对应：英文{len(english_modules)}，中英对照有效记录{len(bilingual_all)}"
        )
    for index, english in enumerate(english_modules, 1):
        bilingual_english = bilingual_all[(index - 1) * 2]
        bilingual_chinese = bilingual_all[(index - 1) * 2 + 1]
        if english.kind != bilingual_english.kind or english.kind != bilingual_chinese.kind:
            raise ValidationError(
                f"中英对照第{index}个模块类型不匹配：英文{english.kind}，"
                f"对照稿{bilingual_english.kind}/{bilingual_chinese.kind}"
            )
        source_words = [word.casefold() for word in WORD_RE.findall(english.body)]
        paired_words = [word.casefold() for word in WORD_RE.findall(bilingual_english.body)]
        if source_words != paired_words:
            raise ValidationError(f"中英对照第{index}个模块的英文侧与正式英文稿不一致")
        if not re.search(r"[\u3400-\u9fff]", bilingual_chinese.body):
            raise ValidationError(f"中英对照第{index}个模块缺少中文内容")
    return len(english_modules), len(bilingual_all)


def parse_preview(text: str) -> list[dict[str, str]]:
    normalized = text.replace("\r\n", "\n")
    matches = list(re.finditer(r"(?m)^##\s+(EP\s*\d+)\s*$", normalized, re.I))
    if not matches:
        raise ValidationError("试读文件未找到“## EPxx”单元")
    preview: list[dict[str, str]] = []
    for index, match in enumerate(matches):
        block = normalized[match.end() : matches[index + 1].start() if index + 1 < len(matches) else len(normalized)]
        language = re.match(
            r"\s*###\s+English\s*\n(?P<en>.*?)\n###\s+中文\s*\n(?P<zh>.*)\Z",
            block,
            re.I | re.S,
        )
        if not language or not language.group("en").strip() or not language.group("zh").strip():
            raise ValidationError(f"{match.group(1)} 缺少完整的 English 或中文区块")
        preview.append(
            {
                "en": f"## {match.group(1).upper().replace(' ', '')}\n### English\n{language.group('en').strip()}",
                "zh": f"## {match.group(1).upper().replace(' ', '')}\n### 中文\n{language.group('zh').strip()}",
            }
        )
    return preview


def unsafe_preview_reasons(preview: list[dict[str, str]]) -> list[str]:
    combined = "\n".join(item[language] for item in preview for language in ("en", "zh"))
    return [label for label, pattern in UNSAFE_PATTERNS.items() if pattern.search(combined)]


def image_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    suffix = path.suffix.lower()
    if suffix == ".png" and data.startswith(b"\x89PNG\r\n\x1a\n"):
        return struct.unpack(">II", data[16:24])
    if suffix in {".jpg", ".jpeg"} and data.startswith(b"\xff\xd8"):
        offset = 2
        while offset + 9 < len(data):
            if data[offset] != 0xFF:
                offset += 1
                continue
            marker = data[offset + 1]
            offset += 2
            if marker in {0xD8, 0xD9}:
                continue
            length = struct.unpack(">H", data[offset : offset + 2])[0]
            if marker in set(range(0xC0, 0xC4)) | set(range(0xC5, 0xC8)) | set(range(0xC9, 0xCC)) | set(range(0xCD, 0xD0)):
                return struct.unpack(">HH", data[offset + 3 : offset + 7])[::-1]
            offset += length
    if suffix == ".webp" and data[8:12] == b"WEBP":
        kind = data[12:16]
        if kind == b"VP8X":
            return (1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little"))
        if kind == b"VP8L":
            bits = int.from_bytes(data[21:25], "little")
            return ((bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1)
        if kind == b"VP8 " and data[23:26] == b"\x9d\x01\x2a":
            return (
                int.from_bytes(data[26:28], "little") & 0x3FFF,
                int.from_bytes(data[28:30], "little") & 0x3FFF,
            )
    if suffix == ".avif":
        position = data.find(b"ispe")
        if position >= 0 and position + 16 <= len(data):
            return struct.unpack(">II", data[position + 8 : position + 16])
    raise ValidationError(f"无法读取封面真实像素：{path.name}")


def validate_selected_file(project_root: Path, path: Path, allowed: set[str], role: str) -> Path:
    root = project_root.resolve()
    selected = path.resolve()
    if root != selected and root not in selected.parents:
        raise ValidationError(f"{role}不在本次项目目录内")
    if not selected.is_file():
        raise ValidationError(f"缺少{role}：{selected}")
    relative = selected.relative_to(root)
    if any(part.startswith(".") or part in FORBIDDEN_PARTS for part in relative.parts):
        raise ValidationError(f"{role}位于禁止选择的历史或隐藏目录：{relative}")
    if FORBIDDEN_NAME_RE.search(str(relative)):
        raise ValidationError(f"{role}疑似副本或历史文件：{relative}")
    if selected.suffix.lower() not in allowed:
        raise ValidationError(f"{role}格式不支持：{selected.suffix}")
    return selected


def select_single_candidate(candidates: list[Path], role: str) -> Path:
    safe = [path for path in candidates if not FORBIDDEN_NAME_RE.search(str(path))]
    if len(safe) != 1:
        raise ValidationError(f"{role}候选文件数量为{len(safe)}，不能按修改时间自动选择")
    return safe[0]


def similarity(left: str, right: str) -> float:
    left_chars = set(re.findall(r"[\u3400-\u9fffA-Za-z0-9]", left.lower()))
    right_chars = set(re.findall(r"[\u3400-\u9fffA-Za-z0-9]", right.lower()))
    if not left_chars or not right_chars:
        return 0.0
    return len(left_chars & right_chars) / len(left_chars | right_chars)


def material_fingerprint(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for value in sorted(sha256(path) for path in paths):
        digest.update(value.encode("ascii"))
    return digest.hexdigest()


def validate_metadata(metadata: dict, preview_count: int, synopsis: str) -> None:
    required = (
        "projectId", "title", "englishTitle", "genre", "tags", "presentationMode",
        "directorStatement", "previewRationale", "previewVisibleCount",
        "adultContentReviewed", "majorSpoilerReviewed",
    )
    missing = [name for name in required if name not in metadata]
    if missing:
        raise ValidationError("元数据缺少字段：" + "、".join(missing))
    for field in ("title", "englishTitle"):
        title = str(metadata[field]).strip()
        if not title or PLACEHOLDER_RE.fullmatch(title) or title.casefold() == "xiaxing":
            raise ValidationError(f"{field}不能使用空值、文件占位名或xiaxing")
    if metadata["genre"] not in ALLOWED_GENRES:
        raise ValidationError("genre只能是BL、GL或GB")
    if metadata["presentationMode"] not in ALLOWED_PRESENTATION_MODES:
        raise ValidationError("presentationMode只能是解说或演绎")
    tags = metadata["tags"]
    if not isinstance(tags, list) or not tags or any(not isinstance(tag, str) or not tag.strip() for tag in tags):
        raise ValidationError("tags必须是非空字符串数组")
    normalized_tags = [re.sub(r"\s+", "", tag).casefold() for tag in tags]
    if len(normalized_tags) != len(set(normalized_tags)):
        raise ValidationError("标签存在重复项")
    if any(tag.upper() in ALLOWED_GENRES for tag in tags):
        raise ValidationError("BL、GL、GB只能放在genre，不能重复放入tags")
    synonyms = ({"现代", "都市", "现代都市"}, {"娱乐圈", "演艺圈"}, {"吸血鬼", "血族"}, {"狼人", "狼族"})
    for group in synonyms:
        if len(group.intersection(tags)) > 1:
            raise ValidationError(f"标签包含同义重复：{'、'.join(group.intersection(tags))}")
    visible = metadata["previewVisibleCount"]
    if not isinstance(visible, int) or visible < 1 or visible > preview_count:
        raise ValidationError("previewVisibleCount必须大于0且不能超过试读EP数量")
    if preview_count > 4:
        raise ValidationError("正式试读最多4个完整EP")
    director_summary = str(metadata["directorStatement"])
    count = chinese_character_count(director_summary)
    if count < 500 or count > 1000:
        raise ValidationError(f"制作执行摘要须为500–1000个中文字符，当前{count}个")
    if similarity(director_summary, synopsis) >= 0.72:
        raise ValidationError("制作执行摘要与故事梗概重复度过高，请保留制作执行信息并删除梗概复述")
    if metadata["adultContentReviewed"] is not True or metadata["majorSpoilerReviewed"] is not True:
        raise ValidationError("成人内容与核心剧透必须由AI完成审查并明确标记为true")
    cover_has_title = metadata.get("coverHasEnglishTitle", False)
    cover_title = str(metadata.get("coverEnglishTitle", "")).strip()
    if cover_has_title and not cover_title:
        raise ValidationError("封面存在英文标题时必须填写coverEnglishTitle")
    if cover_title and re.sub(r"\W", "", cover_title).casefold() != re.sub(r"\W", "", str(metadata["englishTitle"])).casefold():
        raise ValidationError("页面英文剧名与封面英文标题不一致，必须人工确认")


def build_release_package(
    *, project_root: Path, release_root: Path, metadata_path: Path, cover: Path,
    english: Path, bilingual: Path, director: Path, preview_path: Path,
) -> tuple[Path, dict]:
    root = project_root.resolve()
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValidationError("元数据JSON无法读取") from error
    if not isinstance(metadata, dict):
        raise ValidationError("元数据必须是JSON对象")
    selected = {
        "cover": validate_selected_file(root, cover, ALLOWED_COVER_EXTENSIONS, "封面"),
        "english": validate_selected_file(root, english, ALLOWED_TEXT_EXTENSIONS, "英文正式剧本"),
        "bilingual": validate_selected_file(root, bilingual, ALLOWED_TEXT_EXTENSIONS, "中英对照剧本"),
        "director": validate_selected_file(root, director, ALLOWED_TEXT_EXTENSIONS, "导演阐述"),
        "preview": validate_selected_file(root, preview_path, ALLOWED_TEXT_EXTENSIONS, "中英对照试读版"),
    }
    cover_width, cover_height = image_dimensions(selected["cover"])
    if cover_width * 3 != cover_height * 2:
        raise ValidationError(f"封面必须是精确2:3，实际为{cover_width}×{cover_height}")
    english_text = read_text(selected["english"])
    bilingual_text = read_text(selected["bilingual"])
    director_text = read_text(selected["director"])
    preview = parse_preview(read_text(selected["preview"]))
    unsafe = unsafe_preview_reasons(preview)
    if unsafe:
        raise ValidationError("试读包含需要阻断的成人或平台风险内容：" + "、".join(unsafe))
    source_count, _ = validate_bilingual_pairing(english_text, bilingual_text)
    logline, synopsis = extract_logline_and_synopsis(director_text)
    validate_metadata(metadata, len(preview), synopsis)
    word_count = english_word_count(english_text)
    episodes = compute_episodes(word_count)

    files_for_upload = [selected[name] for name in ("cover", "english", "bilingual", "director")]
    sizes = [path.stat().st_size for path in files_for_upload]
    if sizes[0] > 12 * 1024 * 1024:
        raise ValidationError("封面超过12 MB")
    if any(size > 50 * 1024 * 1024 for size in sizes[1:]):
        raise ValidationError("单个剧本文档超过50 MB")
    if sum(sizes) > 100 * 1024 * 1024:
        raise ValidationError("四个上传文件合计超过100 MB")

    project_id = re.sub(r"[^A-Za-z0-9._-]", "-", str(metadata["projectId"]).strip())
    if not project_id:
        raise ValidationError("projectId无效")
    package_id = re.sub(r"[^A-Za-z0-9._-]", "-", str(metadata.get("packageId") or uuid.uuid4()))
    destination = release_root.resolve() / "心智发布区" / project_id / package_id
    if destination.exists():
        raise ValidationError(f"发布包已经存在，不能覆盖：{destination}")

    fingerprint = material_fingerprint(files_for_upload)
    index_path = release_root.resolve() / "心智发布区" / ".xinzhi-project-index.json"
    if index_path.exists():
        index_data = json.loads(index_path.read_text(encoding="utf-8"))
    else:
        index_data = {}
    existing = index_data.get(fingerprint)
    if existing and existing.get("projectRoot") != str(root):
        raise ValidationError("检测到同一套剧本资料来自另一个项目根目录，已停止重复建包")

    mappings = {
        "cover": Path("cover") / f"cover{selected['cover'].suffix.lower()}",
        "english": Path("scripts") / f"english{selected['english'].suffix.lower()}",
        "secondary": Path("scripts") / f"bilingual{selected['bilingual'].suffix.lower()}",
        "director": Path("director") / f"director-statement{selected['director'].suffix.lower()}",
    }
    api_metadata = {
        "title": metadata["title"], "englishTitle": metadata["englishTitle"],
        "genre": metadata["genre"], "logline": logline, "synopsis": synopsis,
        "directorStatement": metadata["directorStatement"],
        "previewRationale": metadata["previewRationale"],
        "sourceUnitCount": source_count, "previewUnitLabel": "段",
        "presentationMode": metadata["presentationMode"],
        "packageMode": "bilingual-package", "episodes": episodes,
        "tags": metadata["tags"], "preview": preview,
        "previewVisibleCount": metadata["previewVisibleCount"],
    }
    manifest = {
        "schemaVersion": 1, "skillVersion": "1.1.0", "projectId": project_id,
        "packageId": package_id, "packageMode": "bilingual-package",
        "idempotencyKey": str(uuid.uuid4()), "materialFingerprint": fingerprint,
        "metadata": api_metadata,
        "validation": {
            "englishWordCount": word_count,
            "episodeFormula": f"round({word_count} / 15000 * 35)",
            "episodes": episodes, "sourceUnitCount": source_count,
            "previewEpisodeCount": len(preview),
            "previewVisibleCount": metadata["previewVisibleCount"],
            "adultContentCheck": "passed", "coverDimensions": [cover_width, cover_height],
        },
        "files": {},
    }
    try:
        for relative in list(mappings.values()) + [Path("preview/preview.json"), Path("review/file-checksums.json"), Path("review/approval-status.json")]:
            (destination / relative).parent.mkdir(parents=True, exist_ok=True)
        checksums = {}
        for role, target in mappings.items():
            shutil.copy2(selected["bilingual" if role == "secondary" else role], destination / target)
            source = selected["bilingual" if role == "secondary" else role]
            item = {
                "path": target.as_posix(), "sourcePath": source.relative_to(root).as_posix(),
                "size": source.stat().st_size, "sha256": sha256(source),
            }
            manifest["files"][role] = item
            checksums[target.as_posix()] = item["sha256"]
        (destination / "preview/preview.json").write_text(json.dumps(preview, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        preview_hash = sha256(destination / "preview/preview.json")
        checksums["preview/preview.json"] = preview_hash
        manifest["files"]["preview"] = {
            "path": "preview/preview.json", "sourcePath": selected["preview"].relative_to(root).as_posix(),
            "size": (destination / "preview/preview.json").stat().st_size, "sha256": preview_hash,
        }
        (destination / "review/file-checksums.json").write_text(json.dumps(checksums, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        approval = {"approved": False, "approvedAt": None, "attempts": 0, "lastError": None}
        (destination / "review/approval-status.json").write_text(json.dumps(approval, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (destination / "xinzhi-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        index_path.parent.mkdir(parents=True, exist_ok=True)
        index_data[fingerprint] = {"projectRoot": str(root), "package": str(destination.relative_to(release_root.resolve()))}
        index_path.write_text(json.dumps(index_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception:
        if destination.exists():
            shutil.rmtree(destination)
        raise
    return destination, manifest


def validate_package(package: Path) -> dict:
    manifest_path = package / "xinzhi-manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValidationError("发布包manifest无法读取") from error
    if manifest.get("skillVersion") != "1.1.0" or manifest.get("packageMode") != "bilingual-package":
        raise ValidationError("发布包版本或模式不受支持")
    for role in ("cover", "english", "secondary", "director", "preview"):
        item = manifest.get("files", {}).get(role, {})
        path = (package / str(item.get("path", ""))).resolve()
        if package.resolve() not in path.parents or not path.is_file():
            raise ValidationError(f"发布包缺少{role}")
        if sha256(path) != item.get("sha256"):
            raise ValidationError(f"发布包{role}校验和不一致")
    metadata = manifest.get("metadata", {})
    if metadata.get("packageMode") != "bilingual-package" or metadata.get("previewUnitLabel") != "段":
        raise ValidationError("发布包元数据模式不符合正式规则")
    if int(metadata.get("previewVisibleCount", 0)) > len(metadata.get("preview", [])):
        raise ValidationError("发布包开放试读数量超过EP数量")
    return manifest
