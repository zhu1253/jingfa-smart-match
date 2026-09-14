#!/usr/bin/env python3
"""Import a private knowledge manifest and safe text chunks into MySQL."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path


SENSITIVE = re.compile(r"分润|佣金|银行账号|身份证号|手机号|签字人|IP Address|Envelope ID", re.IGNORECASE)


def b64(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def text_expr(value: object | None) -> str:
    if value is None:
        return "NULL"
    return f"CONVERT(FROM_BASE64('{b64(str(value))}') USING utf8mb4)"


def json_expr(value: object | None) -> str:
    if value is None:
        return "NULL"
    raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return f"CAST(CONVERT(FROM_BASE64('{b64(raw)}') USING utf8mb4) AS JSON)"


def load_bundle(bundle: Path) -> tuple[dict, list[dict], bytes]:
    manifest_path = bundle / "manifest.json"
    chunks_path = bundle / "chunks.jsonl"
    raw = manifest_path.read_bytes()
    manifest = json.loads(raw.decode("utf-8"))
    chunks = [json.loads(line) for line in chunks_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if manifest.get("schemaVersion") != 1 or not isinstance(manifest.get("documents"), list):
        raise ValueError("invalid knowledge manifest")
    document_map = {item["documentKey"]: item for item in manifest["documents"]}
    if len(document_map) != len(manifest["documents"]):
        raise ValueError("duplicate documentKey")
    sequences: dict[str, set[int]] = defaultdict(set)
    for chunk in chunks:
        document = document_map.get(chunk.get("documentKey"))
        if not document:
            raise ValueError("chunk references an unknown document")
        if not document.get("agentRetrievalEnabled") or document.get("accessLevel") == "restricted":
            raise ValueError("restricted or disabled document has chunks")
        if SENSITIVE.search(chunk.get("content", "")):
            raise ValueError("chunk contains blocked sensitive content")
        sequence = int(chunk["sequence"])
        if sequence in sequences[chunk["documentKey"]]:
            raise ValueError("duplicate chunk sequence")
        sequences[chunk["documentKey"]].add(sequence)
    return manifest, chunks, raw


def sql_for(manifest: dict, chunks: list[dict], manifest_raw: bytes) -> str:
    chunk_groups: dict[str, list[dict]] = defaultdict(list)
    for chunk in chunks:
        chunk_groups[chunk["documentKey"]].append(chunk)
    statements = [
        "SET NAMES utf8mb4;",
        "USE jingfa_smartfit;",
        "START TRANSACTION;",
        "SET @workspace_id := (SELECT id FROM workspaces WHERE slug='jingfa-smartfit' LIMIT 1);",
    ]
    for document in manifest["documents"]:
        retrieval = "TRUE" if document["agentRetrievalEnabled"] else "FALSE"
        parse_status = "completed" if document["agentRetrievalEnabled"] else "pending"
        statements.append(
            "INSERT INTO knowledge_documents (workspace_id,public_id,legacy_key,title,document_type,summary,source,access_level,agent_retrieval_enabled,status,current_version_no) "
            f"VALUES (@workspace_id,UUID(),{text_expr(document['documentKey'])},{text_expr(document['title'])},{text_expr(document['documentType'])},{text_expr(document.get('summary'))},'用户提供附件',{text_expr(document['accessLevel'])},{retrieval},'active',1) "
            "ON DUPLICATE KEY UPDATE title=VALUES(title),document_type=VALUES(document_type),summary=VALUES(summary),source=VALUES(source),access_level=VALUES(access_level),agent_retrieval_enabled=VALUES(agent_retrieval_enabled),status='active',current_version_no=1;"
        )
        metadata = {
            "relativePath": document["relativePath"],
            "retrievalEnabled": document["agentRetrievalEnabled"],
            "privacyReview": "passed",
        }
        statements.append(
            "INSERT INTO knowledge_document_versions (workspace_id,document_id,version_no,storage_provider,storage_key,original_filename,mime_type,file_size_bytes,checksum_sha256,extraction_metadata,parse_status,effective_from) "
            f"SELECT @workspace_id,id,1,'local',{text_expr(document['storageKey'])},{text_expr(document['title'])},{text_expr(document['mimeType'])},{int(document['sizeBytes'])},'{document['sha256']}',{json_expr(metadata)},{text_expr(parse_status)},'2026-09-14' "
            f"FROM knowledge_documents WHERE workspace_id=@workspace_id AND legacy_key={text_expr(document['documentKey'])} "
            "ON DUPLICATE KEY UPDATE storage_provider='local',storage_key=VALUES(storage_key),original_filename=VALUES(original_filename),mime_type=VALUES(mime_type),file_size_bytes=VALUES(file_size_bytes),checksum_sha256=VALUES(checksum_sha256),extraction_metadata=VALUES(extraction_metadata),parse_status=VALUES(parse_status),effective_from=VALUES(effective_from);"
        )
        statements.append(
            "SET @document_version_id := (SELECT v.id FROM knowledge_document_versions v JOIN knowledge_documents d ON d.id=v.document_id WHERE d.workspace_id=@workspace_id "
            f"AND d.legacy_key={text_expr(document['documentKey'])} AND v.version_no=1 LIMIT 1);"
        )
        statements.append("DELETE FROM knowledge_chunks WHERE document_version_id=@document_version_id;")
        for chunk in sorted(chunk_groups.get(document["documentKey"], []), key=lambda item: item["sequence"]):
            statements.append(
                "INSERT INTO knowledge_chunks (document_version_id,sequence_no,section_title,page_from,page_to,content,token_count,metadata_json) "
                f"VALUES (@document_version_id,{int(chunk['sequence'])},{text_expr(chunk.get('sectionTitle'))},{'NULL' if chunk.get('pageFrom') is None else int(chunk['pageFrom'])},{'NULL' if chunk.get('pageTo') is None else int(chunk['pageTo'])},{text_expr(chunk['content'])},{int(chunk.get('tokenEstimate') or 0)},JSON_OBJECT('privacy_review','passed'));"
            )
    counts = {
        "documents": len(manifest["documents"]),
        "retrievalEnabled": sum(bool(item["agentRetrievalEnabled"]) for item in manifest["documents"]),
        "restricted": sum(item["accessLevel"] == "restricted" for item in manifest["documents"]),
        "chunks": len(chunks),
    }
    statements.append(
        "INSERT INTO catalog_import_batches (workspace_id,batch_key,manifest_sha256,source_label,status,counts_json,warnings_json,completed_at) "
        f"VALUES (@workspace_id,{text_expr(manifest['batchKey'])},'{hashlib.sha256(manifest_raw).hexdigest()}','用户提供跨境金融资料','completed',{json_expr(counts)},JSON_ARRAY(),CURRENT_TIMESTAMP(3)) "
        "ON DUPLICATE KEY UPDATE manifest_sha256=VALUES(manifest_sha256),status='completed',counts_json=VALUES(counts_json),warnings_json=JSON_ARRAY(),completed_at=CURRENT_TIMESTAMP(3);"
    )
    statements.extend(["COMMIT;", "SELECT 'KNOWLEDGE_IMPORT_OK';"])
    return "\n".join(statements) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--container", default="jingfa-mysql")
    parser.add_argument("--sql-out", type=Path)
    args = parser.parse_args()
    manifest, chunks, raw = load_bundle(args.bundle)
    sql = sql_for(manifest, chunks, raw)
    if args.sql_out:
        args.sql_out.write_text(sql, encoding="utf-8")
    counts = {
        "documents": len(manifest["documents"]),
        "retrievalEnabled": sum(bool(item["agentRetrievalEnabled"]) for item in manifest["documents"]),
        "restricted": sum(item["accessLevel"] == "restricted" for item in manifest["documents"]),
        "chunks": len(chunks),
    }
    if not args.execute:
        print(json.dumps(counts, ensure_ascii=False))
        print("KNOWLEDGE_BUNDLE_VALID")
        return 0
    command = ["docker", "exec", "-i", args.container, "sh", "-c", 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root']
    return subprocess.run(command, input=sql.encode("utf-8"), check=False).returncode


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"knowledge import failed: {exc}", file=sys.stderr)
        raise SystemExit(2)
