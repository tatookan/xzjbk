#!/usr/bin/env python3
"""Official Xinzhi Script Library Agent client. Uses only the Python standard library."""

from __future__ import annotations

import argparse
import getpass
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import shutil
import ssl
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile

from xinzhi_workspace import ValidationError, build_release_package, validate_package


SKILL_VERSION = "1.1.0"
DEFAULT_SERVER = "https://drama.xinsee.cc:8443"
KEY_PATTERN = re.compile(r"^xz_agent_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$")


class ClientError(RuntimeError):
    pass


def config_path() -> Path:
    base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return base / "xinzhi-agent" / "credentials.json"


def read_config(required: bool = True) -> dict[str, str]:
    path = config_path()
    if not path.exists():
        if required:
            raise ClientError(
                "尚未配置 Agent API Key。请不要把Key粘贴到聊天中，"
                "请在自己的终端运行：python3 scripts/xinzhi_agent.py configure"
            )
        return {"server": DEFAULT_SERVER}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ClientError("凭证配置无法读取，请重新运行 configure") from error
    server = str(data.get("server", "")).rstrip("/")
    api_key = str(data.get("api_key", ""))
    if not server.startswith(("https://", "http://localhost", "http://127.0.0.1")):
        raise ClientError("凭证中的服务器地址不安全或无效")
    if not KEY_PATTERN.fullmatch(api_key):
        raise ClientError("凭证中的 Agent API Key 格式无效，请重新运行 configure")
    return {"server": server, "api_key": api_key}


def write_config(server: str, api_key: str) -> None:
    path = config_path()
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    descriptor, temporary_name = tempfile.mkstemp(prefix="credentials-", dir=path.parent)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump({"server": server.rstrip("/"), "api_key": api_key}, handle)
            handle.write("\n")
        os.replace(temporary_name, path)
        os.chmod(path, 0o600)
    except Exception:
        try:
            os.unlink(temporary_name)
        except OSError:
            pass
        raise


def request_json(url: str, headers: dict[str, str] | None = None) -> dict:
    request = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(
            request, timeout=30, context=ssl.create_default_context()
        ) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(body)
            message = payload.get("error", {}).get("message", body)
        except json.JSONDecodeError:
            message = body or str(error)
        raise ClientError(f"服务器返回 {error.code}: {message}") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ClientError(f"无法连接心智剧本库：{error}") from error
    if not payload.get("success") or not isinstance(payload.get("data"), dict):
        raise ClientError("版本接口返回了无法识别的数据")
    return payload["data"]


def version_manifest(server: str) -> dict:
    return request_json(f"{server}/api/agent/v1/skill/version")


def assert_current_version(server: str) -> dict:
    manifest = version_manifest(server)
    required = str(manifest.get("minimumSkillVersion", ""))
    latest = str(manifest.get("latestSkillVersion", ""))
    if SKILL_VERSION != latest or SKILL_VERSION != required:
        raise ClientError(
            f"Skill版本不一致：本机 {SKILL_VERSION}，服务器 {latest}。"
            "请先运行 python3 scripts/xinzhi_agent.py update"
        )
    return manifest


def command_configure(args: argparse.Namespace) -> None:
    server = args.server.rstrip("/")
    if not server.startswith(("https://", "http://localhost", "http://127.0.0.1")):
        raise ClientError("服务器必须使用HTTPS，本机开发环境除外")
    api_key = getpass.getpass("Agent API Key（输入不会显示）: ").strip()
    if not KEY_PATTERN.fullmatch(api_key):
        raise ClientError("Key格式无效，请向管理员确认后重试")
    write_config(server, api_key)
    print(f"配置已保存到 {config_path()}。Key未写入Skill目录。")


def command_status(_: argparse.Namespace) -> None:
    config = read_config(required=False)
    missing_key = "api_key" not in config
    if missing_key:
        print(
            "首次运行需要管理员提供专属Key。不要把Key粘贴到聊天中；"
            "请在自己的终端运行：python3 scripts/xinzhi_agent.py configure",
            file=sys.stderr,
        )
    manifest = version_manifest(config["server"])
    latest = str(manifest.get("latestSkillVersion", "unknown"))
    print(f"Skill版本：{SKILL_VERSION}；服务器要求：{latest}")
    if SKILL_VERSION != latest:
        raise ClientError("发现版本更新。请先征得用户同意，再运行 update。")
    if missing_key:
        raise ClientError(
            "Key尚未配置。完成本机安全配置后，请重新运行 status。"
        )
    print("版本和本机凭证配置正常，可以准备导入草稿。")


