#!/usr/bin/env python3
"""Schrijf een IPv4-database-URL naar stdout. De URL zelf wordt niet gelogd."""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

ref = os.environ["PROJECT_REF"]
token = os.environ["SUPABASE_ACCESS_TOKEN"]
password = os.environ["SUPABASE_DB_PASSWORD"]
api = f"https://api.supabase.com/v1/projects/{ref}/config/database/pooler"
request = urllib.request.Request(
    api,
    headers={"Authorization": f"Bearer {token}", "User-Agent": "triageve-setup"},
)
try:
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.load(response)
except urllib.error.HTTPError as err:
    body = err.read().decode("utf-8", "replace")[:500]
    sys.stderr.write(
        "Pooler ophalen mislukt. Zet bij het Supabase-token Connection Pooling op Lezen.\n"
        + body
        + "\n"
    )
    sys.exit(1)

if isinstance(data, dict):
    data = data.get("data") or data.get("items") or [data]
primaries = [item for item in data if str(item.get("database_type", "PRIMARY")).upper() == "PRIMARY"] or list(data)
session = next((item for item in primaries if item.get("pool_mode") == "session"), None)
chosen = session or (primaries[0] if primaries else None)
if not chosen or not chosen.get("db_host"):
    sys.stderr.write("Geen pooler-adres gevonden.\n")
    sys.exit(1)

host = chosen["db_host"]
user = chosen.get("db_user") or f"postgres.{ref}"
database = chosen.get("db_name") or "postgres"
sys.stderr.write(f"Pooler {host} poort 5432\n")
sys.stdout.write(
    "postgresql://{user}:{password}@{host}:5432/{database}".format(
        user=urllib.parse.quote(user, safe=""),
        password=urllib.parse.quote(password, safe=""),
        host=host,
        database=database,
    )
)
