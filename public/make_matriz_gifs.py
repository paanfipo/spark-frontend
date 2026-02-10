from PIL import Image, ImageDraw, ImageFont
import os, math, random

# =========================
# Parámetros globales
# =========================
W, H = 480, 270                 # tamaño del lienzo (16:9)
GRID = 4                        # 4x4
CELL = 44                       # tamaño de cada casilla
GAP = 12                        # espacio entre casillas
RADIUS = 10                     # borde redondeado de la casilla
FPS = 30                        # cuadros por segundo
OUTDIR = "public/tutos/matriz"
os.makedirs(OUTDIR, exist_ok=True)

# Colores (RGBA)
BASE = (43, 60, 77, 255)        # casilla apagada (azul-gris exacto aprox)
NEON = (88, 255, 210, 255)      # verde neón
NEON_HALO_ALPHA = 160
WHITE = (255, 255, 255, 255)
TEXT = (255, 255, 255, 220)

# Centramos la grilla
GRID_W = GRID*CELL + (GRID-1)*GAP
GRID_H = GRID*CELL + (GRID-1)*GAP
OX = (W - GRID_W)//2
OY = (H - GRID_H)//2

# Intentar cargar una fuente bonita (si falla, usa la por defecto)
def load_font(size=20):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        try:
            return ImageFont.truetype("DejaVuSans.ttf", size)
        except:
            return ImageFont.load_default()

FONT = load_font(22)

def rounded_rect(draw, xy, radius, fill):
    x1,y1,x2,y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill)

def cell_xy(r, c):
    x = OX + c*(CELL+GAP)
    y = OY + r*(CELL+GAP)
    return x, y, x+CELL, y+CELL

def draw_grid_base(draw):
    # casillas apagadas
    for r in range(GRID):
        for c in range(GRID):
            rounded_rect(draw, cell_xy(r,c), RADIUS, BASE)

def glow_layer(im, r, c, color=NEON, max_expand=12, steps=6, alpha=NEON_HALO_ALPHA):
    """ Dibuja un halo suave alrededor de una casilla (capas concéntricas). """
    x1,y1,x2,y2 = cell_xy(r,c)
    overlay = Image.new("RGBA", im.size, (0,0,0,0))
    d = ImageDraw.Draw(overlay, "RGBA")

    for i in range(steps):
        expand = int(max_expand * (i+1)/steps)
        a = int(alpha * (1 - i/steps))
        rounded_rect(d, [x1-expand, y1-expand, x2+expand, y2+expand], RADIUS+expand, (color[0], color[1], color[2], a))
    im.alpha_composite(overlay)

def draw_cell_on(im, r, c, color=NEON):
    d = ImageDraw.Draw(im, "RGBA")
    rounded_rect(d, cell_xy(r,c), RADIUS, color)

def draw_finger(im, r, c, t=0.0):
    """Dedo claro con resplandor verde neón."""
    x1, y1, x2, y2 = cell_xy(r, c)
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2 + CELL // 3  # baja un poco para simular toque

    scale = 1.0 + 0.08 * math.sin(t * math.pi)
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay, "RGBA")

    # Resplandor verde
    for i in range(6):
        radius = int(22 * (1 + i * 0.15) * scale)
        alpha = max(0, 120 - i * 18)
        d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                  fill=(88, 255, 210, alpha))

    # Palma y punta
    R1 = int(14 * scale)
    d.ellipse([cx - R1, cy - R1, cx + R1, cy + R1],
              fill=(245, 250, 255, 240))
    R2 = int(6 * scale)
    d.ellipse([cx - R2, cy - R2, cx + R2, cy + R2],
              fill=(230, 240, 255, 255))

    im.alpha_composite(overlay)



def blank_canvas():
    # Transparente total
    return Image.new("RGBA", (W,H), (0,0,0,0))

def base_frame():
    im = blank_canvas()
    d = ImageDraw.Draw(im, "RGBA")
    draw_grid_base(d)
    return im