def safe_extract(archive: zipfile.ZipFile, destination: Path) -> None:
    destination_resolved = destination.resolve()
    for member in archive.infolist():
        target = (destination / member.filename).resolve()
        if destination_resolved not in target.parents and target != destination_resolved:
            raise ClientError("更新包包含不安全路径，已停止安装")
    archive.extractall(destination)


def command_update(_: argparse.Namespace) -> None:
    config = read_config(required=False)
    server = config["server"]
    manifest = version_manifest(server)
    latest = str(manifest.get("latestSkillVersion", ""))
    if latest == SKILL_VERSION:
        print("当前已经是最新版本。")
        return
    download_url = str(manifest.get("downloadUrl", ""))
    expected_hash = str(manifest.get("sha256", ""))
    server_host = urllib.parse.urlparse(server).netloc
    download = urllib.parse.urlparse(download_url)
    if download.scheme != "https" or download.netloc != server_host:
        raise ClientError("更新地址不是官方HTTPS地址，已停止更新")
    with tempfile.TemporaryDirectory(prefix="xinzhi-skill-update-") as temporary:
        temporary_path = Path(temporary)
        archive_path = temporary_path / "skill.zip"
        try:
            with urllib.request.urlopen(
                download_url, timeout=60, context=ssl.create_default_context()
            ) as response:
                archive_path.write_bytes(response.read())
        except (urllib.error.URLError, TimeoutError) as error:
            raise ClientError(f"Skill包下载失败：{error}") from error
        actual_hash = hashlib.sha256(archive_path.read_bytes()).hexdigest()
        if not secrets.compare_digest(actual_hash, expected_hash):
            raise ClientError("Skill包校验失败，已停止安装")
        extract_root = temporary_path / "unpacked"
        extract_root.mkdir()
        with zipfile.ZipFile(archive_path) as archive:
            safe_extract(archive, extract_root)
        incoming = extract_root / "xinzhi-script-uploader"
        required_files = [incoming / "SKILL.md", incoming / "scripts" / "xinzhi_agent.py"]
        if not all(path.is_file() for path in required_files):
            raise ClientError("更新包结构不完整，已停止安装")
        source = required_files[1].read_text(encoding="utf-8")
        if f'SKILL_VERSION = "{latest}"' not in source:
            raise ClientError("更新包版本声明不一致，已停止安装")

        current = Path(__file__).resolve().parents[1]
        if current.name != "xinzhi-script-uploader" or not (current / "SKILL.md").is_file():
            raise ClientError("无法确认当前Skill安装目录，已停止更新")
        backup = current.with_name(f"{current.name}.backup")
        if backup.exists():
            shutil.rmtree(backup)
        os.replace(current, backup)
        try:
            os.replace(incoming, current)
        except Exception:
            os.replace(backup, current)
            raise
        shutil.rmtree(backup)
    print(f"Skill已更新到 {latest}。请重新开始当前任务。")


