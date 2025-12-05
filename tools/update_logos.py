import os
import sys
import base64
from io import BytesIO
from PIL import Image, ImageDraw

# Configuration
ROOT_DIR = r'c:\Users\Administrator\SENTNNELL_QLIK_PRO\Qlik Codex I.A'
WEB_PUBLIC = os.path.join(ROOT_DIR, 'web', 'public')
SOURCE_IMG = os.path.join(ROOT_DIR, 'logo_source.png')

COLORS = {
    'bg': (5, 11, 18, 255),
    'rect_dark': (12, 22, 33, 255),
    'green': (74, 246, 161, 255),
    'green_trans': (74, 246, 161, 60),
    'ring_dark': (20, 44, 38, 140)
}
HEX_COLORS = {
    'bg': '#050B12',
    'rect_dark': '#0C1621',
    'green': '#4AF6A1',
    'green_trans': 'rgba(74, 246, 161, 0.235)',
    'ring_dark': 'rgba(20, 44, 38, 0.55)'
}

def image_to_base64(img, format='PNG'):
    buffered = BytesIO()
    img.save(buffered, format=format)
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def generate_from_source(source_path):
    print(f"Found source image: {source_path}")
    try:
        img = Image.open(source_path).convert('RGBA')
    except Exception as e:
        print(f"Error opening image: {e}")
        return

    # 1. Favicon.ico
    size = 256
    icon_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    # Resize source to fit
    img_ratio = img.width / img.height
    if img_ratio > 1:
        new_w = size
        new_h = int(size / img_ratio)
    else:
        new_h = size
        new_w = int(size * img_ratio)
        
    img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Paste centered
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    icon_img.paste(img_resized, (x, y))
    
    ico_path = os.path.join(WEB_PUBLIC, 'favicon.ico')
    icon_img.save(ico_path, sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
    print(f"Generated ICO from source: {ico_path}")
    
    # 2. SVG (Embed PNG)
    svg_size = 512
    svg_img = Image.new('RGBA', (svg_size, svg_size), (0, 0, 0, 0))
    if img_ratio > 1:
        new_w = svg_size
        new_h = int(svg_size / img_ratio)
    else:
        new_h = svg_size
        new_w = int(svg_size * img_ratio)
    img_svg_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    x = (svg_size - new_w) // 2
    y = (svg_size - new_h) // 2
    svg_img.paste(img_svg_resized, (x, y))
    
    b64_data = image_to_base64(svg_img)
    
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_size} {svg_size}">
    <image width="{svg_size}" height="{svg_size}" href="data:image/png;base64,{b64_data}"/>
    </svg>'''
    
    for name in ['logo.svg', 'favicon.svg']:
        path = os.path.join(WEB_PUBLIC, name)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        print(f"Generated SVG from source: {path}")
        
    # 3. OG Card (Landscape 1200x630)
    card_w, card_h = 1200, 630
    card_img = Image.new('RGBA', (card_w, card_h), COLORS['bg'])
    
    target_h = 400
    target_w = int(target_h * img_ratio)
    if target_w > 1000: 
        target_w = 1000
        target_h = int(target_w / img_ratio)
        
    img_card = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    cx = (card_w - target_w) // 2
    cy = (card_h - target_h) // 2
    
    card_img.paste(img_card, (cx, cy), img_card)
    
    card_b64 = image_to_base64(card_img)
    card_svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {card_w} {card_h}">
    <image width="{card_w}" height="{card_h}" href="data:image/png;base64,{card_b64}"/>
    </svg>'''
    
    path = os.path.join(WEB_PUBLIC, 'og-card.svg')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(card_svg_content)
    print(f"Generated OG Card SVG from source: {path}")

def generate_default():
    print("Generating default geometric logos...")
    def generate_ico(path):
        size = 256
        img = Image.new('RGBA', (size, size), COLORS['bg'])
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle((10, 10, size-10, size-10), 22, fill=COLORS['rect_dark'])
        draw.rounded_rectangle((18, 18, size-18, size-18), 18, fill=COLORS['green_trans'])
        cx, cy = size // 2, size // 2
        r = 92
        draw.ellipse((cx-r, cy-r, cx+r, cy+r), outline=COLORS['green'], width=12, fill=COLORS['rect_dark'])
        draw.arc((cx-r, cy-r, cx+r, cy+r), start=300, end=120, fill=COLORS['green'], width=12)
        draw.line([(cx, cy), (cx+58, cy+66)], fill=COLORS['green'], width=12)
        draw.ellipse((cx-6, cy+78, cx+6, cy+90), fill=COLORS['green'])
        r_mid = 52
        draw.ellipse((cx-r_mid, cy-r_mid, cx+r_mid, cy+r_mid), outline=COLORS['ring_dark'], width=6)
        img.save(path, sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
        print(f"Generated ICO: {path}")

    def generate_svg(path, width=256, height=256, is_card=False):
        svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
        <rect width="100%" height="100%" fill="{HEX_COLORS['bg']}"/>
        '''
        scale = 1.0
        tx = 0
        ty = 0
        if is_card:
            tx = (width - 256) / 2
            ty = (height - 256) / 2
            svg_content += f'<g transform="translate({tx}, {ty})">'
        
        svg_content += f'''
        <rect x="10" y="10" width="236" height="236" rx="22" fill="{HEX_COLORS['rect_dark']}"/>
        <rect x="18" y="18" width="220" height="220" rx="18" fill="{HEX_COLORS['green_trans']}"/>
        <circle cx="128" cy="128" r="92" stroke="{HEX_COLORS['green']}" stroke-width="12" fill="{HEX_COLORS['rect_dark']}"/>
        <path d="M 174 48.32 A 92 92 0 0 1 82 207.67" stroke="{HEX_COLORS['green']}" stroke-width="12" fill="none" stroke-linecap="round"/>
        <line x1="128" y1="128" x2="186" y2="194" stroke="{HEX_COLORS['green']}" stroke-width="12" stroke-linecap="round"/>
        <circle cx="128" cy="212" r="6" fill="{HEX_COLORS['green']}"/>
        <circle cx="128" cy="128" r="52" stroke="{HEX_COLORS['ring_dark']}" stroke-width="6" fill="none"/>
        '''
        if is_card:
            svg_content += '</g>'
        svg_content += '</svg>'
        with open(path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        print(f"Generated SVG: {path}")

    generate_ico(os.path.join(WEB_PUBLIC, 'favicon.ico'))
    generate_svg(os.path.join(WEB_PUBLIC, 'favicon.svg'))
    generate_svg(os.path.join(WEB_PUBLIC, 'logo.svg'))
    generate_svg(os.path.join(WEB_PUBLIC, 'og-card.svg'), width=1200, height=630, is_card=True)

def main():
    if not os.path.exists(WEB_PUBLIC):
        os.makedirs(WEB_PUBLIC)
        
    if os.path.exists(SOURCE_IMG):
        generate_from_source(SOURCE_IMG)
    else:
        print("No 'logo_source.png' found in root. Generating default logos.")
        generate_default()

if __name__ == '__main__':
    main()