def add_title(im, text, y_offset=-4):
    """Texto centrado arriba sin recortarse."""
    d = ImageDraw.Draw(im, "RGBA")
    bbox = d.textbbox((0, 0), text, font=FONT)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    d.text(((W - tw) // 2, y_offset), text, font=FONT, fill=TEXT)
    return im




# =========================
# STEP 1: Secuencia de iluminación
# =========================
def make_step1(path):
    # Secuencia fija (diagonal + centro)
    seq = [(0,0), (1,1), (2,2), (3,3), (1,2)]
    dur_per_cell = 10          # frames por celda encendida
    fade_frames = 6            # desvanecimiento
    frames = []

    # Frame inicial (base)
    frames.append(base_frame())

    for (r,c) in seq:
        # Encendido con halo
        for k in range(dur_per_cell):
            f = base_frame()
            glow_layer(f, r, c, color=NEON, max_expand=14, steps=6, alpha=NEON_HALO_ALPHA)
            draw_cell_on(f, r, c, NEON)
            frames.append(f)

        # Fade out sutil (opcional) — mantiene casilla base
        for k in range(fade_frames):
            f = base_frame()
            alpha = int(NEON_HALO_ALPHA * (1 - (k+1)/fade_frames))
            glow_layer(f, r, c, color=NEON, max_expand=12, steps=5, alpha=alpha)
            frames.append(f)

    # Suaviza un cierre
    for _ in range(5):
        frames.append(base_frame())

    frames[0].save(path, save_all=True, append_images=frames[1:], duration=int(1000/FPS), loop=0, disposal=2)
    print("OK:", path)

# =========================
# STEP 2: “Recuerda el patrón” (pulso sutil)
# =========================
def make_step2(path):
    total = FPS * 2  # ~2s
    frames = []
    for i in range(total):
        f = base_frame()
        # pulso sutil en toda la grilla (halo muy suave)
        strength = 0.25 + 0.25*math.sin(2*math.pi * i/total)
        alpha = int(60 * strength)
        # aplicar halo suave sobre todas las celdas: escoger el centro (1,2) como marca suave
        glow_layer(f, 1, 2, color=NEON, max_expand=10, steps=5, alpha=alpha)
        # texto
        add_title(f, "Recuerda el patrón", y_offset=-4)
        frames.append(f)

    frames[0].save(path, save_all=True, append_images=frames[1:], duration=int(1000/FPS), loop=0, disposal=2)
    print("OK:", path)

# =========================
# STEP 3: Reproducir con dedo que toca
# =========================
def make_step3(path):
    seq = [(0,0), (1,1), (2,2), (3,3), (1,2)]
    touch_frames = int(FPS * 0.35)   # duración del toque por casilla
    between = int(FPS * 0.08)        # pausa entre toques
    frames = []

    # frame base de arranque
    frames.append(base_frame())

    t_global = 0
    for (r,c) in seq:
        # acercamiento & tocar (con pulso del dedo)
        for k in range(touch_frames):
            f = base_frame()
            # brillo al tocar
            glow_layer(f, r, c, color=NEON, max_expand=16, steps=7, alpha=NEON_HALO_ALPHA)
            draw_cell_on(f, r, c, NEON)
            # dedo con pequeño pulso
            t = k / max(1, touch_frames-1)
            draw_finger(f, r, c, t=t)
            frames.append(f)
            t_global += 1

        # micro pausa
        for k in range(between):
            f = base_frame()
            frames.append(f)
            t_global += 1

    # cierre corto
    for _ in range(6):
        frames.append(base_frame())

    frames[0].save(path, save_all=True, append_images=frames[1:], duration=int(1000/FPS), loop=0, disposal=2)
    print("OK:", path)

def make_chunking_png():
    """chunking.png: texto blanco arriba + grilla que se AUTOSCALEA para que NUNCA se recorte."""
    from PIL import Image, ImageDraw
    import os, math

    # Lienzo
    W, H = 480, 270

    # Grilla base (antes de escalar)
    GRID = 4
    CELL0, GAP0, RADIUS0 = 44, 12, 10

    # Salida
    OUT = "public/tutos/matriz/chunking.png"

    # Colores
    BASE = (43, 60, 77, 255)
    NEON = (88, 255, 210, 255)
    NEON_SOFT = (88, 255, 210, 120)

    # Texto
    TITLE = "Retén la forma"
    BODY  = "Usa chunking: agrupa visualmente el patrón en bloques simples."
    TITLE_COLOR = (255, 255, 255, 255)
    BODY_COLOR  = (255, 255, 255, 230)

    # Parámetros de layout
    TOP_TITLE_Y   = 2
    BODY_LINE_GAP = 2
    MAX_TEXT_W    = W - 40
    TOP_MARGIN_AFTER_TEXT = 10
    BOTTOM_MARGIN = 24   # margen de seguridad abajo (para halos)

    # Halos de chunk
    HALO_PAD = 5
    HALO_W   = 12
    EDGE_PAD = 4
    HALO_EXTRA = HALO_PAD + EDGE_PAD + HALO_W  # "barriga" extra alrededor de los bloques

    # --- helpers ---
    def text_size(draw, txt, font):
        bbox = draw.textbbox((0, 0), txt, font=FONT)
        return bbox[2]-bbox[0], bbox[3]-bbox[1]

    def wrap(draw, txt, font, max_w):
        words = txt.split()
        line, lines = "", []
        for w in words:
            test = (line + " " + w).strip()
            tw, _ = text_size(draw, test, font)
            if tw <= max_w or not line:
                line = test
            else:
                lines.append(line); line = w
        if line: lines.append(line)
        return lines

    # ==== 1) Medimos bloque de texto ====
    im = Image.new("RGBA", (W, H), (0,0,0,0))
    d  = ImageDraw.Draw(im, "RGBA")

    title_w, title_h = text_size(d, TITLE, FONT)
    body_lines = wrap(d, BODY, FONT, max_w=MAX_TEXT_W)
    body_h = sum(text_size(d, ln, FONT)[1] for ln in body_lines)

    text_top = TOP_TITLE_Y
    text_h   = title_h + BODY_LINE_GAP + body_h
    text_bottom = text_top + text_h

    # ==== 2) Calculamos espacio disponible para la grilla ====
    avail_h = H - (text_bottom + TOP_MARGIN_AFTER_TEXT) - BOTTOM_MARGIN
    if avail_h <= 0:
        avail_h = 1  # evita división por cero

    # Alto/grilla base (sin halos)
    grid_h0 = GRID*CELL0 + (GRID-1)*GAP0
    # Sumamos un “extra” por halos (arriba y abajo)
    grid_needed_h0 = grid_h0 + 2*HALO_EXTRA

    # Factor de escala si no cabe
    scale = min(1.0, avail_h / grid_needed_h0)

    # Aplicamos escala a CELL/GAP/RADIUS
    CELL   = max(26, int(round(CELL0   * scale)))
    GAP    = max( 8, int(round(GAP0    * scale)))
    RADIUS = max( 6, int(round(RADIUS0 * scale)))

    # Recalcular alto real con escala
    grid_h = GRID*CELL + (GRID-1)*GAP
    grid_needed_h = grid_h + 2*HALO_EXTRA

    # Posición Y de la grilla: centrada en el bloque disponible
    extra = max(0, (avail_h - grid_needed_h)//2)
    OY = text_bottom + TOP_MARGIN_AFTER_TEXT + extra + HALO_EXTRA  # dejamos sitio para halo superior

    # Posición X centrada
    grid_w = GRID*CELL + (GRID-1)*GAP
    OX = (W - grid_w)//2

    def cell_xy(r, c):
        x = OX + c*(CELL+GAP)
        y = OY + r*(CELL+GAP)
        return [x, y, x+CELL, y+CELL]

    def safe_rect(x1, y1, x2, y2):
        # recorta a los límites del lienzo respetando BOTTOM_MARGIN
        return [max(0, x1), max(0, y1), min(W, x2), min(H - BOTTOM_MARGIN, y2)]

    # ==== 3) Dibujo ====
    # Texto
    d.text(((W-title_w)//2, TOP_TITLE_Y), TITLE, font=FONT, fill=TITLE_COLOR)
    y = TOP_TITLE_Y + title_h + BODY_LINE_GAP
    for line in body_lines:
        lw, lh = text_size(d, line, FONT)
        d.text(((W-lw)//2, y), line, font=FONT, fill=BODY_COLOR)
        y += lh

    # Grilla base
    for r in range(GRID):
        for c in range(GRID):
            d.rounded_rectangle(cell_xy(r,c), radius=RADIUS, fill=BASE)

    # Chunks (2x2)
    def chunk_rect(r1, c1, r2, c2, pad=HALO_PAD, radius=18):
        x1, y1 = OX + c1*(CELL+GAP), OY + r1*(CELL+GAP)
        x2, y2 = OX + c2*(CELL+GAP) + CELL, OY + r2*(CELL+GAP) + CELL
        # halo
        hx1, hy1, hx2, hy2 = safe_rect(x1-pad-EDGE_PAD, y1-pad-EDGE_PAD, x2+pad+EDGE_PAD, y2+pad+EDGE_PAD)
        d.rounded_rectangle([hx1, hy1, hx2, hy2], radius=radius+10, outline=NEON_SOFT, width=HALO_W)
        # borde
        bx1, by1, bx2, by2 = safe_rect(x1-pad, y1-pad, x2+pad, y2+pad)
        d.rounded_rectangle([bx1, by1, bx2, by2], radius=radius, outline=NEON, width=6)

    chunk_rect(0, 0, 1, 1)
    chunk_rect(2, 2, 3, 3)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, "PNG")
    print("OK ->", OUT)



# =========================
# RUN
# =========================
if __name__ == "__main__":
    make_step1(os.path.join(OUTDIR, "step1.gif"))
    make_step2(os.path.join(OUTDIR, "step2.gif"))
    make_step3(os.path.join(OUTDIR, "step3.gif"))
    make_chunking_png()  # 👈 agrega esta línea
