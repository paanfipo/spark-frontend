# -*- coding: utf-8 -*-
# generar_tuto_chunking.py
# Requiere: pip install pillow

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# -------------------------
# Parámetros visuales base
# -------------------------
W, H = 1280, 720
MARGIN_X = 140          # margen horizontal del grid
MARGIN_TOP = 170        # top del grid
CELL_R = 80             # radio de los círculos
COLS = 5
ROWS = 2
GAP_X = 135             # separación horizontal
GAP_Y = 145             # separación vertical entre filas

BG_COLS = [(18, 31, 86), (242, 168, 42)]  # degradado (arriba->abajo)
CIRCLE_INNER = (85, 80, 245)              # violeta
CIRCLE_OUTER = (49, 133, 215)             # azul
NUM_COLOR = (255, 255, 255)               # números grandes
LABEL_COLOR = (250, 250, 252)             # textos
BLOCK_COLORS = [
    (0, 255, 220),   # bloque 1
    (255, 114, 94),  # bloque 2
    (255, 205, 0)    # bloque 3
]
OUTLINE_ALPHA = 160       # opacidad del contorno del bloque
FILL_ALPHA = 65           # opacidad del relleno del bloque
LABEL_BG = (0, 0, 0, 180) # franja superior “Sugerencia”

# Bloques de chunking sobre la secuencia 0..9
# Cada “bloque” se define por índices de celdas (0..9). 
# Ejemplo: [0,1,2] – [3,4,5] – [6,7,8,9]
CHUNKS = [
    [0, 1, 2],        # Bloque A
    [3, 4, 5],        # Bloque B
    [6, 7, 8, 9],     # Bloque C
]

# Texto guía superior
HEADER_TEXT = "Técnica: agrupa en bloques (chunking). Memoriza 0–1–2 | 3–4–5 | 6–7–8–9"

# Salidas
OUT_DIR = "public/tutos/secuencia"
PNG_PATH = os.path.join(OUT_DIR, "step3_chunking.png")
GIF_PATH = os.path.join(OUT_DIR, "step3_chunking.gif")

# -------------------------
# Utilidades
# -------------------------
def ensure_dir(p):
    os.makedirs(p, exist_ok=True)

def load_font(paths, size):
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

# Algunas rutas probables (ajústalas si tienes una fuente concreta)
FONT_BOLD = load_font([
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
], 60)
FONT_MED = load_font([
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/Library/Fonts/Arial.ttf",
    "C:/Windows/Fonts/arial.ttf",
], 34)
FONT_SMALL = load_font([
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/Library/Fonts/Arial.ttf",
    "C:/Windows/Fonts/arial.ttf",
], 26)

def lerp(a, b, t):
    return int(a + (b - a) * t)

def lerp_color(c1, c2, t):
    return tuple(lerp(c1[i], c2[i], t) for i in range(3))

def draw_bg_gradient(im):
    dr = ImageDraw.Draw(im)
    for y in range(H):
        t = y / (H - 1)
        col = lerp_color(BG_COLS[0], BG_COLS[1], t)
        dr.line([(0, y), (W, y)], fill=col)

def grid_positions():
    """Devuelve las posiciones (cx, cy) de las 10 celdas en 2 filas."""
    coords = []
    for r in range(ROWS):
        for c in range(COLS):
            cx = MARGIN_X + c * GAP_X + CELL_R
            cy = MARGIN_TOP + r * GAP_Y + CELL_R
            coords.append((cx, cy))
    return coords  # 0..9 (fila 0: 0..4, fila 1: 5..9)

def draw_soft_circle(img, center, r, inner=CIRCLE_INNER, outer=CIRCLE_OUTER, glow=True):
    """Círculo con leve gradiente/halo."""
    cx, cy = center
    # Capa para el círculo
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 14
    for i in range(steps, 0, -1):
        t = i / steps
        rr = int(r * (0.65 + 0.35 * t))
        col = lerp_color(outer, inner, t)
        alpha = int(70 + 185 * t)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(*col, alpha))
    # Glow externo
    if glow:
        glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dg = ImageDraw.Draw(glow_layer)
        g_r = r + 10
        dg.ellipse([cx - g_r, cy - g_r, cx + g_r, cy + g_r], outline=(0, 255, 255, 160), width=3)
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(4))
        img.alpha_composite(glow_layer)
    img.alpha_composite(layer)

def draw_number(img, center, text, color=NUM_COLOR):
    cx, cy = center
    d = ImageDraw.Draw(img)
    w, h = d.textbbox((0, 0), text, font=FONT_BOLD)[2:]
    d.text((cx - w / 2, cy - h / 2), text, fill=color, font=FONT_BOLD)

