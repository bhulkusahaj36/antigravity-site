import os

path = 'css/style.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

broken_1 = """  filter: 
    drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5)
    drop-shadow(0 0 30px rgba(251, 191, 36, 0.65))
    drop-shadow(0 0 60px rgba(251, 191, 36, 0.45)))
    drop-shadow(0 0 25px rgba(251, 191, 36, 0.6)) drop-shadow(0 0 45px rgba(251, 191, 36, 0.4)) !important;"""

fixed_1 = """  filter: 
    drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5))
    drop-shadow(0 0 30px rgba(251, 191, 36, 0.6))
    drop-shadow(0 0 60px rgba(251, 191, 36, 0.4)) !important;"""

broken_2 = """  filter: 
    drop-shadow(0 4px 15px rgba(0, 0, 0, 0.6)
    drop-shadow(0 0 30px rgba(251, 191, 36, 0.65))
    drop-shadow(0 0 60px rgba(251, 191, 36, 0.45)))
    drop-shadow(0 0 25px rgba(251, 191, 36, 0.5))
    brightness(1.08) !important;"""

fixed_2 = """  filter: 
    drop-shadow(0 4px 15px rgba(0, 0, 0, 0.6))
    drop-shadow(0 0 40px rgba(251, 191, 36, 0.7))
    drop-shadow(0 0 70px rgba(251, 191, 36, 0.5))
    brightness(1.08) !important;"""

content = content.replace(broken_1, fixed_1)
content = content.replace(broken_2, fixed_2)

# Also fix the mobile one if broken:
broken_3 = """  filter: 
    drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5)
    drop-shadow(0 0 30px rgba(251, 191, 36, 0.65))
    drop-shadow(0 0 60px rgba(251, 191, 36, 0.45)))
    drop-shadow(0 0 15px rgba(251, 191, 36, 0.3)) !important;"""

fixed_3 = """  filter: 
    drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))
    drop-shadow(0 0 25px rgba(251, 191, 36, 0.6))
    drop-shadow(0 0 45px rgba(251, 191, 36, 0.4)) !important;"""

content = content.replace(broken_3, fixed_3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fix applied.")