def multipart_body(fields: dict[str, str], files: dict[str, Path]) -> tuple[bytes, str]:
    boundary = f"xinzhi-{secrets.token_hex(16)}"
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )
    for name, path in files.items():
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"; filename="{path.name}"\r\n'.encode(),
                f"Content-Type: {content_type}\r\n\r\n".encode(),
                path.read_bytes(),
                b"\r\n",
            ]
        )
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def command_import(args: argparse.Namespace) -> None:
    config = read_config()
    assert_current_version(config["server"])
    metadata_path = Path(args.metadata).expanduser().resolve()
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ClientError("元数据JSON无法读取") from error
    if not isinstance(metadata, dict):
        raise ClientError("元数据必须是JSON对象")
    field_names = [
        "title",
        "englishTitle",
        "genre",
        "logline",
        "synopsis",
        "directorStatement",
        "previewRationale",
        "sourceUnitCount",
        "previewUnitLabel",
        "presentationMode",
        "packageMode",
        "episodes",
        "tags",
        "preview",
        "previewVisibleCount",
    ]
    fields: dict[str, str] = {}
    for name in field_names:
        if name not in metadata:
            raise ClientError(f"元数据缺少字段：{name}")
        value = metadata[name]
        fields[name] = (
            json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else str(value)
        )
    files = {
        "cover": Path(args.cover).expanduser().resolve(),
        "english": Path(args.english).expanduser().resolve(),
        "secondary": Path(args.secondary).expanduser().resolve(),
        "director": Path(args.director).expanduser().resolve(),
    }
    missing = [str(path) for path in files.values() if not path.is_file()]
    if missing:
        raise ClientError("以下上传文件不存在：" + ", ".join(missing))
    body, content_type = multipart_body(fields, files)
    request = urllib.request.Request(
        f"{config['server']}/api/agent/v1/imports",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {config['api_key']}",
            "X-Xinzhi-Skill-Version": SKILL_VERSION,
            "Idempotency-Key": args.idempotency_key,
            "Content-Type": content_type,
            "Content-Length": str(len(body)),
        },
    )
    try:
        with urllib.request.urlopen(
            request, timeout=180, context=ssl.create_default_context()
        ) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        try:
            failure = json.loads(raw)
            detail = failure.get("error", {})
            message = detail.get("message", raw)
            retry = detail.get("details", {}).get("retryAfterSeconds")
        except json.JSONDecodeError:
            message, retry = raw or str(error), None
        suffix = f"，请等待至少 {retry} 秒" if retry else ""
        raise ClientError(f"导入失败（{error.code}）：{message}{suffix}") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ClientError(f"导入请求失败：{error}") from error
    data = payload.get("data", {})
    if not payload.get("success") or not data.get("scriptId"):
        raise ClientError("服务器没有返回有效的草稿编号")
    print(f"草稿创建成功。剧本编号：{data['scriptId']}；导入编号：{data['importId']}")
    print("请由管理员进入后台检查价格、试读和交付文件后再发布。")


def read_json_object(path: Path, label: str) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ClientError(f"{label}无法读取") from error
    if not isinstance(value, dict):
        raise ClientError(f"{label}必须是JSON对象")
    return value


def atomic_write_json(path: Path, value: dict) -> None:
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temporary_name, path)
    except Exception:
        try:
            os.unlink(temporary_name)
        except OSError:
            pass
        raise


def command_prepare(args: argparse.Namespace) -> None:
    config = read_config(required=False)
    assert_current_version(config["server"])
    try:
        destination, manifest = build_release_package(
            project_root=Path(args.project).expanduser(),
            release_root=Path(args.workspace).expanduser(),
            metadata_path=Path(args.metadata).expanduser(),
            cover=Path(args.cover).expanduser(),
            english=Path(args.english).expanduser(),
            bilingual=Path(args.bilingual).expanduser(),
            director=Path(args.director).expanduser(),
            preview_path=Path(args.preview).expanduser(),
        )
    except ValidationError as error:
        raise ClientError(str(error)) from error
    validation = manifest["validation"]
    print(f"发布包已生成：{destination}")
    print(
        f"英文正文词数：{validation['englishWordCount']}；"
        f"集数：{validation['episodeFormula']} = {validation['episodes']}；"
        f"有效模块：{validation['sourceUnitCount']}"
    )
    print(
        f"试读EP：{validation['previewEpisodeCount']}；开放：{validation['previewVisibleCount']}；"
        f"封面：{validation['coverDimensions'][0]}×{validation['coverDimensions'][1]}；"
        "成人内容检查：通过"
    )
    print("发布包尚未批准。请先向用户展示完整审核摘要；用户确认后运行 approve。")


def command_validate_package(args: argparse.Namespace) -> None:
    try:
        manifest = validate_package(Path(args.package).expanduser().resolve())
    except ValidationError as error:
        raise ClientError(str(error)) from error
    print(
        f"发布包校验通过：{manifest['projectId']}/{manifest['packageId']}；"
        f"Skill {manifest['skillVersion']}"
    )


