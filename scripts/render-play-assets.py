"""Render code-native brand SVGs for the Google Play upload sizes."""
from pathlib import Path
import cairosvg
root=Path(__file__).resolve().parents[1]/'docs/google-play/assets'
for name in ['icone','banner']:
    cairosvg.svg2png(url=str(root/f'{name}.svg'),write_to=str(root/f'{name}.png'))
