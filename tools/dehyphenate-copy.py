#!/usr/bin/env python3
"""Replace hyphens/dashes in user-facing copy (not URLs, slugs, or HTML attributes)."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SKIP_JSON_KEYS = frozenset(
    {
        "slug",
        "href",
        "url",
        "id",
        "image",
        "img",
        "src",
        "thumbnail",
        "file",
        "path",
        "anchor",
    }
)


def is_urlish(value: str) -> bool:
    v = value.strip()
    return (
        v.startswith("http://")
        or v.startswith("https://")
        or v.startswith("tel:")
        or v.startswith("mailto:")
        or v.startswith("/")
        or ".pdf" in v.lower()
        or ".docx" in v.lower()
    )


def polish_copy(text: str) -> str:
    if not text or not any(c in text for c in "-\u2013\u2014"):
        return text
    text = text.replace("+254-726-277-377", "+254 726 277 377")
    text = text.replace("+254-700-278-278", "+254 700 278 278")
    text = text.replace("9706-00200", "9706 00200")
    text = text.replace(" \u2013 Kenya Shipyards Limited", " | Kenya Shipyards Limited")
    text = text.replace("\u2014", ", ")
    text = text.replace(" \u2013 ", " to ")
    text = text.replace("University \u2013 Kenya", "University, Kenya")
    text = re.sub(r"(\d{4})\u2013(\d{4})", r"\1 to \2", text)
    text = re.sub(r"(?<=[A-Za-z])-(?=[A-Za-z])", " ", text)
    text = re.sub(r"  +", " ", text)
    return text


def process_html(content: str) -> str:
    parts = re.split(r"(<[^>]+>)", content)
    out: list[str] = []
    for part in parts:
        if part.startswith("<"):
            out.append(part)
        else:
            out.append(polish_copy(part))
    return "".join(out)


def walk_json(node, key: str | None = None):
    if isinstance(node, dict):
        for k, v in node.items():
            yield from walk_json(v, k)
    elif isinstance(node, list):
        for item in node:
            yield from walk_json(item, key)
    elif isinstance(node, str):
        if key and key.lower() in SKIP_JSON_KEYS:
            return
        if is_urlish(node):
            return
        yield node


def process_json_file(path: Path) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))

    def mutate(obj, key: str | None = None):
        if isinstance(obj, dict):
            for k, v in obj.items():
                mutate(v, k)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                mutate(item, key)
        elif isinstance(obj, str):
            if key and key.lower() in SKIP_JSON_KEYS:
                return
            if is_urlish(obj):
                return
            new = polish_copy(obj)
            if new != obj:
                # parent mutation needed - use wrapper
                pass

    changed = False

    def mutate_inplace(parent, key_or_index):
        nonlocal changed
        if isinstance(parent, dict):
            for k in list(parent.keys()):
                v = parent[k]
                if isinstance(v, (dict, list)):
                    mutate_inplace(v, k)
                elif isinstance(v, str):
                    if k.lower() in SKIP_JSON_KEYS or is_urlish(v):
                        continue
                    new = polish_copy(v)
                    if new != v:
                        parent[k] = new
                        changed = True
        elif isinstance(parent, list):
            for i, v in enumerate(parent):
                if isinstance(v, (dict, list)):
                    mutate_inplace(v, i)
                elif isinstance(v, str):
                    if is_urlish(v):
                        continue
                    new = polish_copy(v)
                    if new != v:
                        parent[i] = new
                        changed = True

    mutate_inplace(data, None)
    if changed:
        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    return changed


def process_lang_js(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text

    def fix_string(m: re.Match) -> str:
        quote = m.group(1)
        body = m.group(2)
        if "http" in body or "ksl-" in body or "data-" in body:
            return m.group(0)
        new = polish_copy(body)
        return quote + new + quote

    text = re.sub(r'(")((?:\\.|[^"\\])*)(")', lambda m: fix_string(m) if m.start() > 0 else m.group(0), text)
    # Simpler: only replace inside SW object string literals line by line
    lines = []
    for line in orig.splitlines():
        if re.search(r'^\s+"[^"]+":\s+"', line) or re.search(r'^\s+"[^"]+",?\s*$', line):
            line = re.sub(
                r':\s+"((?:\\.|[^"\\])*)"',
                lambda m: ': "' + polish_copy(m.group(1)).replace('"', '\\"') + '"',
                line,
            )
            line = re.sub(
                r'^(\s+)"((?:\\.|[^"\\])*)",?\s*$',
                lambda m: m.group(1) + '"' + polish_copy(m.group(2)).replace('"', '\\"') + '",'
                if polish_copy(m.group(2)) != m.group(2)
                else m.group(0),
                line,
            )
        lines.append(line)
    text = "\n".join(lines)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    html_changed = 0
    for path in sorted(ROOT.glob("*.html")):
        orig = path.read_text(encoding="utf-8")
        new = process_html(orig)
        if new != orig:
            path.write_text(new, encoding="utf-8")
            html_changed += 1

    json_changed = 0
    for path in sorted((ROOT / "data").glob("*.json")):
        if "scrape" in path.name or "extracted" in path.name:
            continue
        if process_json_file(path):
            json_changed += 1

    lang_path = ROOT / "js" / "lang.js"
    lang_changed = process_lang_js(lang_path)

    print(f"HTML files updated: {html_changed}")
    print(f"JSON files updated: {json_changed}")
    print(f"lang.js updated: {lang_changed}")


if __name__ == "__main__":
    main()
