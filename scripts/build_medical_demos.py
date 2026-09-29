"""Build runnable ClinicMaster medical demo pages into public/demos/medical/.

    python scripts/build_medical_demos.py

Source: public/premiumthemes/clinicmaster/xhtml (home page of each variant).
Output:
    public/demos/medical/<variant>/         self-contained: index.html, assets/, images/
    public/demos/medical/index.html         gallery of all variants

Fixes applied to the saved theme pages so they work under Next.js:
  * relative asset paths -> absolute /demos/medical/... paths (clean URLs work)
  * Cloudflare email obfuscation decoded back to plain mailto: links
  * Cloudflare-only scripts removed (they only exist on dexignzone.com)
  * missing Feather / Flaticon icon fonts mapped to Font Awesome 6 (CDN)
  * links to inner pages that were not part of the purchase -> "#"
  * robots noindex, canonical removed (these are showcase copies)
"""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "premiumthemes" / "clinicmaster" / "xhtml"
DEST = ROOT / "public" / "demos" / "medical"
URL = "/demos/medical"

VARIANTS = {
    # slug: (display name, menu thumbnail in assets/images/demo/)
    "dentist": ("Dentist", "home2.jpg"),
    "medical": ("Medical / General Clinic", "home1.jpg"),
    "pediatrics": ("Pediatrics", "home4.jpg"),
    "gynecology": ("Gynecology", "home5.jpg"),
    "ophthalmology": ("Ophthalmology / Eye Care", "home8.jpg"),
    "skincare": ("Skin Care / Dermatology", "home3.jpg"),
    "plasticsurgery": ("Plastic Surgery", "home9.jpg"),
    "dieting": ("Dieting / Nutrition", "home6.jpg"),
    "fatloss": ("Fat Loss / Weight Loss", "home7.jpg"),
}

# Font Awesome 6 Free (solid unless noted) replacements for the icon fonts
# that are missing from the saved theme copy.
ICON_MAP = {
    "feather.icon-arrow-right": "f061",
    "feather.icon-arrow-left": "f060",
    "feather.icon-arrow-up-right": "f061; transform: rotate(-45deg)",
    "feather.icon-arrow-right-circle": "f0a9",
    "feather.icon-calendar": "f073",
    "feather.icon-mail": "f0e0",
    "feather.icon-phone-call": "f095",
    "feather.icon-phone": "f095",
    "feather.icon-shopping-cart": "f07a",
    "feather.icon-clock": "f017",
    "feather.icon-x": "f00d",
    "feather.icon-user": "f007",
    "feather.icon-plus": "f067",
    "feather.icon-map-pin": "f3c5",
    "feather.icon-heart": "f004",
    "feather.icon-heart-on": "f004",
    "feather.icon-chevron-right": "f054",
    "feather.icon-play": "f04b",
    "flaticon-check": "f00c",
    "flaticon-doctor": "f0f0",
    "flaticon-drugs": "f484",
    "flaticon-hand-holding-usd": "f4c0",
    "flaticon-left-quote": "f10d",
    "flaticon-list": "f03a",
    "flaticon-medical-symbol": "f479",
    "flaticon-message": "f27a",
    "flaticon-stethoscope": "f0f1",
}

FA_CDN = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"

# True once recover_clinicmaster_assets.py has fetched the theme's own icon fonts.
ICON_FONTS_PRESENT = all(
    (SRC / "assets" / "icons" / p).is_file()
    for p in ("feather/css/iconfont.css", "flaticon/flaticon.css", "fontawesome/css/all.min.css")
)


def icon_css() -> str:
    rules = [
        '.feather::before, [class^="flaticon-"]::before, [class*=" flaticon-"]::before {'
        ' font-family: "Font Awesome 6 Free"; font-weight: 900; font-style: normal;'
        " display: inline-block; line-height: 1; -webkit-font-smoothing: antialiased; }"
    ]
    for cls, value in ICON_MAP.items():
        glyph, _, extra = value.partition(";")
        extra = f"{extra.strip()};" if extra else ""
        rules.append(f'.{cls}::before {{ content: "\\{glyph}"; {extra} }}')
    return "\n".join(rules)


def decode_cf_email(encoded: str) -> str:
    key = int(encoded[:2], 16)
    return "".join(chr(int(encoded[i:i + 2], 16) ^ key) for i in range(2, len(encoded), 2))


def fix_emails(html: str) -> str:
    # <a href="/cdn-cgi/l/email-protection#HEX">...<span class="__cf_email__" data-cfemail="HEX">[email protected]</span></a>
    html = re.sub(
        r'href="/cdn-cgi/l/email-protection#([0-9a-f]+)"',
        lambda m: f'href="mailto:{decode_cf_email(m.group(1))}"',
        html,
    )
    return re.sub(
        r'<span class="__cf_email__" data-cfemail="([0-9a-f]+)">\[email&#160;protected\]</span>',
        lambda m: decode_cf_email(m.group(1)),
        html,
    )


