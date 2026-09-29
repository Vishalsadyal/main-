"""Download files missing from the saved ClinicMaster copy (licensed theme).

    python scripts/recover_clinicmaster_assets.py

Scans the home page of each variant in public/premiumthemes/clinicmaster/xhtml
plus every stylesheet it loads (recursively, including @imports and url()s),
and fetches any referenced local file that doesn't exist on disk from the
vendor's demo server. Only missing files are downloaded; nothing is
overwritten. Run scripts/build_medical_demos.py afterwards.
"""
import re
import sys
import time
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "premiumthemes" / "clinicmaster" / "xhtml"
LIVE = "https://clinicmaster.dexignzone.com/xhtml/"
VARIANTS = ["dentist", "medical", "pediatrics", "gynecology", "ophthalmology",
            "skincare", "plasticsurgery", "dieting", "fatloss"]

ATTR = re.compile(r'(?:href|src|data-src|data-bg)\s*=\s*["\']([^"\'#?]+)', re.I)
URLF = re.compile(r'url\(\s*["\']?([^"\')?#]+)', re.I)
IMPORT = re.compile(r'@import\s+(?:url\()?\s*["\']([^"\']+)["\']', re.I)
EXTS = (".css", ".js", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico",
        ".woff", ".woff2", ".ttf", ".eot", ".otf", ".mp4")


def local_refs(text: str, is_css: bool) -> list[str]:
    refs = IMPORT.findall(text) + URLF.findall(text) if is_css else ATTR.findall(text) + URLF.findall(text)
    out = []
    for ref in refs:
        ref = ref.strip()
        if not ref or ref.startswith(("http:", "https:", "//", "data:", "#", "%23", "mailto:", "tel:", "javascript:", "/")):
            continue
        path = unquote(urlparse(ref).path)
        if path.lower().endswith(EXTS):
            out.append(path)
    return out


def main() -> int:
    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0 (W3Tech asset recovery for licensed theme)"
    queue = [SRC / v / "index.html" for v in VARIANTS]
    seen: set[Path] = set()
    downloaded = failed = 0

    while queue:
        doc = queue.pop()
        if doc in seen or not doc.is_file():
            continue
        seen.add(doc)
        is_css = doc.suffix.lower() == ".css"
        text = doc.read_text(encoding="utf-8", errors="ignore")
        for ref in local_refs(text, is_css):
            target = (doc.parent / ref).resolve()
            try:
                rel = target.relative_to(SRC.resolve()).as_posix()
            except ValueError:
                continue  # points outside xhtml/ — not part of this theme build
            if not target.exists():
                url = urljoin(LIVE, rel)
                try:
                    resp = session.get(url, timeout=60)
                except requests.RequestException as exc:
                    print(f"  ! {rel}: {exc.__class__.__name__}")
                    failed += 1
                    continue
                if resp.status_code != 200 or not resp.content:
                    print(f"  ! {rel}: HTTP {resp.status_code}")
                    failed += 1
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(resp.content)
                downloaded += 1
                print(f"  + {rel} ({len(resp.content) // 1024} KB)")
                time.sleep(0.05)  # be polite to the vendor's server
            if target.suffix.lower() == ".css" and target.exists():
                queue.append(target)

    print(f"\nDownloaded {downloaded} missing files, {failed} could not be fetched.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
