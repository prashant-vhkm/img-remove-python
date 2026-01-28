# from rembg import remove
# import os
#
# def remove_background(input_path, output_path):
#     with open(input_path, "rb") as i:
#         result = remove(i.read())
#
#     with open(output_path, "wb") as o:
#         o.write(result)
# from rembg import remove
#
# def remove_background(image_path):
#     with open(image_path, "rb") as f:
#         return remove(f.read())
from rembg import remove

def remove_background(input_bytes: bytes) -> bytes:
    return remove(input_bytes)
