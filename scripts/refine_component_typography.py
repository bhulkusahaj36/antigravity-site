import os
import re

path = 'css/style.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Refine Card Title
content = content.replace(
    '.card-title {',
    '.card-title {\n  font-family: var(--font-gu);\n  letter-spacing: -0.01em;'
)

# Refine Card Excerpt for better readability (using sans-serif for body text is more modern/professional)
content = content.replace(
    '.card-excerpt {',
    '.card-excerpt {\n  font-family: var(--font-gu-sans);\n  letter-spacing: 0.015em;'
)

# Refine Read More Button
content = content.replace(
    '.read-more {',
    '.read-more {\n  font-family: var(--font-en);\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  text-transform: uppercase;'
)

# Refine Category Chips
content = content.replace(
    '.category-chip {',
    '.category-chip {\n  font-family: var(--font-gu-sans);\n  font-weight: 600;'
)

# Refine Navigation Links
content = content.replace(
    '.nav-link {',
    '.nav-link {\n  font-family: var(--font-en);\n  font-weight: 500;\n  letter-spacing: 0.03em;'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Component typography refined.")
