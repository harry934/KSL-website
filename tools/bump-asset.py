from pathlib import Path
root = Path(__file__).resolve().parents[1]
for path in root.glob("*.html"):
    data = path.read_bytes()
    updated = data.replace(b"20261022-16", b"20261022-18").replace(b"20261022-17", b"20261022-18")
    if updated != data:
        path.write_bytes(updated)
        print(path.name)
