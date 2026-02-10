import os
import re
from PIL import Image, ImageDraw

# --- CONFIGURACIÓN DE ESTILO ---
WIDTH, HEIGHT = 640, 360
COLOR_BG = "#fff7f8"
COLOR_CARD = "#ffe2e7"
COLOR_HIGHLIGHT = "#ffa25f"
COLOR_BORDER = "#ff6aa6"
COLOR_TEXT = "#0f172a"

def slugify(text):
    """Crea un nombre de carpeta válido."""
    return re.sub(r'[\W_]+', '_', text.lower())

def create_base_frame():
    """Crea el lienzo base para todos los frames."""
    img = Image.new("RGB", (WIDTH, HEIGHT), COLOR_BG)
    draw = ImageDraw.Draw(img)
    return img, draw

def make_gif1(folder):
    """STEP 1: Presentación secuencial de luces."""
    frames = []
    positions = [(160, 180), (320, 180), (480, 180)]
    
    for i in range(len(positions) + 1):
        img, draw = create_base_frame()
        # Dibujar los 3 círculos base
        for idx, pos in enumerate(positions):
            color = COLOR_HIGHLIGHT if idx < i else COLOR_CARD
            border = COLOR_BORDER if idx < i else COLOR_TEXT
            draw.ellipse([pos[0]-40, pos[1]-40, pos[0]+40, pos[1]+40], 
                         fill=color, outline=border, width=3)
        
        # Repetir frames para dar sensación de tiempo
        for _ in range(10):
            frames.append(img)

    frames[0].save(f"{folder}/tuto1.gif", save_all=True, append_images=frames[1:], optimize=False, duration=100, loop=0)

def make_gif2(folder):
    """STEP 2: Disposición del tablero de juego."""
    frames = []
    img, draw = create_base_frame()
    
    # Dibujar tablero abstracto (cuadrícula de círculos apagados)
    for x in range(160, 640, 160):
        for y in [120, 240]:
            draw.ellipse([x-35, y-35, x+35, y+35], fill=COLOR_CARD, outline=COLOR_TEXT, width=2)
            
    # Simular un ligero parpadeo de "espera"
    for _ in range(15): frames.append(img)
    
    frames[0].save(f"{folder}/tuto2.gif", save_all=True, append_images=frames[1:], duration=100, loop=0)

def make_gif3(folder):
    """STEP 3: Simulación de interacción con efecto pulso."""
    frames = []
    center_pos = (320, 180)
    
    # Ciclo de pulso (crece y cambia de color)
    for size_offset in range(0, 15, 2):
        img, draw = create_base_frame()
        # Círculo base
        draw.ellipse([center_pos[0]-40, center_pos[1]-40, center_pos[0]+40, center_pos[1]+40], 
                     fill=COLOR_HIGHLIGHT, outline=COLOR_BORDER, width=4)
        
        # Efecto Pulso (Borde exterior que se expande)
        p_off = 40 + size_offset
        draw.ellipse([center_pos[0]-p_off, center_pos[1]-p_off, center_pos[0]+p_off, center_pos[1]+p_off], 
                     outline=COLOR_BORDER, width=2)
        
        frames.append(img)

    # Añadir frames de regreso al estado normal
    frames += frames[::-1]
    
    frames[0].save(f"{folder}/tuto3.gif", save_all=True, append_images=frames[1:], duration=60, loop=0)

if __name__ == "__main__":
    game_name = "Ruta de Luces"
    output_dir = slugify(game_name)
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    print(f"Generando tutoriales para: {game_name}...")
    make_gif1(output_dir)
    make_gif2(output_dir)
    make_gif3(output_dir)
    print(f"¡Hecho! Los archivos están en la carpeta: {output_dir}")