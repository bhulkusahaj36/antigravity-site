import re

path = 'css/style.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix prabhudasbhai scale and translateY
content = re.sub(
    r'transform:\s*scale\(2\.4\)\s*translateY\(12\%\);',
    r'transform: scale(3.2) translateY(24%);',
    content
)

content = re.sub(
    r'transform:\s*scale\(2\.5\)\s*translateY\(12\%\);',
    r'transform: scale(3.3) translateY(24%);',
    content
)

# Add glow to hero-calligraphy
# Finding the block:
# .hero-calligraphy {
#   filter: 
#     drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5))
#     drop-shadow(0 0 15px rgba(251, 191, 36, 0.3)) !important;
glow_pattern = r'drop-shadow\(0 0 15px rgba\(251, 191, 36, 0\.3\)\) !important;'
glow_replacement = r'drop-shadow(0 0 25px rgba(251, 191, 36, 0.6)) drop-shadow(0 0 45px rgba(251, 191, 36, 0.4)) !important;'
content = re.sub(glow_pattern, glow_replacement, content)

# There might also be a rule without !important earlier in the file, let's search and replace more broadly:
content = re.sub(
    r'(\.hero-calligraphy\s*\{[^}]*?filter:\s*drop-shadow\([^)]+\))(\s+drop-shadow\([^)]+\))?([^}]*?\})',
    lambda m: m.group(1) + '\n    drop-shadow(0 0 30px rgba(251, 191, 36, 0.65))\n    drop-shadow(0 0 60px rgba(251, 191, 36, 0.45))' + m.group(3),
    content
)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("CSS fixed.")
