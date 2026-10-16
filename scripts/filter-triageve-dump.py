#!/usr/bin/env python3
"""Houd van een pg_dump alleen de triageve_-tabellen over."""
import sys

src, dst = sys.argv[1], sys.argv[2]
keep = False
lines = []
with open(src, encoding="utf-8", errors="replace") as handle:
    for line in handle:
        if line.startswith("COPY public.triageve_"):
            keep = True
        if keep:
            lines.append(line)
        if keep and line.strip() == "\\.":
            keep = False

with open(dst, "w", encoding="utf-8") as handle:
    handle.write("-- triagEve data-only\n")
    handle.writelines(lines)
