# make_tutos_deja_vu.py
# pip install pillow

from PIL import Image, ImageDraw, ImageFont
import os
import re
import unicodedata

# ===== 1. CONFIGURACIÓN Y ESTILO =====
NOMBRE_JUEGO = "Deja vú "
W, H = 640, 360
BG = (255, 247, 248)      # Fondo claro
CARD = (255, 226, 231)    # Color de la tarjeta
HILIGHT = (255, 162, 95)  # Color de resalte (Naranja)
OUTLINE = (255, 106, 166) # Borde rosa
INK = (15, 23, 42)        # Color de texto
RADIUS = 16

def slugify(nombre):
    nombre = unicodedata.normalize('NFKD', nombre).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]', '', nombre.lower().strip().replace(' ', ''))

OUT_DIR = f"public/tutos_{slugify(NOMBRE_JUEGO)}"
os.makedirs(OUT_DIR, exist_ok=True)

# ===== 2. FUNCIONES DE APOYO =====
def load_font(size):
    for p in ["arial.ttf", "SegoeUI.ttf", "DejaVuSans.ttf"]:
        try: return ImageFont.truetype(p, size)
        except: pass
    return ImageFont.load_default()

def get_text_size(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def rounded_rect(draw, xy, fill, outline, width=2, radius=RADIUS):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def draw_stimulus(draw, cx, cy, size, color):
    # Dibuja una forma abstracta (un rombo) para el juego
    s = size // 2
    draw.polygon([(cx, cy-s), (cx+s, cy), (cx, cy+s), (cx-s, cy)], fill=color)

# ===== 3. GENERACIÓN DE LOS 3 PASOS (GIFS) =====

# STEP 1: Fase de Memorización (Se muestra la secuencia)
def make_step1():
    frames = []
    font = load_font(24)
    # Mostramos 3 figuras diferentes en secuencia
    for i in range(3):
        img = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(img)
        
        # Etiqueta de fase
        txt = "PASO 1: MEMORIZA LA SECUENCIA"
        tw, th = get_text_size(d, txt, font)
        d.text(((W-tw)//2, 40), txt, fill=INK, font=font)
        
        # Tarjeta central con figura (cambia de posición ligeramente)
        cx, cy = W//2, H//2
        rounded_rect(d, [cx-60, cy-60, cx+60, cy+60], fill=CARD, outline=OUTLINE)
        # La figura cambia de color para simular una secuencia distinta
        colors = [(255, 162, 95), (106, 166, 255), (166, 255, 106)]
        draw_stimulus(d, cx, cy, 50, colors[i])
        
        for _ in range(10): frames.append(img) # Mantener cada figura un momento

    frames[0].save(f"{OUT_DIR}/tuto1.gif", save_all=True, append_images=frames[1:], duration=100, loop=0)

# STEP 2: Fase de Reconocimiento (¿Estaba esta figura?)
def make_step2():
    frames = []
    font = load_font(24)
    # Simulamos que aparece una figura y los botones de SI / NO
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    
    txt = "PASO 2: ¿ESTABA EN LA SECUENCIA?"
    tw, th = get_text_size(d, txt, font)
    d.text(((W-tw)//2, 40), txt, fill=INK, font=font)
    
    # Figura a evaluar
    rounded_rect(d, [W//2-50, H//2-70, W//2+50, H//2+30], fill=CARD, outline=OUTLINE)
    draw_stimulus(d, W//2, H//2-20, 40, HILIGHT)
    
    # Botones SI / NO
    rounded_rect(d, [W//2-110, H//2+60, W//2-10, H//2+110], fill=CARD, outline=INK)
    d.text((W//2-80, H//2+70), "SÍ", fill=INK, font=font)
    
    rounded_rect(d, [W//2+10, H//2+60, W//2+110, H//2+110], fill=CARD, outline=INK)
    d.text((W//2+40, H//2+70), "NO", fill=INK, font=font)
    
    for _ in range(30): frames.append(img)
    frames[0].save(f"{OUT_DIR}/tuto2.gif", save_all=True, append_images=frames[1:], duration=100, loop=0)

# STEP 3: Feedback (Respuesta Correcta con pulso)
def make_step3():
    frames = []
    font = load_font(24)
    for i in range(15):
        img = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(img)
        
        txt = "PASO 3: RECIBE TU PUNTAJE"
        tw, th = get_text_size(d, txt, font)
        d.text(((W-tw)//2, 40), txt, fill=INK, font=font)
        
        # Efecto de pulso en el botón SÍ (simulando clic correcto)
        p = (i if i < 8 else 15-i)
        rounded_rect(d, [W//2-110-p, H//2+60-p, W//2-10+p, H//2+110+p], fill=HILIGHT, outline=OUTLINE, width=3)
        d.text((W//2-80, H//2+70), "SÍ", fill=INK, font=font)
        
        # Botón NO se queda normal
        rounded_rect(d, [W//2+10, H//2+60, W//2+110, H//2+110], fill=CARD, outline=INK)
        d.text((W//2+40, H//2+70), "NO", fill=INK, font=font)
        
        frames.append(img)
        
    frames[0].save(f"{OUT_DIR}/tuto3.gif", save_all=True, append_images=frames[1:], duration=100, loop=0)

# ===== 4. EJECUCIÓN =====
if __name__ == "__main__":
    make_step1()
    make_step2()
    make_step3()
    print(f"✅ Tutoriales de '{NOMBRE_JUEGO}' generados en: {OUT_DIR}")