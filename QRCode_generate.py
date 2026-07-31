"""
Generate booth QR PNG files for all teams from a CSV file.

CSV format:
name,slug,booth_number
Team Alpha,team-alpha,A1

Usage:
  python QRCode_generate.py teams.csv
"""

import csv
import os
import sys
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

APP_BASE_URL = "https://your-app.vercel.app"
destination_folder = Path(__file__).resolve().parent / "QR"


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "teams.example.csv"
    destination_folder.mkdir(parents=True, exist_ok=True)

    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        teams = list(csv.DictReader(f))

    if not teams:
        print("No teams found in CSV.")
        sys.exit(1)

    for row in teams:
        slug = (row.get("slug") or "").strip()
        name = (row.get("name") or slug).strip()
        if not slug:
            continue

        qr_content = f"{APP_BASE_URL.rstrip('/')}/vote?group={slug}"

        qr = qrcode.QRCode(box_size=10, border=4)
        qr.add_data(qr_content)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

        extra_height = 40
        canvas = Image.new("RGB", (qr_img.width, qr_img.height + extra_height), "white")
        canvas.paste(qr_img, (0, 0))

        draw = ImageDraw.Draw(canvas)
        font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), name, font=font)
        text_w = bbox[2] - bbox[0]
        draw.text(((qr_img.width - text_w) // 2, qr_img.height + 5), name, fill="black", font=font)

        filepath = destination_folder / f"{slug}.png"
        canvas.save(filepath)
        print(f"Created {filepath.name} -> {qr_content}")


if __name__ == "__main__":
    main()
