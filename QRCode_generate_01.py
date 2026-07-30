# -*- coding: utf-8 -*-
"""
Created on Thu Jul 30 21:17:34 2026

@author: leowsh
"""

import os
import qrcode
from PIL import Image, ImageDraw, ImageFont

p_title="Team Beta"

destination_folder = r"C:\NYP_FILE\VOTING_APP\QR"
os.makedirs(destination_folder, exist_ok=True)

safe_content = f"Group: {p_title}"

# 1. Generate base QR image
qr = qrcode.QRCode(box_size=10, border=4)
qr.add_data(safe_content)
qr.make(fit=True)
qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

# 2. Expand canvas height to make room for text at the bottom
label_text = f"{p_title}"
extra_height = 40  # pixels for text area

new_w = qr_img.width
new_h = qr_img.height + extra_height

# Create a blank white image canvas
canvas = Image.new("RGB", (new_w, new_h), "white")
canvas.paste(qr_img, (0, 0))

# 3. Draw text on the canvas
draw = ImageDraw.Draw(canvas)
font = ImageFont.load_default()  # Or load custom font: ImageFont.truetype("arial.ttf", 16)

# Center the text horizontally
bbox = draw.textbbox((0, 0), label_text, font=font)
text_w = bbox[2] - bbox[0]
text_x = (new_w - text_w) // 2
text_y = qr_img.height + 5

draw.text((text_x, text_y), label_text, fill="black", font=font)

# 4. Save to destination
filename = f"{p_title}.png"
filepath = os.path.join(destination_folder, filename)
canvas.save(filepath)