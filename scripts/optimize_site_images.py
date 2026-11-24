#!/usr/bin/env python3
"""Optimize only real website images without changing their composition or crop.

Run from the repository with: python scripts/optimize_site_images.py
Requires Pillow. Original files remain in place for rollback.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)

# Original assets that are actually referenced by HTML/CSS.
GALLERY = (
    "terasse2.jpeg",
    "terasse1.jpg",
    "guenezimmer.jpg",
    "rundetischinnen.jpg",
    "kammienzimmer.jpg",
    "kammienzimmervorne.png",
)
OTHER = {
    "zumloewenlogo.png": {"max": (800, 800), "lossless": True},
    "haupttuer.jpeg": {"max": (1900, 1500), "quality": 86},
    "insta.png": {"max": (180, 180), "lossless": True},
    "facebook.png": {"max": (180, 180), "lossless": True},
}
PAGES = ("index.html", "speisekarte.html", "impressum.html", "datenschutz.html")
mapping = {}
report = []
dimensions = {}


def read_image(filename: str) -> Image.Image:
    path = ROOT / filename
    if not path.exists():
        raise FileNotFoundError(f"Missing source image: {filename}")
    with Image.open(path) as opened:
        img = ImageOps.exif_transpose(opened)
        transparent = "A" in img.getbands() or "transparency" in img.info
        # Preserve transparent logos; convert unusual color modes to standard RGB.
        return img.convert("RGBA" if transparent else "RGB")


def save_webp(img: Image.Image, path: Path, size: tuple[int, int],
              quality: int = 87, lossless: bool = False) -> tuple[int, int, int]:
    resized = img.copy()
    resized.thumbnail(size, Image.Resampling.LANCZOS)
    resized.save(path, "WEBP", quality=quality, lossless=lossless, method=6)
    return resized.width, resized.height, path.stat().st_size


for source in GALLERY:
    original_size = (ROOT / source).stat().st_size
    img = read_image(source)
    stem = Path(source).stem
    small = OUT / f"{stem}-small.webp"
    large = OUT / f"{stem}-large.webp"
    sw, sh, sb = save_webp(img, small, (800, 1000), quality=87)
    lw, lh, lb = save_webp(img, large, (1800, 1800), quality=87)
    if lb >= original_size:
        raise RuntimeError(f"Unexpectedly larger gallery file: {source}")
    mapping[source] = {
        "src": large.relative_to(ROOT).as_posix(),
        "small": small.relative_to(ROOT).as_posix(),
        "width": lw, "height": lh, "small_width": sw,
        "small_height": sh, "original_bytes": original_size,
        "optimized_bytes": lb, "small_bytes": sb,
        "type": "gallery",
    }
    report.append({"original": source, **mapping[source]})

for source, opts in OTHER.items():
    original_size = (ROOT / source).stat().st_size
    img = read_image(source)
    output = OUT / f"{Path(source).stem}.webp"
    w, h, b = save_webp(img, output, opts["max"], opts.get("quality", 90), opts.get("lossless", False))
    # Keep tiny images in their original form if WebP cannot meaningfully improve them.
    if b >= original_size * 0.97:
        output.unlink()
        dimensions[source] = (img.width, img.height)
        report.append({"original": source, "kept_original": True, "original_bytes": original_size})
        continue
    mapping[source] = {
        "src": output.relative_to(ROOT).as_posix(), "width": w, "height": h,
        "original_bytes": original_size, "optimized_bytes": b, "type": "single",
    }
    report.append({"original": source, **mapping[source]})

# The pizza image is already WebP and only about 74 KB: don't recompress it.
with Image.open(ROOT / "logopizza.webp") as src_img:
    dimensions["logopizza.webp"] = (src_img.width, src_img.height)

# Small high-quality browser icon; the full-resolution logo remains intact.
logo = read_image("zumloewenlogo.png")
logo.thumbnail((96, 96), Image.Resampling.LANCZOS)
favicon = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
favicon.alpha_composite(logo.convert("RGBA"), ((96 - logo.width) // 2, (96 - logo.height) // 2))
favicon.save(OUT / "favicon-96.png", optimize=True)

IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
SRC_ATTR = re.compile(r'\bsrc="([^"]+)"')
WIDTH_ATTR = re.compile(r'\bwidth="[^"]*"')
HEIGHT_ATTR = re.compile(r'\bheight="[^"]*"')


def rewrite_image(match: re.Match[str]) -> str:
    tag = match.group(0)
    srcmatch = SRC_ATTR.search(tag)
    if not srcmatch:
        return tag
    source = srcmatch.group(1)
    if source in mapping:
        entry = mapping[source]
        replacement = f'src="{entry["src"]}"'
        if entry["type"] == "gallery":
            # Browser downloads the smaller version for narrow screens.
            variant = (
                f' srcset="{entry["small"]} {entry["small_width"]}w, '
                f'{entry["src"]} {entry["width"]}w"'
                ' sizes="(max-width: 768px) 100vw, 900px"'
            )
            replacement += variant
        tag = tag.replace(srcmatch.group(0), replacement, 1)
        w, h = entry["width"], entry["height"]
    elif source in dimensions:
        w, h = dimensions[source]
    else:
        return tag  # SVG/navigation/map assets stay in SVG.
    attributes = ""
    if not WIDTH_ATTR.search(tag):
        attributes += f' width="{w}"'
    if not HEIGHT_ATTR.search(tag):
        attributes += f' height="{h}"'
    if ' loading=' not in tag:
        # Carousel photos need to be ready for the automatic slideshow.
        loading = "eager" if source in GALLERY or source == "zumloewenlogo.png" else "lazy"
        attributes += f' loading="{loading}"'
    if ' decoding=' not in tag:
        attributes += ' decoding="async"'
    if ' fetchpriority=' not in tag and source in GALLERY:
        attributes += ' fetchpriority="low"'
    return tag[:-1] + attributes + ">"


for page in PAGES:
    path = ROOT / page
    html = path.read_text(encoding="utf-8")
    html = IMG_TAG.sub(rewrite_image, html)
    # 96px PNG icon avoids requesting the much larger original restaurant logo.
    html = html.replace('href="zumloewenlogo.png" type="image/png"',
                        'href="assets/img/favicon-96.png" type="image/png"')
    path.write_text(html, encoding="utf-8", newline="")

css_path = ROOT / "style.css"
css = css_path.read_text(encoding="utf-8")
if "haupttuer.jpeg" in mapping:
    css = css.replace('url("haupttuer.jpeg")', f'url("{mapping["haupttuer.jpeg"]["src"]}")')
css_path.write_text(css, encoding="utf-8", newline="")

# Verify every local image referenced by HTML and CSS really exists.
for page in PAGES:
    content = (ROOT / page).read_text(encoding="utf-8")
    for src in re.findall(r'<img\b[^>]*\bsrc="([^"]+)"', content):
        if not (ROOT / src).is_file():
            raise FileNotFoundError(f"Broken image reference in {page}: {src}")
for src in re.findall(r'url\("([^"]+)"\)', (ROOT / "style.css").read_text(encoding="utf-8")):
    if not (ROOT / src).is_file():
        raise FileNotFoundError(f"Broken CSS image: {src}")
for page in PAGES:
    if not (ROOT / page).read_text(encoding="utf-8").count('src="assets/img/zumloewenlogo.webp"') <= 1:
        raise RuntimeError(f"Unexpected repeated logo in {page}")

report_path = OUT / "optimization-report.json"
report_path.write_text(json.dumps({
    "note": "Original files retained; SVGs and existing logopizza.webp kept unchanged.",
    "images": report,
    "favicon": "assets/img/favicon-96.png",
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
old_total = sum(x.get("original_bytes", 0) for x in report)
new_total = sum(x.get("optimized_bytes", x.get("original_bytes", 0)) for x in report)
print(f"Optimized {len(mapping)} image files, original bytes {old_total}, now {new_total}; "
      f"saved {(1-new_total/old_total)*100:.1f}%.")
print(f"Report: {report_path.relative_to(ROOT)}")
