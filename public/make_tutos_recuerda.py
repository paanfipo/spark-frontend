# make_tutos_recuerda_twemoji.py
# pip install pillow requests

import os, math, requests, random
from PIL import Image, ImageDraw, ImageFont

# ===== Config general =====
W, H = 640, 360
BG = (252, 247, 248)
CARD = (255, 255, 255)
INK = (15, 23, 42)
INK_SOFT = (100, 116, 139)
BORD_SOFT = (232, 236, 244)
RADIUS = 18
FPS = 12   # base para el paso 1
OUT_DIR = "public/tutos/recuerda"
EMOJI_DIR = "public/emoji"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(EMOJI_DIR, exist_ok=True)

# CDN Twemoji
TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/"

EMOJIS = ['🍎','🍊','🍌','🍉','🍇','🍓','🍒','🍑','🍍','🥥','🥝','🍆','🥑','🥦','🥬','🥒','🌶️','🌽','🥕','🧄']

# ===== Utilidades =====
def load_font(size):
    for p in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size=size)
            except:
                pass
    return ImageFont.load_default()

FONT_H1 = load_font(28)
FONT_BODY = load_font(20)

def ease(t): return 0.5 - 0.5 * math.cos(math.pi * t)

def draw_center_text(d, txt, font, cx, cy, fill=INK):
    bbox = d.textbbox((0,0), txt, font=font)
    w,h = bbox[2]-bbox[0], bbox[3]-bbox[1]
    d.text((cx-w//2, cy-h//2), txt, font=font, fill=fill)

def rounded_card(im_rgb, box, radius, fill_rgb):
    x0,y0,x1,y1 = box
    w,h = x1-x0, y1-y0
    card = Image.new("RGB",(w,h),fill_rgb)
    mask = Image.new("L",(w,h),0)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,w,h), radius, fill=255)
    im_rgb.paste(card,(x0,y0),mask)

def emoji_to_twemoji_filename(emoji:str)->str:
    cps=[f"{ord(ch):x}" for ch in emoji]
    return "-".join(cps)+".png"

def download_twemoji_png(emoji:str,dest:str)->str|None:
    fname=emoji_to_twemoji_filename(emoji)
    local=os.path.join(dest,fname)
    if os.path.exists(local): return local
    def try_get(name):
        try:
            r=requests.get(TWEMOJI_BASE+name,timeout=10)
            return r.status_code==200,r.content
        except: return False,None
    ok,data=try_get(fname)
    if not ok and "-fe0f" in fname:
        alt=fname.replace("-fe0f","")
        ok,data=try_get(alt)
        if ok: fname,local=alt,os.path.join(dest,alt)
    if ok and data:
        with open(local,"wb") as f: f.write(data)
        return local
    return None

def load_emoji_image(emoji:str,target_size:int=160)->Image.Image|None:
    path=download_twemoji_png(emoji,EMOJI_DIR)
    if not path or not os.path.exists(path): return None
    im=Image.open(path).convert("RGBA")
    im.thumbnail((target_size,target_size),Image.LANCZOS)
    return im

def paste_rgba_over_rgb(base,rgba,xy):
    layer=Image.new("RGBA",base.size,(0,0,0,0))
    layer.paste(rgba,xy,rgba)
    return Image.alpha_composite(base.convert("RGBA"),layer).convert("RGB")

