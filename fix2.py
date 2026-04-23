import re

path = 'css/style.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken calligraphy css. Let's just restore it and apply the correct glow.
# There are 4 places. Let's find all instances of `.hero-calligraphy { filter: ... !important; }` and replace them.

import re

def fix_block(match):
    return """  filter: 
    drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5))
    drop-shadow(0 0 30px rgba(251, 191, 36, 0.6))
    drop-shadow(0 0 50px rgba(251, 191, 36, 0.4)) !important;"""

def fix_hover_block(match):
    return """  filter: 
    drop-shadow(0 4px 15px rgba(0, 0, 0, 0.6))
    drop-shadow(0 0 40px rgba(251, 191, 36, 0.7))
    drop-shadow(0 0 70px rgba(251, 191, 36, 0.5))
    brightness(1.08) !important;"""

content = re.sub(r'filter:\s*drop-shadow[^;]+!important;', fix_block, content)
# Wait, this regex is too broad, it might hit other filters.
