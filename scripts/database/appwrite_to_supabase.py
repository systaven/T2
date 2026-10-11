#!/usr/bin/env python3
"""Read-only Appwrite export; resumable Supabase import with exact verification.

Python 3.10+ and an authenticated Appwrite CLI are sufficient to export/plan.
Direct import uses a scoped SUPABASE_ACCESS_TOKEN via the Management API.
SQL plans can alternatively be executed through an authorized Supabase MCP client.
Backups and generated data SQL contain private data. Keep them out of Git.
"""
import argparse
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

VERSION = 1
META_TABLE = "__appwrite_tables"
RESERVED = {"id", "created_at", "updated_at", "_appwrite_document"}
TYPE_MAP = {
    "string": "text", "varchar": "text", "text": "text",
    "mediumtext": "text", "longtext": "text", "email": "text",
    "url": "text", "ip": "text", "enum": "text",
    "integer": "bigint", "float": "double precision", "boolean": "boolean",
    "datetime": "timestamp with time zone",
}


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":"), allow_nan=False)


def checksum(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def qi(name):
    if not isinstance(name, str) or not name or "\x00" in name or len(name.encode()) > 63:
        raise ValueError("Invalid or overlong PostgreSQL identifier")
    return '"' + name.replace('"', '""') + '"'


def literal(value):
    # Dollar quoting preserves quotes, backslashes and SQL-looking user content.
    text = value if isinstance(value, str) else canonical(value)
    if "\x00" in text:
        raise ValueError("PostgreSQL text cannot contain NUL bytes")
    tag = "$aw_" + hashlib.sha256(text.encode()).hexdigest()[:16] + "$"
    while tag in text:
        tag = tag[:-1] + "x$"
    return tag + text + tag


def plpgsql(body):
    # Outer block delimiters must also be absent from all embedded user content.
    return "DO " + literal("BEGIN\n" + body + "\nEND;") + ";"


def write_private(path, text):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with path.open("x", encoding="utf-8") as f:
        os.chmod(path, 0o600)
        f.write(text)


def appwrite(args, directory):
    proc = subprocess.run(["appwrite", "tables-db", *args, "--raw", "--show-secrets"],
                          cwd=directory, capture_output=True, text=True)
    if proc.returncode:
        # CLI error bodies can contain data or credentials; avoid printing them.
        raise RuntimeError(f"Appwrite {args[0]} failed (exit {proc.returncode}); check CLI login/project")
    return json.loads(proc.stdout)


def paginated(command, list_key, args, directory):
    rows, cursor, total = [], None, None
    while True:
        flags = [command, *args, "--limit", "100", "--sort-asc", "$id"]
        if cursor:
            flags += ["--cursor-after", cursor]
        result = appwrite(flags, directory)
        if total is None:
            total = result["total"]
        if result["total"] != total:
            raise RuntimeError("Source count changed during export; retry when writes are quiet")
        page = result[list_key]
        rows.extend(page)
        if not page:
            break
        next_cursor = page[-1]["$id"]
        if next_cursor == cursor:
            raise RuntimeError("Non-advancing source cursor")
        cursor = next_cursor
    if len(rows) != total or len({r["$id"] for r in rows}) != len(rows):
        raise RuntimeError("Source pagination count/ID mismatch")
    return rows


def scan(database_id, directory):
    tables = paginated("list-tables", "tables", ["--database-id", database_id], directory)
    result = {}
    for item in tables:
        table_id = item["$id"]
        definition = appwrite(["get-table", "--database-id", database_id,
                              "--table-id", table_id], directory)
        rows = paginated("list-rows", "rows", ["--database-id", database_id,
                         "--table-id", table_id], directory)
        result[table_id] = {"definition": definition, "rows": rows}
    return result


def source_config(directory):
    cfg = json.loads((pathlib.Path(directory) / "appwrite.config.json").read_text())
    if not cfg.get("projectId") or not cfg.get("endpoint"):
        raise ValueError("Project config must identify projectId and endpoint")
    return {k: cfg[k] for k in ("projectId", "endpoint")}


def export(args):
    source = source_config(args.project_dir)
    databases = args.database or [d["$id"] for d in paginated(
        "list", "databases", [], args.project_dir)]
    if len(databases) != len(set(databases)):
        raise ValueError("Duplicate database selection")
    root = pathlib.Path(args.out)
    if root.exists():
        raise ValueError("Export directory already exists; use a new snapshot directory")
    root.mkdir(parents=True, mode=0o700)
    for database_id in databases:
        print(f"{database_id}: reading first snapshot", flush=True)
        first = scan(database_id, args.project_dir)
        print(f"{database_id}: checking a second full scan", flush=True)
        second = scan(database_id, args.project_dir)
        if checksum(first) != checksum(second):
            raise RuntimeError("Source content/schema changed between scans; no complete backup written")
        tables = {}
        for table_id, entry in first.items():
            tables[table_id] = {**entry, "count": len(entry["rows"]), "sha256": checksum(entry)}
        snapshot = {"version": VERSION, "complete": True,
                    "exportedAt": datetime.now(timezone.utc).isoformat(),
                    "source": {**source, "databaseId": database_id}, "tables": tables}
        # Validate every supported type before declaring the export usable.
        validate(snapshot)
        file = root / (database_id + ".json")
        if file.parent != root:
            raise ValueError("Unsafe database filename")
        write_private(file, json.dumps(snapshot, ensure_ascii=False, indent=2, allow_nan=False))
        print(f"{database_id}: {len(tables)} tables / {sum(t['count'] for t in tables.values())} rows exported", flush=True)


def normalized(table, row):
    if not isinstance(row.get("$id"), str) or not row["$id"]:
        raise ValueError("Missing or non-string row ID")
    for key in ("$createdAt", "$updatedAt"):
        date = datetime.fromisoformat(row[key].replace("Z", "+00:00"))
        if date.tzinfo is None:
            raise ValueError("Timestamp has no timezone")
    columns = {c["key"] for c in table["columns"]}
    if any(not k.startswith("$") and k not in columns for k in row):
        raise ValueError("Row contains an undeclared business field")
    result = {"id": row["$id"], "created_at": row["$createdAt"],
              "updated_at": row["$updatedAt"], "_appwrite_document": row}
    for column in table["columns"]:
        key = column["key"]
        value = row.get(key)
        if column["required"] and value is None:
            raise ValueError(f"Required field missing in {table['$id']}.{key}")
        if value is not None and column.get("array") and not isinstance(value, list):
            raise ValueError("Expected an array")
        result[key] = value
    return result


def validate(snapshot):
    if snapshot.get("version") != VERSION or snapshot.get("complete") is not True:
        raise ValueError("Incomplete or unsupported snapshot")
    if not snapshot.get("source", {}).get("projectId") or not snapshot["source"].get("databaseId"):
        raise ValueError("Snapshot has no source identity")
    for table_id, entry in snapshot["tables"].items():
        qi(table_id)
        table = entry["definition"]
        if table_id == META_TABLE or table["$id"] != table_id:
            raise ValueError("Invalid table identity")
        if entry["count"] != len(entry["rows"]) or entry["sha256"] != checksum(
                {"definition": table, "rows": entry["rows"]}):
            raise ValueError(f"Snapshot checksum/count mismatch: {table_id}")
        keys = [c["key"] for c in table["columns"]]
        if len(set(keys)) != len(keys) or set(keys) & RESERVED:
            raise ValueError("Duplicate/reserved business column; explicit mapping is required")
        for column in table["columns"]:
            qi(column["key"])
            if column["type"] not in TYPE_MAP or column.get("status") != "available":
                raise ValueError(f"Unsupported/pending column: {table_id}.{column['key']} ({column['type']})")
            if column.get("encrypt"):
                raise ValueError("Encrypted source columns require a separately designed key migration")
        for index in table.get("indexes", []):
            if index["type"] not in ("key", "unique") or index.get("status") != "available":
                raise ValueError("Unsupported/pending index; inspect before migrating")
            if not index["columns"] or any(c not in keys for c in index["columns"]):
                raise ValueError("Invalid index columns")
            for c, length in zip(index["columns"], index.get("lengths", [])):
                column = next(x for x in table["columns"] if x["key"] == c)
                if length and (TYPE_MAP[column["type"]] != "text" or column.get("array")):
                    raise ValueError("Prefix index only supported for scalar text")
        ids = set()
        for row in entry["rows"]:
            normalized(table, row)
            if row["$id"] in ids:
                raise ValueError("Duplicate source ID")
            ids.add(row["$id"])


def load_snapshot(file):
    snapshot = json.loads(pathlib.Path(file).read_text())
    validate(snapshot)
    return snapshot


def schema_name(snapshot, provided=None):
    name = provided or "appwrite_" + snapshot["source"]["databaseId"]
    if name in ("public", "auth", "storage", "realtime", "extensions", "vault", "supabase_migrations") or name.startswith("pg_"):
        raise ValueError("Use a dedicated, non-system destination schema")
    qi(name)
    return name


def qualified(schema, table):
    return qi(schema) + "." + qi(table)


def column_types(table):
    result = {"id": "text", "created_at": "timestamp with time zone",
              "updated_at": "timestamp with time zone", "_appwrite_document": "jsonb"}
    for column in table["columns"]:
        result[column["key"]] = TYPE_MAP[column["type"]] + ("[]" if column.get("array") else "")
    return result


def schema_sql(snapshot, schema):
    qschema = qi(schema)
    meta = qualified(schema, META_TABLE)
    source = snapshot["source"]
    identity = {k: source[k] for k in ("projectId", "databaseId", "endpoint")}
    parts = [plpgsql(f"""IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = {literal(schema)})
   AND to_regclass({literal(meta)}) IS NULL THEN
  RAISE EXCEPTION 'Destination schema exists without migration ownership metadata';
END IF;"""), f"""CREATE SCHEMA IF NOT EXISTS {qschema};
REVOKE ALL ON SCHEMA {qschema} FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA {qschema} TO service_role;
CREATE TABLE IF NOT EXISTS {meta} (
  table_id text PRIMARY KEY, source jsonb NOT NULL, definition jsonb NOT NULL
);
ALTER TABLE {meta} ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE {meta} FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE {meta} TO service_role;""", plpgsql(f"""IF EXISTS (SELECT 1 FROM {meta} WHERE source <> {literal(identity)}::jsonb) THEN
  RAISE EXCEPTION 'Destination belongs to a different Appwrite source';
END IF;""")]
    for table_id, entry in sorted(snapshot["tables"].items()):
        table, qtable = entry["definition"], qualified(schema, table_id)
        types = column_types(table)
        columns = ['"id" text PRIMARY KEY', '"created_at" timestamptz NOT NULL',
                   '"updated_at" timestamptz NOT NULL', '"_appwrite_document" jsonb NOT NULL']
        for column in table["columns"]:
            c = qi(column["key"])
            definition = c + " " + types[column["key"]] + (" NOT NULL" if column["required"] else "")
            if column.get("default") is not None:
                value = column["default"]
                # Let Postgres parse the default using its exact destination type.
                # Defaults cannot contain subqueries: use a SQL literal for scalar values.
                if column.get("array"):
                    raise ValueError("Array defaults require explicit mapping before migration")
                definition += " DEFAULT " + literal(str(value).lower() if isinstance(value, bool) else str(value)) + "::" + types[column["key"]]
            if not column.get("array"):
                if column.get("size") and TYPE_MAP[column["type"]] == "text":
                    definition += f" CHECK (char_length({c}) <= {int(column['size'])})"
                if column["type"] == "enum":
                    definition += f" CHECK ({c} IN ({', '.join(literal(v) for v in column['elements'])}))"
                for op, key in ((">=", "min"), ("<=", "max")):
                    if column["type"] in ("integer", "float") and column.get(key) is not None:
                        definition += f" CHECK ({c} {op} {literal(str(column[key]))}::{TYPE_MAP[column['type']]})"
            columns.append(definition)
        parts += [plpgsql(f"""IF EXISTS (SELECT 1 FROM {meta} WHERE table_id = {literal(table_id)}
  AND definition <> {literal(table)}::jsonb) THEN
  RAISE EXCEPTION 'Source schema changed; review a schema upgrade before resuming';
END IF;"""), f"CREATE TABLE IF NOT EXISTS {qtable} ({', '.join(columns)});",
        plpgsql(f"""IF (SELECT jsonb_object_agg(a.attname, format_type(a.atttypid, a.atttypmod))
    FROM pg_attribute a WHERE a.attrelid = {literal(qtable)}::regclass
    AND a.attnum > 0 AND NOT a.attisdropped) IS DISTINCT FROM {literal(types)}::jsonb THEN
  RAISE EXCEPTION 'Destination column/type mismatch';
END IF;"""), f"""ALTER TABLE {qtable} ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE {qtable} FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE {qtable} TO service_role;
INSERT INTO {meta} VALUES ({literal(table_id)}, {literal(identity)}::jsonb, {literal(table)}::jsonb)
ON CONFLICT (table_id) DO NOTHING;"""]
        for index in table.get("indexes", []):
            name = "aw_" + hashlib.sha256((table_id + ":" + index["key"]).encode()).hexdigest()[:24]
            expressions = []
            for pos, c in enumerate(index["columns"]):
                lengths, orders = index.get("lengths", []), index.get("orders", [])
                length = lengths[pos] if pos < len(lengths) else 0
                direction = orders[pos].upper() if pos < len(orders) else "ASC"
                if direction not in ("ASC", "DESC"):
                    raise ValueError("Unsupported index ordering")
                expr = f"left({qi(c)}, {int(length)})" if length else qi(c)
                expressions.append(expr + " " + direction)
            unique = "UNIQUE " if index["type"] == "unique" else ""
            parts.append(f"CREATE {unique}INDEX IF NOT EXISTS {qi(name)} ON {qtable} ({', '.join(expressions)});")
    return "\n".join(parts)


def import_sql(table, rows, schema):
    qtable = qualified(schema, table["$id"])
    documents = literal([normalized(table, row) for row in rows])
    return plpgsql(f"""-- A table lock closes the preflight/insert race. Identical rows are resumable.
LOCK TABLE {qtable} IN SHARE ROW EXCLUSIVE MODE;
IF EXISTS (
  SELECT 1 FROM jsonb_populate_recordset(NULL::{qtable}, {documents}::jsonb) s
  JOIN {qtable} t USING (id) WHERE to_jsonb(t) IS DISTINCT FROM to_jsonb(s)
) THEN RAISE EXCEPTION 'Existing destination ID has different data; refusing overwrite'; END IF;
INSERT INTO {qtable}
SELECT * FROM jsonb_populate_recordset(NULL::{qtable}, {documents}::jsonb)
ON CONFLICT (id) DO NOTHING;
IF EXISTS (
  SELECT 1 FROM jsonb_populate_recordset(NULL::{qtable}, {documents}::jsonb) s
  LEFT JOIN {qtable} t USING (id) WHERE t.id IS NULL OR to_jsonb(t) IS DISTINCT FROM to_jsonb(s)
) THEN RAISE EXCEPTION 'Batch field verification failed'; END IF;""")


def verify_sql(table, rows, schema):
    qtable = qualified(schema, table["$id"])
    documents = literal([normalized(table, row) for row in rows])
    return f"""WITH expected AS (
  SELECT * FROM jsonb_populate_recordset(NULL::{qtable}, {documents}::jsonb)
), compared AS (
  SELECT s.id AS source_id, t.id AS target_id,
    to_jsonb(s) IS NOT DISTINCT FROM to_jsonb(t) AS identical
  FROM expected s FULL JOIN {qtable} t USING (id)
)
SELECT {literal(table['$id'])}::text AS table_id,
  count(source_id)::integer AS source_count, count(target_id)::integer AS target_count,
  count(*) FILTER (WHERE source_id IS NOT NULL AND target_id IS NOT NULL AND identical)::integer AS matched,
  count(*) FILTER (WHERE source_id IS NOT NULL AND target_id IS NULL)::integer AS missing,
  count(*) FILTER (WHERE source_id IS NULL AND target_id IS NOT NULL)::integer AS extra,
  count(*) FILTER (WHERE source_id IS NOT NULL AND target_id IS NOT NULL AND NOT identical)::integer AS changed
FROM compared;"""


def verify_ok(result):
    return (result["source_count"] == result["target_count"] == result["matched"]
            and result["missing"] == result["extra"] == result["changed"] == 0)


def plan(args):
    snapshot = load_snapshot(args.snapshot)
    schema = schema_name(snapshot, args.schema)
    root = pathlib.Path(args.out)
    if root.exists():
        raise ValueError("Plan directory already exists")
    root.mkdir(parents=True, mode=0o700)
    write_private(root / "schema.sql", schema_sql(snapshot, schema))
    files, verification = [], []
    for table_id, entry in sorted(snapshot["tables"].items()):
        table, rows = entry["definition"], entry["rows"]
        for offset in range(0, len(rows), args.batch_size):
            file = f"data_{len(files):04d}.sql"
            write_private(root / file, import_sql(table, rows[offset:offset + args.batch_size], schema))
            files.append(file)
        file = f"verify_{len(verification):04d}.sql"
        write_private(root / file, verify_sql(table, rows, schema))
        verification.append(file)
    manifest = {"schema": schema, "snapshot_sha256": checksum(snapshot),
                "snapshot": str(pathlib.Path(args.snapshot).resolve()),
                "tables": len(snapshot["tables"]),
                "rows": sum(e["count"] for e in snapshot["tables"].values()),
                "data_files": files, "verify_files": verification}
    write_private(root / "plan.json", json.dumps(manifest, indent=2))
    print(f"Plan: {manifest['tables']} tables / {manifest['rows']} rows -> {schema}")


def query_api(project_ref, query):
    if not re.fullmatch(r"[a-z0-9]{20}", project_ref):
        raise ValueError("Invalid Supabase project ref")
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("Set a scoped SUPABASE_ACCESS_TOKEN locally; never paste it into chat")
    url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
    for attempt in range(3):
        req = urllib.request.Request(url, data=json.dumps({"query": query}).encode(),
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code not in (429, 502, 503, 504) or attempt == 2:
                raise RuntimeError(f"Management API HTTP {error.code}; inspect locally (error body suppressed)") from None
        except (TimeoutError, urllib.error.URLError):
            if attempt == 2:
                raise RuntimeError("Management API unavailable; batches can safely be resumed") from None
        time.sleep(2 ** attempt)


def run_plan(args):
    root = pathlib.Path(args.plan)
    manifest = json.loads((root / "plan.json").read_text())
    snapshot = load_snapshot(manifest["snapshot"])
    if checksum(snapshot) != manifest["snapshot_sha256"]:
        raise ValueError("Snapshot changed after plan generation")
    # Regenerate queries from the checked snapshot. Do not trust edited SQL files.
    schema = schema_name(snapshot, manifest["schema"])
    if args.command == "import":
        if not args.apply:
            raise ValueError("Import writes cloud data; pass --apply with the intended project ref")
        # Inspect schema + every existing destination row before any data insertion.
        query_api(args.project_ref, schema_sql(snapshot, schema))
        for entry in snapshot["tables"].values():
            result = query_api(args.project_ref, verify_sql(entry["definition"], entry["rows"], schema))[0]
            if result["extra"] or result["changed"]:
                raise RuntimeError("Destination has unexpected/conflicting data; no data batches were imported")
        for table_id, entry in snapshot["tables"].items():
            for offset in range(0, len(entry["rows"]), args.batch_size):
                query_api(args.project_ref, import_sql(entry["definition"],
                    entry["rows"][offset:offset + args.batch_size], schema))
            print(f"{table_id}: imported/resumed", flush=True)
    results = []
    for entry in snapshot["tables"].values():
        result = query_api(args.project_ref, verify_sql(entry["definition"], entry["rows"], schema))[0]
        if not verify_ok(result):
            raise RuntimeError(f"Full field verification failed: {result['table_id']}")
        results.append(result)
        print(f"{result['table_id']}: {result['matched']} exact matches", flush=True)
    print("All tables match the exported snapshot, including complete raw documents.")
    if args.report:
        write_private(args.report, json.dumps(results, indent=2))


def check_source(args):
    snapshot = load_snapshot(args.snapshot)
    if source_config(args.project_dir) != {k: snapshot["source"][k] for k in ("projectId", "endpoint")}:
        raise ValueError("Source project identity differs")
    actual = scan(snapshot["source"]["databaseId"], args.project_dir)
    expected = {k: {"definition": e["definition"], "rows": e["rows"]}
                for k, e in snapshot["tables"].items()}
    if checksum(actual) != checksum(expected):
        raise RuntimeError("Appwrite has changed since export; do not switch the application using this snapshot")
    print("Current Appwrite schema and every row still match the snapshot.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    ex = commands.add_parser("export", help="Read all selected databases twice; save private snapshots")
    ex.add_argument("--project-dir", required=True)
    ex.add_argument("--database", action="append", help="Repeat for multiple DBs; omit for all databases")
    ex.add_argument("--out", required=True)
    pl = commands.add_parser("plan", help="Generate reviewable schema, batch data and verification SQL")
    pl.add_argument("--snapshot", required=True)
    pl.add_argument("--schema")
    pl.add_argument("--out", required=True)
    pl.add_argument("--batch-size", type=int, default=100)
    for command in ("import", "verify"):
        cp = commands.add_parser(command)
        cp.add_argument("--plan", required=True)
        cp.add_argument("--project-ref", required=True)
        cp.add_argument("--batch-size", type=int, default=100)
        cp.add_argument("--report")
        if command == "import":
            cp.add_argument("--apply", action="store_true")
    check = commands.add_parser("check-source", help="Detect source changes since the snapshot")
    check.add_argument("--snapshot", required=True)
    check.add_argument("--project-dir", required=True)
    args = parser.parse_args()
    if hasattr(args, "batch_size") and not 1 <= args.batch_size <= 500:
        parser.error("batch size must be between 1 and 500")
    if args.command == "export":
        export(args)
    elif args.command == "plan":
        plan(args)
    elif args.command in ("import", "verify"):
        run_plan(args)
    else:
        check_source(args)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Stopped: {error}", file=sys.stderr)
        sys.exit(1)
