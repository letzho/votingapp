import os
import qrcode

# Destination folder where you want to save PNGs
destination_folder = r"C:\NYP_FILE\VOTING_APP\QR"
os.makedirs(destination_folder, exist_ok=True)  # Ensures folder exists
groupname="team-beta"
safe_content = f"Title: {groupname}"

# Generate the QR Image
qr = qrcode.QRCode(box_size=10, border=4)
qr.add_data(safe_content)
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white")

# Define destination filepath
filename = f"{(groupname)}.png"
filepath = os.path.join(destination_folder, filename)

# Save directly to disk
img.save(filepath)