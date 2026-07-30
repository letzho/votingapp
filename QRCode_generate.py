# -*- coding: utf-8 -*-
"""
Created on Mon Feb  2 09:56:54 2026

@author: leowsh
"""


import csv
import io
import zipfile
import qrcode
import re

# Your project data
projects = [
    ("MP25052", "HYDROLIFT"),
    ("MP25053", "WATER FILTRATION SYSTEM"),
    ("MP25054", "SMART REST"),
    ("MP25055", "CLOTHES BANK"),
    ("MP25056", "AQUALINK"),
    ("MP25057", "POURPOSE"),
    ("MP25058", "ECO RIDE"),
    ("MP25059", "ECO BOTANICA"),
    ("MP25060", "SMART FOOD REDISTRIBUTION SYSTEM"),
    ("MP25061", "MEDIBOX"),
    ("MP25062", "HEATCYCLER"),
    ("MP25063", "RAINGAIN"),
    ("MP25064", "MOBILE FOOD & WATER CART"),
    ("MP25065", "SMART AIR PURIFIER"),
    ("MP25066", "M3_PLANT WALL"),
    ("MP25067", "SMART IRRIGATION SYSTEM"),
    ("MP25068", "SEA SLUG"),
    ("MP25069", "ROLLATOR WALKER"),
    ("MP25070", "THE EDUDROP PROJECT"),
    ("MP25071", "FARM X")
]

def clean_filename(name):
    # Removes characters that are illegal in filenames
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def generate_safe_text_qrs():
    zip_buffer = io.BytesIO()
    
    print("Generating Map-Proof QR Codes...")

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for p_no, p_title in projects:
            # --- THE FIX IS HERE ---
            # We format it explicitly with labels and newlines.
            # This forces the phone to read it as a note, not a map location.
            safe_content = f"Project No: {p_no}\nTitle: {p_title}"
            
            # Generate the QR Image
            qr = qrcode.QRCode(box_size=10, border=4)
            qr.add_data(safe_content)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Create a nice filename
            filename = f"{p_no}_{clean_filename(p_title)}.png"
            
            # Save into the zip
            img_buffer = io.BytesIO()
            img.save(img_buffer, format="PNG")
            zip_file.writestr(filename, img_buffer.getvalue())
            
            print(f"Created: {filename}")

    # Save the final zip file
    with open("Project_Safe_Text_QRs.zip", "wb") as f:
        f.write(zip_buffer.getvalue())
    
    print("\nSuccess! 'Project_Safe_Text_QRs.zip' is ready. These will scan as text.")

if __name__ == "__main__":
    generate_safe_text_qrs()