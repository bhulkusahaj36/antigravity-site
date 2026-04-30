import glob
import os

for file in glob.glob('*.html'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove the duplicate close button
    content = content.replace('<button class="nav-mobile-close" id="navCloseBtn" aria-label="Close menu">&times;</button>\n                ', '')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
print("Reverted HTML files")
