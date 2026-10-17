"""Pull service text out of the saved services page into tools/scrape/services-extracted.json."""
import json
import re
from pathlib import Path

SCRAPE = Path(__file__).resolve().parent / "scrape"
HTML = SCRAPE / "ksl-services-scrape.html"
OUT = SCRAPE / "services-extracted.json"

POPUP_IDS = [
    "1900", "1903", "1906", "1908", "1912", "1916", "1915",
    "1922", "1921", "1928", "1927", "1991",
]

def clean_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_popup(html: str, popup_id: str) -> dict:
    marker = f'data-elementor-id="{popup_id}"'
    start = html.find(marker)
    if start == -1:
        return {"popupId": popup_id, "error": "not found"}
    next_popup = html.find('data-elementor-type="popup"', start + len(marker))
    block = html[start : next_popup if next_popup > start else start + 12000]
    paragraphs = []
    for raw in re.findall(r"<p[^>]*>(.*?)</p>", block, flags=re.I | re.S):
        text = clean_html(raw)
        if not text or text in ("Services", "Contact US"):
            continue
        paragraphs.append(text)
    title = paragraphs[0] if paragraphs else ""
    body = paragraphs[1:] if len(paragraphs) > 1 else []
    return {
        "popupId": popup_id,
        "title": title,
        "detail": "\n\n".join(body),
        "paragraphs": body,
    }


def main() -> None:
    html = HTML.read_text(encoding="utf-8", errors="ignore")
    items = [extract_popup(html, pid) for pid in POPUP_IDS]
    OUT.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(items)} items to {OUT}")


if __name__ == "__main__":
    main()