def transform(html: str, variant: str) -> str:
    base = f"{URL}/{variant}"
    html = fix_emails(html)
    # Cloudflare-only scripts
    html = re.sub(r'<script[^>]*src="/cdn-cgi/[^"]*"[^>]*></script>', "", html)
    # SEO: showcase copies must not compete with the real site
    html = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex, nofollow">', html)
    html = re.sub(r'\s*<!-- CANONICAL URL -->\s*<link rel="canonical"[^>]*>', "", html)
    # Each variant has its own copy of the theme assets
    html = html.replace('"../assets/', f'"{base}/assets/')
    for other in VARIANTS:
        html = html.replace(f'"../{other}/index.html"', f'"{URL}/{other}"')
    # Variant-local images (attributes and inline style url())
    html = re.sub(r'((?:src|href|data-src)=")images/', rf"\1{base}/images/", html)
    html = re.sub(r"url\((['\"]?)images/", rf"url(\1{base}/images/", html)
    # Home page links
    html = html.replace('href="index.html"', f'href="{base}"')
    # Inner pages were not included in the saved copy -> keep the visitor on the page
    html = re.sub(r'href="(?!https?:|/|#|mailto:|tel:|javascript:)[^"]+\.html"', 'href="#"', html)
    # PHP form handlers can't run on Next.js/Vercel
    html = re.sub(r'action="[^"]*\.php"', 'action="#" onsubmit="return false;"', html)
    # Theme bug: some variants' CSS uses Poppins without loading it (falls back to Arial)
    if "family=Poppins" not in html:
        html = html.replace(
            "</head>",
            '\t<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">\n</head>',
            1,
        )
    if ICON_FONTS_PRESENT:
        return html
    # Fallback: Font Awesome from CDN + mapping for the missing icon fonts
    head_extra = (
        f'\t<link rel="stylesheet" href="{FA_CDN}" referrerpolicy="no-referrer">\n'
        f'\t<link rel="stylesheet" href="{base}/assets/css/icon-fix.css">\n'
    )
    return html.replace("</head>", head_extra + "</head>", 1)


def gallery_html() -> str:
    cards = "\n".join(
        f'''      <a class="card" href="{URL}/{slug}">
        <img src="{URL}/{slug}/assets/images/demo/{thumb}" alt="{name} template preview" loading="lazy">
        <span>{name}</span>
      </a>'''
        for slug, (name, thumb) in VARIANTS.items()
    )
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Medical Website Templates</title>
  <style>
    body {{ margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f4f6fb; color: #0f172a; }}
    main {{ max-width: 1200px; margin: 0 auto; padding: 40px 16px; }}
    h1 {{ margin: 0 0 6px; }} p {{ margin: 0 0 28px; color: #64748b; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }}
    .card {{ display: flex; flex-direction: column; background: #fff; border-radius: 14px; overflow: hidden;
             text-decoration: none; color: inherit; box-shadow: 0 4px 20px rgba(15, 23, 42, .06); transition: transform .15s; }}
    .card:hover {{ transform: translateY(-3px); }}
    .card img {{ width: 100%; height: 190px; object-fit: cover; object-position: top; background: #e2e8f0; }}
    .card span {{ padding: 14px 16px; font-weight: 600; }}
  </style>
</head>
<body>
  <main>
    <h1>Medical Website Templates</h1>
    <p>{len(VARIANTS)} home page designs (ClinicMaster).</p>
    <div class="grid">
{cards}
    </div>
  </main>
</body>
</html>
"""


def copy_assets(dest: Path, variant: str) -> None:
    """Give one variant its own copy of the theme assets, with fixed CSS paths."""
    shutil.copytree(SRC / "assets", dest)
    style = dest / "css" / "style.css"
    css = style.read_text(encoding="utf-8")
    # Drop @imports whose file is missing (run recover_clinicmaster_assets.py
    # to fetch them); missing icon fonts are covered by icon-fix.css.
    css = re.sub(
        r'@import "([^"]+)";\s*',
        lambda m: m.group(0) if (style.parent / m.group(1)).is_file() else "",
        css,
    )
    # style.css refers to ../../<variant>/images/: this variant's own images stay
    # relative, other variants' images get absolute URLs.
    css = css.replace(f"../../{variant}/images/", "../../images/")
    for other in VARIANTS:
        css = css.replace(f"../../{other}/images/", f"{URL}/{other}/images/")
    style.write_text(css, encoding="utf-8")
    if not ICON_FONTS_PRESENT:
        (dest / "css" / "icon-fix.css").write_text(icon_css() + "\n", encoding="utf-8")


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f"Source not found: {SRC}")
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)

    for variant in VARIANTS:
        src_dir, out_dir = SRC / variant, DEST / variant
        out_dir.mkdir()
        copy_assets(out_dir / "assets", variant)
        if (src_dir / "images").is_dir():
            shutil.copytree(src_dir / "images", out_dir / "images")
        html = (src_dir / "index.html").read_text(encoding="utf-8")
        (out_dir / "index.html").write_text(transform(html, variant), encoding="utf-8")
        print(f"built {URL}/{variant}")

    (DEST / "index.html").write_text(gallery_html(), encoding="utf-8")
    size = sum(f.stat().st_size for f in DEST.rglob("*") if f.is_file())
    print(f"gallery {URL}  |  total {size / 1_048_576:.1f} MB")


if __name__ == "__main__":
    main()
