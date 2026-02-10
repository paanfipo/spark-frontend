from PIL import Image, ImageDraw, ImageFont

# -------------------------
# Configuración general
# -------------------------
W, H = 420, 320
BG = (250, 250, 252)
GRID_COLOR = (200, 200, 210)
HIGHLIGHT = (255, 120, 160)
SHAPE = (255, 90, 60)
TEXT = (60, 60, 80)

CELL = 70
GRID_X = 75
GRID_Y = 60

try:
    font = ImageFont.truetype("arial.ttf", 18)
except:
    font = ImageFont.load_default()


def base_frame(text):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((W // 2 - 160, 15), text, fill=TEXT, font=font)
    return img, d


def draw_grid(d):
    for r in range(3):
        for c in range(3):
            x = GRID_X + c * CELL
            y = GRID_Y + r * CELL
            d.rounded_rectangle(
                [x, y, x + CELL, y + CELL],
                radius=12,
                outline=GRID_COLOR,
                width=2
            )


def draw_shapes(d):
    for r in range(3):
        for c in range(3):
            x = GRID_X + c * CELL + CELL // 2
            y = GRID_Y + r * CELL + CELL // 2
            d.ellipse([x - 12, y - 12, x + 12, y + 12], fill=SHAPE)


# -------------------------
# GIF 1 — Observar filas/columnas
# -------------------------
frames = []
for step in range(6):
    img, d = base_frame("Paso 1: Observa filas y columnas")
    draw_grid(d)
    draw_shapes(d)

    if step < 3:
        r = step
        y = GRID_Y + r * CELL
        d.rectangle([GRID_X, y, GRID_X + 3 * CELL, y + CELL],
                    outline=HIGHLIGHT, width=4)
    else:
        c = step - 3
        x = GRID_X + c * CELL
        d.rectangle([x, GRID_Y, x + CELL, GRID_Y + 3 * CELL],
                    outline=HIGHLIGHT, width=4)

    frames.append(img)

frames[0].save(
    "tutorial_paso_1.gif",
    save_all=True,
    append_images=frames[1:],
    duration=500,
    loop=0
)

# -------------------------
# GIF 2 — Identificar la regla
# -------------------------
frames = []
for step in range(4):
    img, d = base_frame("Paso 2: Identifica la regla")
    draw_grid(d)

    for r in range(3):
        for c in range(3):
            x = GRID_X + c * CELL + CELL // 2
            y = GRID_Y + r * CELL + CELL // 2
            size = 8 + step * 4
            d.ellipse([x - size, y - size, x + size, y + size], fill=SHAPE)

    frames.append(img)

frames[0].save(
    "tutorial_paso_2.gif",
    save_all=True,
    append_images=frames[1:],
    duration=500,
    loop=0
)

# -------------------------
# GIF 3 — Completar matriz
# -------------------------
frames = []
for step in range(5):
    img, d = base_frame("Paso 3: Completa la matriz")
    draw_grid(d)

    # Dibujar todas menos la última
    for r in range(3):
        for c in range(3):
            if r == 2 and c == 2:
                continue
            x = GRID_X + c * CELL + CELL // 2
            y = GRID_Y + r * CELL + CELL // 2
            d.ellipse([x - 12, y - 12, x + 12, y + 12], fill=SHAPE)

    # Opción moviéndose
    ox = 160
    oy = 260 - step * 30
    d.ellipse([ox - 12, oy - 12, ox + 12, oy + 12], fill=SHAPE)

    frames.append(img)

frames[0].save(
    "tutorial_paso_3.gif",
    save_all=True,
    append_images=frames[1:],
    duration=500,
    loop=0
)

print("GIFs generados correctamente.")
