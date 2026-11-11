from PIL import Image, ImageDraw
import os

# Create proper icons
def create_icon(size, filename):
    img = Image.new('RGBA', (size, size), (10, 10, 15, 255))
    draw = ImageDraw.Draw(img)
    # Draw a simple vortex/circle design
    center = size // 2
    radius = size // 3
    for i in range(5):
        r = radius + i * 15
        color = (0, 200, 255, 255 - i * 40)
        draw.ellipse([center - r, center - r, center + r, center + r], outline=color, width=3)
    img.save(filename)

def create_splash(size, filename):
    img = Image.new('RGBA', (size, size), (10, 10, 15, 255))
    draw = ImageDraw.Draw(img)
    center = size // 2
    # Draw "Beat Vortex" text area
    draw.rectangle([center - 150, center - 50, center + 150, center + 50], outline=(0, 200, 255), width=3)
    draw.rectangle([center - 100, center + 80, center + 100, center + 120], fill=(0, 200, 255, 100))
    img.save(filename)

os.makedirs('src/assets/images', exist_ok=True)
create_icon(1024, 'src/assets/images/icon.png')
create_icon(1024, 'src/assets/images/adaptive-icon.png')
create_splash(2732, 'src/assets/images/splash.png')
create_icon(256, 'src/assets/images/favicon.png')
print("Assets generated successfully!")