# ===== Paso 1 =====
# SOLO círculo + emoji, fondo transparente
def make_step1(center_y: int | None = None,
               *, 
               w: int | None = None,           # ancho del GIF (si no, usa W global)
               h: int | None = None,           # alto del GIF (si no, usa H global)
               circle_rel: float = 0.55,       # diámetro del círculo respecto al lado menor (0–1)
               emoji_min: float = 1.00,        # escala mínima del emoji (al inicio)
               emoji_max: float = 1.28,        # escala máxima del emoji (al final)
               per_item_secs: float = 0.35,
               hold_secs: float = 0.50):
    """
    ► Hace un GIF con fondo transparente, SOLO un círculo blanco y el emoji al centro.
    ► circle_rel controla qué tanto ocupa el círculo (0.55 = 55% del lado menor).
    ► emoji_min/emoji_max controlan el tamaño del emoji dentro del círculo.
    ► w/h te permiten generar un lienzo más grande para que el modal lo muestre más “lleno”.
    """
    Wloc = w or W
    Hloc = h or H
    if center_y is None:
        center_y = int(Hloc * 0.58)  # un poquito abajo para verse centrado visualmente

    frames = []
    per_item = int(FPS * per_item_secs)
    hold     = int(FPS * hold_secs)

    for sym in EMOJIS[:8]:
        # tamaño base del emoji: proporcional al círculo que usaremos
        base_r = int(min(Wloc, Hloc) * circle_rel * 0.5)
        png = load_emoji_image(sym, int(base_r*2))  # base grande para no pixelar

        for f in range(per_item):
            t = ease(f / max(1, per_item - 1))  # 0→1
            im = Image.new("RGBA", (Wloc, Hloc), (0, 0, 0, 0))  # transparente
            d = ImageDraw.Draw(im, "RGBA")

            cx, cy = Wloc // 2, center_y

            # Círculo con un “pop” suave (aumenta ~10%)
            r = int(base_r * (1.0 + 0.10 * t))
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 255))

            # Emoji escalado grande dentro del círculo
            if png:
                sc = emoji_min + (emoji_max - emoji_min) * t
                w_e, h_e = int(png.width * sc), int(png.height * sc)
                sp = png.resize((w_e, h_e), Image.LANCZOS)

                # Fade-in sutil
                r_, g_, b_, a_ = sp.split()
                a_ = a_.point(lambda v: int(v * (0.15 + 0.85 * t)))
                sp.putalpha(a_)

                im.alpha_composite(sp, (cx - w_e // 2, cy - h_e // 2))

            frames.append(im.copy())

        for _ in range(hold):
            frames.append(frames[-1].copy())

    out = os.path.join(OUT_DIR, "step1.gif")
    frames[0].save(out, save_all=True, append_images=frames[1:],
                   duration=int(1000 / FPS), loop=0, disposal=2, transparency=0)
    print("OK:", out)


# ===== Paso 2 (GRID ESTÁTICA; solo resaltado secuencial) =====
def make_step2():
    frames = []

    # ⬇️  Celda más compacta para que quepan 3 filas
    cols, rows = 4, 3
    cell_w, cell_h = 100, 60    # antes 110x90
    gap = 12                    # antes 16

    # Medidas derivadas
    total_grid_h = rows*cell_h + (rows-1)*gap        # 3*60 + 2*12 = 204
    start_y = 130                                    # 130 + 204 = 334 < 360 (¡cabe!)
    start_x = (W - cols*cell_w - (cols-1)*gap)//2

    targets = [(0,0), (2,1), (3,2)]
    sprites = [load_emoji_image(e, 56) for e in EMOJIS]  # ⬅️ sprites acordes a 60px de alto
    si = 0

    fade_in_frames  = int(FPS * 0.35)
    hold_frames     = int(FPS * 0.40)
    fade_out_frames = int(FPS * 0.30)

    def draw_grid_base():
        im = Image.new("RGB", (W, H), BG)
        d  = ImageDraw.Draw(im)
        rounded_card(im, (40,40, W-40, H-40), RADIUS, CARD)
        draw_center_text(d, "2. Busca", FONT_H1, W//2, 70, INK)
        draw_center_text(d, "Aparece una cuadrícula con distractores. Ignóralos.",
                         FONT_BODY, W//2, 110, INK_SOFT)

        nonlocal si; si = 0
        for r in range(rows):
            for c in range(cols):
                x = start_x + c*(cell_w+gap)
                y = start_y + r*(cell_h+gap)
                d.rounded_rectangle((x,y,x+cell_w,y+cell_h), radius=12,
                                    fill=(255,255,255), outline=BORD_SOFT, width=2)
                sp = sprites[si % len(sprites)]; si += 1
                if sp:
                    im.paste(sp, (x + cell_w//2 - sp.width//2,
                                  y + cell_h//2 - sp.height//2), sp)
        return im

    base = draw_grid_base()
    for _ in range(int(FPS*0.4)):
        frames.append(base.quantize(colors=256, method=Image.MEDIANCUT))

    for c, r in targets:
        x = start_x + c*(cell_w+gap)
        y = start_y + r*(cell_h+gap)

        for f in range(fade_in_frames):
            im = base.copy()
            d  = ImageDraw.Draw(im)
            d.rounded_rectangle((x-2,y-2,x+cell_w+2,y+cell_h+2), radius=14,
                                outline=(255,122,121), width=3)
            frames.append(im.quantize(colors=256, method=Image.MEDIANCUT))

        for _ in range(hold_frames):
            im = base.copy()
            d  = ImageDraw.Draw(im)
            d.rounded_rectangle((x-2,y-2,x+cell_w+2,y+cell_h+2), radius=14,
                                outline=(255,122,121), width=3)
            frames.append(im.quantize(colors=256, method=Image.MEDIANCUT))

        for _ in range(fade_out_frames):
            frames.append(base.quantize(colors=256, method=Image.MEDIANCUT))

    out = os.path.join(OUT_DIR, "step2.gif")
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=170,
                   loop=0, disposal=2, optimize=True)
    print("OK:", out)


# ===== Paso 3 (EMOJIS ESTÁTICOS + selección en orden) =====
def make_step3():
    frames = []

    # ⬇️  Mismas medidas compactas que Step 2
    cols, rows = 4, 3
    cell_w, cell_h = 100, 60
    gap = 12
    total_grid_h = rows*cell_h + (rows-1)*gap      # 204
    start_y = 130                                  # 130 + 204 = 334
    start_x = (W - cols*cell_w - (cols-1)*gap)//2

    order = [(0,0), (1,1), (3,2), (2,0)]
    sprites = [load_emoji_image(e, 56) for e in EMOJIS]  # ⬅️ acorde a 60px
    si = 0
    per_click = int(FPS * 1.0)
    hold      = int(FPS * 0.55)
    selected  = set()

    def draw_board(im, highlight=None):
        nonlocal si
        d = ImageDraw.Draw(im)
        rounded_card(im, (40,40, W-40, H-40), RADIUS, CARD)
        draw_center_text(d, "3. Repite", FONT_H1, W//2, 70, INK)
        draw_center_text(d, "Haz clic en el mismo orden en que aparecieron.",
                         FONT_BODY, W//2, 110, INK_SOFT)

        si = 0
        for r in range(rows):
            for c in range(cols):
                x = start_x + c*(cell_w+gap)
                y = start_y + r*(cell_h+gap)
                outline = (46,204,113) if (c,r) in selected else BORD_SOFT
                d.rounded_rectangle((x,y,x+cell_w,y+cell_h), radius=12,
                                    fill=(255,255,255), outline=outline, width=2)
                sp = sprites[si % len(sprites)]; si += 1
                if sp:
                    im.paste(sp, (x + cell_w//2 - sp.width//2,
                                  y + cell_h//2 - sp.height//2), sp)

        if highlight:
            c,r = highlight
            x = start_x + c*(cell_w+gap)
            y = start_y + r*(cell_h+gap)
            d.rounded_rectangle((x-2,y-2,x+cell_w+2,y+cell_h+2), radius=14,
                                outline=(255,122,121), width=3)

    for target in order:
        for f in range(per_click):
            t = ease(f / max(1, per_click-1))
            im = Image.new("RGB", (W, H), BG)
            draw_board(im, highlight=target)
            # puntero
            ox, oy = 70, 90
            tc, tr = target
            tx = start_x + tc*(cell_w+gap) + cell_w//2
            ty = start_y + tr*(cell_h+gap) + cell_h//2
            px = int(ox + (tx - ox) * t)
            py = int(oy + (ty - oy) * t)
            d = ImageDraw.Draw(im)
            d.ellipse((px-12, py-12, px+12, py+12), fill=(255,122,121))
            frames.append(im.quantize(colors=256, method=Image.MEDIANCUT))

        selected.add(target)
        for _ in range(hold):
            im = Image.new("RGB", (W, H), BG)
            draw_board(im)
            frames.append(im.quantize(colors=256, method=Image.MEDIANCUT))

    out = os.path.join(OUT_DIR, "step3.gif")
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=160,
                   loop=0, disposal=2, optimize=True)
    print("OK:", out)





# ===== Ejecutar =====
if __name__=="__main__":
    random.seed(7)
    make_step1(center_y=250)
    make_step2()
    make_step3()
