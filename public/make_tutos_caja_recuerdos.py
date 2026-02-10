# make_tutos_caja_recuerdos.py
# pip install pillow

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# ===== Estilo general =====
W, H = 640, 360
BG = (255, 247, 248)      # #fff7f8
CARD = (255, 226, 231)    # #ffe2e7
HILIGHT = (255, 162, 95)  # #ffa25f
OUTLINE = (255, 106, 166) # #ff6aa6
INK = (15, 23, 42)        # #0f172a
RADIUS = 16
OUT_DIR = "public/tutos_caja_recuerdos"
os.makedirs(OUT_DIR, exist_ok=True)

# ===== Fuente con fallback =====
def load_font(size):
    for p in ["arial.ttf", "SegoeUI.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    # último recurso
    return ImageFont.load_default()

def get_text_size(draw, text, font):
    # Compatible Pillow >=10
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

# ===== Utilidades =====
def rounded_rect(draw, xy, fill, outline, width=2, radius=RADIUS):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

# ===== Contenido (SOLO PALABRAS) =====
WORDS = ["Jardín", "Libro", "Canción", "Cumpleaños", "Playa", "Mascota"]

# ===== GIF 1: aparecen una por una =====
def make_gif1():
    frames = []
    big = load_font(40)
    for w in WORDS + ["Recuerda tantas como puedas..."]:
        img = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(img)
        tw, th = get_text_size(d, w, big)
        d.text(((W - tw) / 2, (H - th) / 2), w, fill=INK, font=big)
        frames.append(img)
    frames[0].save(f"{OUT_DIR}/tuto1.gif",
                   save_all=True, append_images=frames[1:], duration=900, loop=0)

# ===== GIF 2: cuadrícula con todas =====
def make_gif2():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    cols, rows = 3, 2
    cw, ch = W // cols, H // rows
    font = load_font(28)

    for i, w in enumerate(WORDS):
        x = (i % cols) * cw
        y = (i // cols) * ch
        pad = 10
        rect = [x + pad, y + pad, x + cw - pad, y + ch - pad]
        rounded_rect(d, rect, fill=CARD, outline=OUTLINE, width=2)

        tw, th = get_text_size(d, w, font)
        d.text((x + cw/2 - tw/2, y + ch/2 - th/2), w, fill=INK, font=font)

    # mostrar 3 s aprox
    frames = [img] * 30
    frames[0].save(f"{OUT_DIR}/tuto2.gif",
                   save_all=True, append_images=frames[1:], duration=100, loop=0)

# ===== GIF 3: selección (pulso de borde) =====
def make_gif3():
    cols, rows = 3, 2
    cw, ch = W // cols, H // rows
    font = load_font(28)
    frames = []

    # Recorremos cuántas van “recordadas”
    for remembered in range(len(WORDS) + 1):
        # Dos subframes para crear efecto de “pulso”
        for pulse in (0, 1):
            img = Image.new("RGB", (W, H), BG)
            d = ImageDraw.Draw(img)

            for i, w in enumerate(WORDS):
                x = (i % cols) * cw
                y = (i // cols) * ch
                pad = 10
                rect = [x + pad, y + pad, x + cw - pad, y + ch - pad]

                # color de celda: resaltada si ya “recordada”
                fill = HILIGHT if i < remembered else CARD

                # borde: pulso más intenso para las recordadas
                if i < remembered:
                    outline = OUTLINE if pulse == 0 else (255, 80, 150)
                    width = 3 if pulse == 0 else 4
                else:
                    outline = OUTLINE
                    width = 2

                rounded_rect(d, rect, fill=fill, outline=outline, width=width)

                tw, th = get_text_size(d, w, font)
                d.text((x + cw/2 - tw/2, y + ch/2 - th/2), w, fill=INK, font=font)

            frames.append(img)

    # un poco más de pausa al final
    frames += [frames[-1]] * 3

    frames[0].save(f"{OUT_DIR}/tuto3.gif",
                   save_all=True, append_images=frames[1:], duration=250, loop=0)

# ===== Ejecutar =====
make_gif1()
make_gif2()
make_gif3()
print("✅ GIFs sin emojis generados en:", OUT_DIR)