def draw_header(img, text=HEADER_TEXT):
    """Franja superior con la recomendación (más corta, no ancho completo)."""
    pad_x = 28
    pad_y = 8
    d = ImageDraw.Draw(img)
    tw, th = d.textbbox((0, 0), text, font=FONT_MED)[2:]
    # Caja centrada, más corta que el ancho
    box_w = min(tw + pad_x * 2, int(W * 0.86))
    box_h = th + pad_y * 2
    x0 = (W - box_w) // 2
    y0 = 24
    header = Image.new("RGBA", (box_w, box_h), LABEL_BG)
    img.alpha_composite(header, (x0, y0))

    d.text((x0 + pad_x, y0 + pad_y - 2), text, fill=(255, 255, 255), font=FONT_MED)

def draw_chunk_overlay(img, positions, chunk_idx):
    """Resalta un bloque (chunk) con rectángulo redondeado y etiqueta."""
    d = ImageDraw.Draw(img, "RGBA")
    idxs = CHUNKS[chunk_idx]
    col = BLOCK_COLORS[chunk_idx % len(BLOCK_COLORS)]
    # Bounding box del grupo
    xs, ys = [], []
    for i in idxs:
        xs.append(positions[i][0])
        ys.append(positions[i][1])
    # Expandir un poco…
    expand = CELL_R + 18
    x0 = min(xs) - expand
    x1 = max(xs) + expand
    y0 = min(ys) - expand
    y1 = max(ys) + expand
    # Relleno suave
    fill = (*col, FILL_ALPHA)
    outline = (*col, OUTLINE_ALPHA)
    d.rounded_rectangle([x0, y0, x1, y1], radius=24, fill=fill, outline=outline, width=4)
    # Etiqueta del bloque (arriba-centro)
    label = f"Bloque {chr(65 + chunk_idx)}"
    lw, lh = d.textbbox((0, 0), label, font=FONT_SMALL)[2:]
    tag_w = lw + 14
    tag_h = lh + 8
    tag_x = int((x0 + x1) / 2 - tag_w / 2)
    tag_y = int(y0 - tag_h - 10)
    # Fondo etiqueta
    d.rounded_rectangle([tag_x, tag_y, tag_x + tag_w, tag_y + tag_h], radius=10, fill=(20, 24, 35, 210))
    d.text((tag_x + 7, tag_y + 4), label, fill=(255, 255, 255), font=FONT_SMALL)

def draw_base_scene():
    """Dibuja fondo + grid + números, retorna imagen RGBA y las posiciones."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    draw_bg_gradient(im)
    positions = grid_positions()

    # Círculos + números
    for i, (cx, cy) in enumerate(positions):
        draw_soft_circle(im, (cx, cy), CELL_R, glow=False)
        draw_number(im, (cx, cy), str(i))

    # Franja / texto superior
    draw_header(im, HEADER_TEXT)
    return im, positions

# -------------------------
# Generadores
# -------------------------
def make_png(path=PNG_PATH):
    ensure_dir(OUT_DIR)
    base, positions = draw_base_scene()
    # Mostrar TODOS los bloques a la vez (estático)
    for idx in range(len(CHUNKS)):
        draw_chunk_overlay(base, positions, idx)
    base.save(path, optimize=True)
    print("OK ->", path)

def make_gif(path=GIF_PATH, hold_frames=10, pause_frames=6, fps=12):
    """
    Pequeña animación: resalta bloque A, luego B, luego C.
    hold_frames: frames mostrando el bloque activo
    pause_frames: frames entre bloques (solo escena base)
    """
    ensure_dir(OUT_DIR)
    base, positions = draw_base_scene()
    frames = []

    # Helper: copiar base como frame
    def frame_base():
        return base.copy()

    # Secuencia: (base) -> bloque A -> (base) -> bloque B -> (base) -> bloque C -> (base)
    # 1) pausa inicial
    for _ in range(pause_frames):
        frames.append(frame_base())

    for idx in range(len(CHUNKS)):
        # Bloque activo
        for _ in range(hold_frames):
            fr = frame_base()
            draw_chunk_overlay(fr, positions, idx)
            frames.append(fr)
        # Pausa entre bloques
        for _ in range(pause_frames):
            frames.append(frame_base())

    # Cierre mostrando todos los bloques juntos un instante
    fr_all = frame_base()
    for idx in range(len(CHUNKS)):
        draw_chunk_overlay(fr_all, positions, idx)
    for _ in range(hold_frames):
        frames.append(fr_all.copy())

    # Guardar como GIF
    # Duración por frame en ms
    duration = int(1000 / fps)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        disposal=2,
        optimize=True,
    )
    print("OK ->", path)

# -------------------------
# Main
# -------------------------
if __name__ == "__main__":
    make_png()       # Imagen estática
    make_gif()       # GIF opcional (puedes comentar esta línea si no lo necesitas)
