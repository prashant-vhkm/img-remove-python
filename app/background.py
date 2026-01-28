from PIL import Image, ImageFilter,ImageEnhance
import io


def apply_blur_background(
    original_image_path,
    fg_bytes,
    blur_radius=22,
    feather=3,
    edge_desat=0.6
):
    # Background (blurred)
    bg = Image.open(original_image_path).convert("RGBA")
    bg = bg.filter(ImageFilter.GaussianBlur(blur_radius))

    # Foreground
    fg = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")

    # --- Alpha processing ---
    alpha = fg.split()[3]

    # Feather alpha (soft edge)
    alpha = alpha.filter(ImageFilter.GaussianBlur(feather))

    # Slightly contract mask to kill edge bleed
    alpha = alpha.point(lambda p: max(0, p - 10))

    # Put alpha back
    fg.putalpha(alpha)

    # --- Edge color decontamination ---
    # Reduce saturation near edges
    rgb = fg.convert("RGB")
    desat = ImageEnhance.Color(rgb).enhance(edge_desat)

    # Blend desaturated edges with original
    fg = Image.composite(
        fg.convert("RGBA"),
        desat.convert("RGBA"),
        alpha
    )

    # Composite final
    bg.paste(fg, mask=alpha)
    return bg

def apply_solid_background(fg_bytes, color=(255, 255, 255)):
    fg = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")

    bg = Image.new("RGBA", fg.size, color + (255,))
    bg.paste(fg, mask=fg.split()[3])

    return bg


def apply_image_background(fg_bytes, bg_image_path):
    fg = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")

    bg = Image.open(bg_image_path).convert("RGBA")
    bg = bg.resize(fg.size)

    bg.paste(fg, mask=fg.split()[3])
    return bg
