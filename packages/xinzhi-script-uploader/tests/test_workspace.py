from __future__ import annotations

import argparse
import importlib
import json
from pathlib import Path
import shutil
import struct
import sys
import tempfile
import unittest
from unittest import mock
import zlib


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))
workspace = importlib.import_module("xinzhi_workspace")
agent = importlib.import_module("xinzhi_agent")


def png(width: int, height: int) -> bytes:
    def chunk(kind: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)

    rows = b"".join(b"\0" + b"\xee\xee\xee" * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(rows))
        + chunk(b"IEND", b"")
    )


def summary_text(length: int = 520) -> str:
    alphabet = "制作执行强调情绪节奏表演镜头色彩空间道具连续性避免误读现场调度声音设计人物关系"
    return "## 制作执行摘要\n" + "".join(alphabet[index % len(alphabet)] for index in range(length))


class Fixture:
    def __init__(self, root: Path):
        self.root = root
        self.project = root / "project"
        self.project.mkdir()
        self.cover = self.project / "cover.png"
        self.english = self.project / "english.md"
        self.bilingual = self.project / "bilingual.md"
        self.director = self.project / "director.md"
        self.preview = self.project / "03-试读版" / "story-中英对照试读版.md"
        self.preview.parent.mkdir()
        self.metadata = root / "metadata.json"
        self.cover.write_bytes(png(1024, 1536))
        english_lines = [
            "# Formal English Script",
            "【解说词】：The butler crosses the silent hall and hides the contract.",
            "【对白】：ADRIAN：You should not have returned tonight.",
            "【解说词】：A warning bell echoes behind the locked western door.",
            "【对白】：ELI：Then tell me why you kept my letter.",
        ]
        self.english.write_text("\n".join(english_lines), encoding="utf-8")
        bilingual_lines = [english_lines[0]]
        for line in english_lines[1:]:
            label = "对白" if line.startswith("【对白】") else "解说词"
            bilingual_lines.extend([line, f"【{label}】：对应的中文正文。"])
        self.bilingual.write_text("\n".join(bilingual_lines), encoding="utf-8")
        self.director.write_text(
            "## 一、项目概览\n题材类型：ABO、豪门、契约关系\n"
            "## 二、一句话故事\n一个管家必须在旧契约与真实感情之间作出选择。\n"
            "## 三、故事梗概\n他回到封闭的庄园。\n旧信件让两人的信任再次动摇。\n"
            "## 四、人物\n人物资料。\n",
            encoding="utf-8",
        )
        preview = []
        for number in range(1, 5):
            preview.append(
                f"## EP{number:02d}\n### English\nNarration line {number}.\nADRIAN: Stay.\n"
                f"### 中文\n第{number}段解说。\n阿德里安：留下。"
            )
        self.preview.write_text("\n\n".join(preview), encoding="utf-8")
        self.write_metadata()

    def metadata_value(self) -> dict:
        return {
            "projectId": "butler",
            "packageId": "release-1",
            "title": "管家的旧契约",
            "englishTitle": "The Butler's Old Contract",
            "genre": "BL",
            "tags": ["ABO", "豪门", "契约关系"],
            "presentationMode": "解说",
            "directorStatement": summary_text(),
            "previewRationale": "EP01至EP04建立主角、契约关系和庄园世界观，以旧信件形成冲突钩子，避开成人内容与结局反转。",
            "previewVisibleCount": 4,
            "adultContentReviewed": True,
            "majorSpoilerReviewed": True,
            "coverHasEnglishTitle": True,
            "coverEnglishTitle": "The Butler's Old Contract",
        }

    def write_metadata(self, **changes) -> None:
        value = self.metadata_value()
        value.update(changes)
        self.metadata.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")

    def build(self, release_root: Path | None = None):
        return workspace.build_release_package(
            project_root=self.project,
            release_root=release_root or self.root / "release",
            metadata_path=self.metadata,
            cover=self.cover,
            english=self.english,
            bilingual=self.bilingual,
            director=self.director,
            preview_path=self.preview,
        )


class WorkspaceValidationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.fixture = Fixture(self.root)

    def tearDown(self):
        self.temporary.cleanup()

    def assert_invalid(self, callback, contains: str):
        with self.assertRaises(workspace.ValidationError) as caught:
            callback()
        self.assertIn(contains, str(caught.exception))

    def test_standard_four_ep_package(self):
        package, manifest = self.fixture.build()
        self.assertEqual(manifest["validation"]["previewEpisodeCount"], 4)
        self.assertEqual(manifest["metadata"]["previewUnitLabel"], "段")
        self.assertEqual(workspace.validate_package(package)["packageMode"], "bilingual-package")

    def test_project_boundary(self):
        outside = self.root / "outside.png"
        outside.write_bytes(png(2, 3))
        self.fixture.cover = outside
        self.assert_invalid(self.fixture.build, "不在本次项目目录")

    def test_four_required_files(self):
        self.fixture.director.unlink()
        self.assert_invalid(self.fixture.build, "缺少导演阐述")

    def test_multiple_candidates_are_not_selected_by_mtime(self):
        self.assert_invalid(
            lambda: workspace.select_single_candidate([Path("a.md"), Path("b.md")], "英文剧本"),
            "候选文件数量为2",
        )

    def test_missing_chinese_preview_block(self):
        self.fixture.preview.write_text("## EP01\n### English\nOnly English", encoding="utf-8")
        self.assert_invalid(self.fixture.build, "缺少完整")

    def test_module_type_mismatch(self):
        value = self.fixture.bilingual.read_text(encoding="utf-8").replace("【对白】", "【解说词】", 1)
        self.fixture.bilingual.write_text(value, encoding="utf-8")
        self.assert_invalid(self.fixture.build, "模块类型不匹配")

    def test_ellipsis_and_unknown_are_not_modules(self):
        text = "【解说词】：……\n【对白】：Unknown Speaker：TBD\n【解说词】：Real narration."
        self.assertEqual(len(workspace.extract_modules(text)), 1)

    def test_copy_filename_is_blocked(self):
        copied = self.fixture.project / "cover_副本.png"
        self.fixture.cover.rename(copied)
        self.fixture.cover = copied
        self.assert_invalid(self.fixture.build, "疑似副本")

    def test_workflow_status_history_path_is_blocked(self):
        history = self.fixture.project / "99-历史归档"
        history.mkdir()
        moved = history / "director.md"
        self.fixture.director.rename(moved)
        self.fixture.director = moved
        self.assert_invalid(self.fixture.build, "禁止选择")

    def test_same_material_two_roots_is_blocked(self):
        release = self.root / "release"
        self.fixture.build(release)
        second_root = self.root / "second"
        shutil.copytree(self.fixture.project, second_root)
        second_meta = self.root / "second.json"
        second_value = json.loads(self.fixture.metadata.read_text(encoding="utf-8"))
        second_value["packageId"] = "release-2"
        second_meta.write_text(json.dumps(second_value, ensure_ascii=False), encoding="utf-8")
        self.assert_invalid(
            lambda: workspace.build_release_package(
                project_root=second_root, release_root=release, metadata_path=second_meta,
                cover=second_root / "cover.png", english=second_root / "english.md",
                bilingual=second_root / "bilingual.md", director=second_root / "director.md",
                preview_path=second_root / "03-试读版/story-中英对照试读版.md",
            ),
            "另一个项目根目录",
        )

    def test_genre_tag_duplicate(self):
        self.fixture.write_metadata(tags=["ABO", "BL"])
        self.assert_invalid(self.fixture.build, "不能重复放入tags")

    def test_synonym_duplicate(self):
        self.fixture.write_metadata(tags=["ABO", "都市", "现代都市"])
        self.assert_invalid(self.fixture.build, "同义重复")

    def test_word_count_and_episode_formula(self):
        text = "【解说词】：" + "word " * 9920
        count = workspace.english_word_count(text)
        self.assertEqual(count, 9920)
        self.assertEqual(workspace.compute_episodes(count), 23)

    def test_director_summary_over_1000(self):
        self.fixture.write_metadata(directorStatement=summary_text(1001))
        self.assert_invalid(self.fixture.build, "500–1000")

    def test_director_summary_synopsis_duplicate(self):
        synopsis = "他回到封闭的庄园旧信件让两人的信任再次动摇"
        self.fixture.director.write_text(
            f"## 二、一句话故事\n一句话。\n## 三、故事梗概\n{synopsis}\n## 四、人物\n人物。",
            encoding="utf-8",
        )
        self.fixture.write_metadata(directorStatement=(synopsis * 50)[:520])
        self.assert_invalid(self.fixture.build, "重复度过高")

    def test_good_1024_by_1536_cover(self):
        self.assertEqual(workspace.image_dimensions(self.fixture.cover), (1024, 1536))
        self.fixture.build()

    def test_filename_claims_ratio_but_pixels_are_wrong(self):
        wrong = self.fixture.project / "cover-2x3.png"
        wrong.write_bytes(png(1000, 1400))
        self.fixture.cover = wrong
        self.assert_invalid(self.fixture.build, "精确2:3")

    def test_adult_preview_is_blocked_not_edited(self):
        original = self.fixture.preview.read_text(encoding="utf-8") + "\n裸体"
        self.fixture.preview.write_text(original, encoding="utf-8")
        self.assert_invalid(self.fixture.build, "成人或平台风险")
        self.assertEqual(self.fixture.preview.read_text(encoding="utf-8"), original)

    def test_visible_count_cannot_exceed_ep_count(self):
        self.fixture.write_metadata(previewVisibleCount=5)
        self.assert_invalid(self.fixture.build, "不能超过试读EP数量")

    def test_failed_upload_cleans_temp_metadata_and_reuses_idempotency(self):
        package, manifest = self.fixture.build()
        approval_path = package / "review/approval-status.json"
        approval = json.loads(approval_path.read_text(encoding="utf-8"))
        approval["approved"] = True
        approval_path.write_text(json.dumps(approval), encoding="utf-8")
        seen_paths = []
        seen_keys = []

        def fail(args):
            seen_paths.append(Path(args.metadata))
            seen_keys.append(args.idempotency_key)
            raise agent.ClientError("offline")

        for _ in range(2):
            with mock.patch.object(agent, "command_import", side_effect=fail):
                with self.assertRaises(agent.ClientError):
                    agent.command_import_package(argparse.Namespace(package=str(package)))
        self.assertTrue(all(not path.exists() for path in seen_paths))
        self.assertEqual(seen_keys, [manifest["idempotencyKey"], manifest["idempotencyKey"]])


if __name__ == "__main__":
    unittest.main()
