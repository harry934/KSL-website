import json
import os
import re
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRAPE = os.path.join(ROOT, "data", "ksl-gallery-scrape.html")
OUT_DIR = os.path.join(ROOT, "img", "ksl", "gallery")
MANIFEST = os.path.join(ROOT, "data", "gallery.json")

CAT_MAP = {"0": "all", "1": "kisumu", "2": "mombasa", "3": "krc"}


def main():
    html = open(SCRAPE, encoding="utf-8", errors="ignore").read()
    pattern = re.compile(
        r'<a class="e-gallery-item[^"]*"[^>]*data-e-gallery-tags="(\d+)"[^>]*href="([^"]+)"[^>]*data-elementor-lightbox-title="([^"]*)"'
    )
    items = []
    seen = set()
    for tag, url, title in pattern.findall(html):
        if url in seen:
            continue
        if any(x in url.lower() for x in ("logo", "untitled-2", "cropped-ksl")):
            continue
        seen.add(url)
        base = os.path.basename(urllib.parse.unquote(url))
        name = re.sub(r"[^a-zA-Z0-9._-]+", "-", base).strip("-").lower()
        if not name:
            name = f"gallery-{len(items) + 1}.jpg"
        local = f"img/ksl/gallery/{name}"
        items.append(
            {
                "src": local,
                "title": title or "Kenya Shipyards Limited",
                "category": CAT_MAP.get(tag, "all"),
                "tags": [],
                "source": url,
            }
        )

    os.makedirs(OUT_DIR, exist_ok=True)
    for i, item in enumerate(items):
        dest = os.path.join(ROOT, item["src"].replace("/", os.sep))
        if os.path.isfile(dest) and os.path.getsize(dest) > 1000:
            continue
        url = item["source"]
        # prefer smaller file for web: try -1024x683 variant
        thumb_url = url
        if "-scaled" in url:
            thumb_url = re.sub(r"-scaled(?=\.)", "-1024x683", url)
        elif url.endswith(".jpg") and "-1024" not in url:
            thumb_url = url.replace(".jpg", "-1024x683.jpg")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://kenyashipyards.co.ke/gallery/",
        }

        def fetch(target, path):
            req = urllib.request.Request(target, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
            with open(path, "wb") as out:
                out.write(data)

        try:
            fetch(thumb_url, dest)
        except Exception:
            try:
                fetch(url, dest)
            except Exception as exc:
                print("skip", url, exc)
                item["src"] = ""

    items = [x for x in items if x.get("src")]
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump({"photos": items}, fh, indent=2)
    print(f"wrote {len(items)} items to {MANIFEST}")


if __name__ == "__main__":
    main()
