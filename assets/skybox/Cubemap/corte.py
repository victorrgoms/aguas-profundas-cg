from PIL import Image

img = Image.open("Cubemap_Sky_15-512x512.png")
w, h = img.size

S = w // 4  # tamanho de cada face

faces = {
    "right.jpg":  (2*S, S, 3*S, 2*S),
    "left.jpg":   (0, S, S, 2*S),
    "top.jpg":    (S, 0, 2*S, S),
    "bottom.jpg": (S, 2*S, 2*S, 3*S),
    "front.jpg":  (S, S, 2*S, 2*S),
    "back.jpg":   (3*S, S, 4*S, 2*S),
}

for name, box in faces.items():
    img.crop(box).save(name)

print("Cubemap cortado com sucesso!")
