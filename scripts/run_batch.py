import os
from app.remover import remove_background
from app.background import (
    apply_solid_background,
    apply_image_background,
    apply_blur_background
)

INPUT_DIR = "input"
OUTPUT_DIR = "output"

TRANSPARENT_DIR = os.path.join(OUTPUT_DIR, "transparent")
WHITE_DIR = os.path.join(OUTPUT_DIR, "white")
BG_DIR = os.path.join(OUTPUT_DIR, "bg")
BLUR_DIR = os.path.join(OUTPUT_DIR, "blur")

BG_IMAGE = "bg_assets/bg1.jpg"

# Create output folders
os.makedirs(TRANSPARENT_DIR, exist_ok=True)
os.makedirs(WHITE_DIR, exist_ok=True)
os.makedirs(BG_DIR, exist_ok=True)
os.makedirs(BLUR_DIR, exist_ok=True)

for file in os.listdir(INPUT_DIR):
    if file.lower().endswith((".png", ".jpg", ".jpeg")):
        input_path = os.path.join(INPUT_DIR, file)
        name = os.path.splitext(file)[0]

        # Remove background
        fg_bytes = remove_background(input_path)

        # 1️⃣ Transparent
        with open(os.path.join(TRANSPARENT_DIR, f"{name}.png"), "wb") as f:
            f.write(fg_bytes)

        # 2️⃣ White background
        white_img = apply_solid_background(fg_bytes, (255, 255, 255))
        white_img.save(os.path.join(WHITE_DIR, f"{name}.png"))

        # 3️⃣ Custom image background
        bg_img = apply_image_background(fg_bytes, BG_IMAGE)
        bg_img.save(os.path.join(BG_DIR, f"{name}.png"))

        # 4️⃣ Blurred original background
        blur_img = apply_blur_background(input_path, fg_bytes, blur_radius=20)
        blur_img.save(os.path.join(BLUR_DIR, f"{name}.png"))

        print(f"✔ Processed {file}")
