import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICES = ROOT / "data" / "services.json"
EXTRACTED = ROOT / "data" / "services-extracted.json"

POPUP_ORDER = [
    "1900", "1903", "1906", "1908", "1912", "1916", "1915",
    "1922", "1921", "1928", "1927", "1991",
]


def clean_title(raw: str) -> str:
    t = re.sub(r"^Services\s+", "", raw or "", flags=re.I).strip()
    return html.unescape(t)


def clean_text(text: str) -> str:
    text = html.unescape(text or "")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r" &nbsp; ", " ", text)
    return text.strip()


def main() -> None:
    data = json.loads(SERVICES.read_text(encoding="utf-8"))
    extracted = {x["popupId"]: x for x in json.loads(EXTRACTED.read_text(encoding="utf-8"))}
    items = data["items"]
    if len(items) != len(POPUP_ORDER):
        raise SystemExit(f"Expected {len(POPUP_ORDER)} items, got {len(items)}")
    for i, pid in enumerate(POPUP_ORDER):
        src = extracted[pid]
        item = items[i]
        title = clean_title(src.get("title", ""))
        if title:
            item["title"] = title
        paragraphs = [clean_text(p) for p in src.get("paragraphs", []) if clean_text(p)]
        if paragraphs:
            item["detail"] = "\n\n".join(paragraphs)
        else:
            detail = clean_text(src.get("detail", ""))
            if detail:
                item["detail"] = detail
        if item.get("excerpt"):
            item["excerpt"] = clean_text(item["excerpt"])
        item["sourcePopupId"] = pid
    data["source"] = "http://10.104.4.139/services/ (Elementor popups)"
    SERVICES.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Updated", SERVICES)


if __name__ == "__main__":
    main()
