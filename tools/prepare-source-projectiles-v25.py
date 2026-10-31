"""Deterministic, source-pixel-only preparation of four owned hapil1 boss props."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

SOURCE_COMMIT = "8629bd82fc1d8baf41183395c054fd83775e96df"
SOURCES = {
    "sloth-tissue": "dirty_tissue_projectile_bloodied.webp",
    "glutton-knife": "kitchen_knife_projectile_bloodied.webp",
    "greed-money": "paper_money_projectile_bloodied.webp",
    "greed-treasure": "golden_treasure_projectile_bloodied.webp",
}
SOURCE_BASE = "assets/generated-v31342-rc39/"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_root", type=Path)
    parser.add_argument("repository_root", type=Path)
    args = parser.parse_args()
    target = args.repository_root / "media/projectiles-hapil1-v25"
    target.mkdir(parents=True, exist_ok=True)
    rows = []
    sheet = Image.new("RGB", (1200, 370), "#111a28")
    draw = ImageDraw.Draw(sheet)
    for column, (name, relative) in enumerate(SOURCES.items()):
        raw = (args.source_root / relative).read_bytes()
        original = Image.open(args.source_root / relative).convert("RGBA")
        bbox = original.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        assert bbox is not None
        crop = (max(0, bbox[0] - 4), max(0, bbox[1] - 4),
                min(original.width, bbox[2] + 4), min(original.height, bbox[3] + 4))
        object_image = original.crop(crop)
        scale = 240 / max(object_image.size)
        size = tuple(max(1, round(side * scale)) for side in object_image.size)
        resized = object_image.resize(size, Image.Resampling.LANCZOS)
        runtime = Image.new("RGBA", (256, 256))
        runtime.alpha_composite(resized, ((256 - size[0]) // 2, (256 - size[1]) // 2))
        path = target / (name + ".webp")
        runtime.save(path, "WEBP", lossless=True, exact=True, method=6)
        decoded = Image.open(path).convert("RGBA")
        assert decoded.tobytes() == runtime.tobytes(), "Lossless RGBA readback"
        assert decoded.getpixel((128, 128))[3] >= 200, "Visible collision anchor"
        row = {"name": name, "sourceRepository": "kjb7876-lang/hapil1",
               "sourceCommit": SOURCE_COMMIT, "sourcePath": SOURCE_BASE + relative,
               "sourceBytes": len(raw), "sourceSHA256": sha(raw),
               "sourceGitBlob": hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest(),
               "sourceSize": list(original.size), "sourceAlpha8BBox": bbox,
               "crop": crop, "resizedObject": size, "runtimePath": str(path.relative_to(args.repository_root)),
               "runtimeSize": [256, 256], "runtimeBytes": path.stat().st_size,
               "runtimeSHA256": sha(path.read_bytes()), "decodedRGBA_SHA256": sha(decoded.tobytes()),
               "preparationCenter": [128, 128], "preparationCenterAlpha": decoded.getpixel((128, 128))[3],
               "renderPivotContract": "Actual fitted collision pivots are independently defined and tested in src/projectiles.js; this preparation centre is not a runtime collision promise.",
               "operation": "Own-source RGBA crop: alpha>8 bbox plus4sourcepx; uniform Lanczos fit240px inside256square; transparent padding; lossless WebP. No repaint or other-actor material."}
        rows.append(row)
        x = column * 300
        draw.text((x + 8, 7), name, fill="white")
        sheet.paste(decoded, (x + 22, 30), decoded)
        for n, pixels in enumerate([16, 24, 36, 48]):
            small = decoded.resize((pixels, pixels), Image.Resampling.LANCZOS)
            sheet.paste(small, (x + 20 + n * 65, 300), small)
            draw.text((x + 20 + n * 65, 352), str(pixels) + "px", fill="white")
    proof = args.repository_root / "docs/v25-projectile-pixels/runtime-source-props.jpg"
    proof.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(proof, quality=94)
    manifest = {"date": "2026-10-31", "scope": "Main-agent source-pixel preparation; no AI image generation or paid API.",
                "assets": rows, "proof": {"path": str(proof.relative_to(args.repository_root)), "sha256": sha(proof.read_bytes())}}
    out = args.repository_root / "docs/V25-RUNTIME-PROJECTILE-ASSETS-20261031.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"assets": len(rows), "runtimeBytes": sum(r["runtimeBytes"] for r in rows), "proof": str(proof)}))


if __name__ == "__main__":
    main()
