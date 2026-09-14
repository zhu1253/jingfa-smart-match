#!/usr/bin/env python3
"""Validate and import the safe public catalog into the private MySQL container."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import subprocess
import sys
from pathlib import Path


FUNDER_PARTNER_KEYS = {
    "微众银行": "webank",
    "浦发银行": "spdb",
    "中关村银行": "zbank",
    "平安银行": "pingan-bank",
    "汇丰银行": "hsbc",
    "富融银行": "fusion-bank",
    "平安壹账通银行（香港）": "paob",
    "丰泊国际 FundPark": "fundpark",
    "天逸保理": "tianyibao-partner",
    "Olea": "olea",
    "Qupital 桥彼道": "qupital",
    "联易融国际 Unloq": "unloq",
    "简单汇": "jdh",
}

SOURCE_STATUS = {"已核验": "verified", "待人工复核": "needs_confirmation", "方案资料": "partial"}
ACCESS_LEVEL = {"公开资料": "public", "内部资料": "internal"}


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


def currency_code(label: str) -> str:
    if "美元" in label:
        return "USD"
    if "港币" in label:
        return "HKD"
    if "欧元" in label:
        return "EUR"
    return "CNY"


def validate(payload: dict) -> None:
    if payload.get("schemaVersion") != 1:
        raise ValueError("unsupported schemaVersion")
    for collection in ("products", "partners", "libraryDocuments"):
        values = payload.get(collection)
        if not isinstance(values, list) or not values:
            raise ValueError(f"{collection} must be a non-empty list")
        ids = [item.get("id") for item in values]
        if any(not isinstance(item_id, str) or not item_id for item_id in ids):
            raise ValueError(f"{collection} contains an invalid id")
        if len(ids) != len(set(ids)):
            raise ValueError(f"{collection} contains duplicate ids")
    unknown_funders = sorted({item["funder"] for item in payload["products"] if item["funder"] not in FUNDER_PARTNER_KEYS})
    if unknown_funders:
        raise ValueError(f"products have unmapped funders: {', '.join(unknown_funders)}")


def sql_for(payload: dict, manifest_sha: str) -> str:
    statements = [
        "SET NAMES utf8mb4;",
        "USE jingfa_smartfit;",
        "START TRANSACTION;",
        "SET @workspace_id := (SELECT id FROM workspaces WHERE slug='jingfa-smartfit' LIMIT 1);",
    ]
    for partner in payload["partners"]:
        verification = "verified" if partner["id"] == "qupital" else ("partial" if partner.get("status") != "待接洽" else "unverified")
        statements.append(
            "INSERT INTO partners (workspace_id,public_id,legacy_key,name,type,description,priority_code,city,status,verification_status,services,is_public) "
            f"VALUES (@workspace_id,UUID(),{text_expr(partner['id'])},{text_expr(partner['name'])},{text_expr(partner['type'])},{text_expr(partner.get('description'))},{text_expr(partner.get('priority'))},{text_expr(partner.get('city'))},{text_expr(partner.get('status','待接洽'))},{text_expr(verification)},{json_expr(partner.get('services',[]))},TRUE) "
            "ON DUPLICATE KEY UPDATE name=VALUES(name),type=VALUES(type),description=VALUES(description),priority_code=VALUES(priority_code),city=VALUES(city),status=VALUES(status),verification_status=VALUES(verification_status),services=VALUES(services),is_public=TRUE;"
        )
    for product in payload["products"]:
        verification = SOURCE_STATUS.get(product.get("sourceStatus"), "unverified")
        partner_key = FUNDER_PARTNER_KEYS[product["funder"]]
        statements.append(
            "INSERT INTO products (workspace_id,public_id,legacy_key,funder_partner_id,name,funder_name,product_type,status,verification_status,matching_enabled) "
            f"SELECT @workspace_id,UUID(),{text_expr(product['id'])},id,{text_expr(product['name'])},{text_expr(product['funder'])},{text_expr(product['type'])},'active',{text_expr(verification)},{'TRUE' if product.get('matchingReady') else 'FALSE'} "
            f"FROM partners WHERE workspace_id=@workspace_id AND legacy_key={text_expr(partner_key)} "
            "ON DUPLICATE KEY UPDATE funder_partner_id=VALUES(funder_partner_id),name=VALUES(name),funder_name=VALUES(funder_name),product_type=VALUES(product_type),status='active',verification_status=VALUES(verification_status),matching_enabled=VALUES(matching_enabled);"
        )
        statements.append(
            "INSERT INTO product_versions (product_id,version_no,publish_status,currency,currency_label,amount_label,rate_label,term_label,audience,core_features,materials,admission_rules,source,verification_note,effective_from) "
            f"SELECT id,1,'published',{text_expr(currency_code(product.get('currency','')))},{text_expr(product.get('currency'))},{text_expr(product.get('amountLabel'))},{text_expr(product.get('rateLabel'))},{text_expr(product.get('termLabel'))},{text_expr(product.get('audience'))},{json_expr(product.get('coreFeatures',[]))},{json_expr(product.get('materials',[]))},{json_expr(product.get('admissionRules',[]))},{text_expr(product.get('source'))},{text_expr(product.get('verificationNote'))},'2026-09-14' "
            f"FROM products WHERE workspace_id=@workspace_id AND legacy_key={text_expr(product['id'])} "
            "ON DUPLICATE KEY UPDATE publish_status='published',currency=VALUES(currency),currency_label=VALUES(currency_label),amount_label=VALUES(amount_label),rate_label=VALUES(rate_label),term_label=VALUES(term_label),audience=VALUES(audience),core_features=VALUES(core_features),materials=VALUES(materials),admission_rules=VALUES(admission_rules),source=VALUES(source),verification_note=VALUES(verification_note),effective_from=VALUES(effective_from);"
        )
    for document in payload["libraryDocuments"]:
        access = ACCESS_LEVEL.get(document.get("accessLevel"), "internal")
        statements.append(
            "INSERT INTO knowledge_documents (workspace_id,public_id,legacy_key,title,document_type,summary,source,access_level,agent_retrieval_enabled,status,current_version_no) "
            f"VALUES (@workspace_id,UUID(),{text_expr('catalog-'+document['id'])},{text_expr(document['name'])},{text_expr(document['type'])},{text_expr(document.get('summary'))},{text_expr(payload.get('sourceLabel'))},{text_expr(access)},TRUE,'active',0) "
            "ON DUPLICATE KEY UPDATE title=VALUES(title),document_type=VALUES(document_type),summary=VALUES(summary),source=VALUES(source),access_level=VALUES(access_level),agent_retrieval_enabled=TRUE,status='active';"
        )
    counts = payload["counts"]
    statements.append(
        "INSERT INTO catalog_import_batches (workspace_id,batch_key,manifest_sha256,source_label,status,counts_json,warnings_json,completed_at) "
        f"VALUES (@workspace_id,{text_expr(payload['batchKey'])},'{manifest_sha}',{text_expr(payload['sourceLabel'])},'completed',{json_expr(counts)},JSON_ARRAY(),'2026-09-14 00:00:00') "
        "ON DUPLICATE KEY UPDATE manifest_sha256=VALUES(manifest_sha256),source_label=VALUES(source_label),status='completed',counts_json=VALUES(counts_json),warnings_json=JSON_ARRAY(),completed_at=CURRENT_TIMESTAMP(3);"
    )
    statements.extend(["COMMIT;", "SELECT 'CATALOG_IMPORT_OK';"])
    return "\n".join(statements) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", type=Path)
    parser.add_argument("--execute", action="store_true", help="pipe SQL to the configured MySQL container")
    parser.add_argument("--container", default="jingfa-mysql")
    parser.add_argument("--sql-out", type=Path)
    args = parser.parse_args()
    raw = args.catalog.read_bytes()
    payload = json.loads(raw.decode("utf-8"))
    validate(payload)
    sql = sql_for(payload, hashlib.sha256(raw).hexdigest())
    if args.sql_out:
        args.sql_out.write_text(sql, encoding="utf-8")
    if not args.execute:
        print(json.dumps(payload["counts"], ensure_ascii=False))
        print("CATALOG_VALID")
        return 0
    command = ["docker", "exec", "-i", args.container, "sh", "-c", 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root']
    completed = subprocess.run(command, input=sql.encode("utf-8"), check=False)
    return completed.returncode


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"catalog import failed: {exc}", file=sys.stderr)
        raise SystemExit(2)