def command_approve(args: argparse.Namespace) -> None:
    package = Path(args.package).expanduser().resolve()
    try:
        validate_package(package)
    except ValidationError as error:
        raise ClientError(str(error)) from error
    approval_path = package / "review/approval-status.json"
    approval = read_json_object(approval_path, "批准状态")
    from datetime import datetime, timezone

    approval["approved"] = True
    approval["approvedAt"] = datetime.now(timezone.utc).isoformat()
    atomic_write_json(approval_path, approval)
    print("发布包已记录用户批准，可以执行 import-package。")


def command_import_package(args: argparse.Namespace) -> None:
    package = Path(args.package).expanduser().resolve()
    try:
        manifest = validate_package(package)
    except ValidationError as error:
        raise ClientError(str(error)) from error
    approval_path = package / "review/approval-status.json"
    approval = read_json_object(approval_path, "批准状态")
    if approval.get("approved") is not True:
        raise ClientError("发布包尚未获得用户批准，不能上传")
    approval["attempts"] = int(approval.get("attempts", 0)) + 1
    approval["lastError"] = None
    atomic_write_json(approval_path, approval)
    try:
        with tempfile.TemporaryDirectory(prefix="xinzhi-import-") as temporary:
            metadata_path = Path(temporary) / "metadata.json"
            metadata_path.write_text(
                json.dumps(manifest["metadata"], ensure_ascii=False), encoding="utf-8"
            )
            legacy_args = argparse.Namespace(
                metadata=str(metadata_path),
                cover=str(package / manifest["files"]["cover"]["path"]),
                english=str(package / manifest["files"]["english"]["path"]),
                secondary=str(package / manifest["files"]["secondary"]["path"]),
                director=str(package / manifest["files"]["director"]["path"]),
                idempotency_key=manifest["idempotencyKey"],
            )
            command_import(legacy_args)
    except Exception as error:
        approval["lastError"] = str(error)
        atomic_write_json(approval_path, approval)
        raise
    approval["completed"] = True
    approval["lastError"] = None
    atomic_write_json(approval_path, approval)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="心智剧本库官方Agent客户端")
    subparsers = parser.add_subparsers(dest="command", required=True)
    configure = subparsers.add_parser("configure", help="安全配置服务器和API Key")
    configure.add_argument("--server", default=DEFAULT_SERVER)
    configure.set_defaults(handler=command_configure)
    status = subparsers.add_parser("status", help="检查版本和凭证状态")
    status.set_defaults(handler=command_status)
    update = subparsers.add_parser("update", help="从官方地址校验并更新Skill")
    update.set_defaults(handler=command_update)
    importer = subparsers.add_parser("import", help="上传剧本资料并创建草稿")
    importer.add_argument("--metadata", required=True)
    importer.add_argument("--cover", required=True)
    importer.add_argument("--english", required=True)
    importer.add_argument("--secondary", required=True)
    importer.add_argument("--director", required=True)
    importer.add_argument("--idempotency-key", required=True)
    importer.set_defaults(handler=command_import)
    prepare = subparsers.add_parser("prepare", help="校验源材料并生成独立的正式发布包")
    prepare.add_argument("--project", required=True, help="单个创作项目根目录")
    prepare.add_argument("--workspace", required=True, help="工作区根目录，发布区将在其下创建")
    prepare.add_argument("--metadata", required=True, help="AI完成的待审元数据JSON")
    prepare.add_argument("--cover", required=True)
    prepare.add_argument("--english", required=True)
    prepare.add_argument("--bilingual", required=True)
    prepare.add_argument("--director", required=True)
    prepare.add_argument("--preview", required=True)
    prepare.set_defaults(handler=command_prepare)
    validator = subparsers.add_parser("validate-package", help="离线复核正式发布包")
    validator.add_argument("--package", required=True)
    validator.set_defaults(handler=command_validate_package)
    approve = subparsers.add_parser("approve", help="在用户明确确认后记录发布包批准状态")
    approve.add_argument("--package", required=True)
    approve.set_defaults(handler=command_approve)
    package_importer = subparsers.add_parser(
        "import-package", help="上传已批准的正式发布包并创建草稿"
    )
    package_importer.add_argument("--package", required=True)
    package_importer.set_defaults(handler=command_import_package)
    return parser


def main() -> int:
    try:
        args = build_parser().parse_args()
        args.handler(args)
        return 0
    except ClientError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
