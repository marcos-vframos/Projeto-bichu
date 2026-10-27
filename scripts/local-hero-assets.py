"""Reproduce the existing breed crop coordinates as committed local assets.

This is an asset preparation step, not a runtime dependency. The source artwork
and crop geometry are the same ones already used by breed-assets.ts.
"""
from pathlib import Path
import re
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Image.open(root / 'src/assets/chatgpt-image-25092026-093110-a269f.webp')
definitions = (root / 'src/lib/breed-assets.ts').read_text()
output = root / 'public/heroes'
output.mkdir(exist_ok=True)
width, height = source.size
cell_width = width / 3
row_height = height * (0.938 if height > 1000 else 1) / 7
for match in re.finditer(r"(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*\{\s*col:\s*(\d),\s*row:\s*(\d)", definitions):
    name, bare, col, row = match.groups()
    name = name or bare
    # Match Math.round used by the existing browser-side crop implementation.
    rounded = lambda v: int(v + 0.5)
    x, y = rounded(int(col) * cell_width), rounded(int(row) * row_height)
    crop = source.crop((x, y, x + rounded(cell_width), y + rounded(row_height)))
    crop.save(output / (name + '.png'), optimize=True)
print('Local breed portraits:', len(list(output.glob('*.png'))))
