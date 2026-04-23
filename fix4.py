import os

path = 'css/style.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

broken_after = """body.light-mode::after {
  /* LIGHT OVERLAY: drastically reduced from 0.95 to 0.2 to remove "obstacle" masking the image */
  background: linear-gradient(135deg,
      rgba(240, 186, 154, 0.25) 0%,
      rgba(246, 235, 227, 0.20) 45%,
      rgba(238, 239, 241, 0.15) 100%) !important;
  opacity: 1 !important;
}"""

fixed_after = """body.light-mode::after {
  /* LIGHT OVERLAY: restored to high opacity so dark text is readable */
  background: linear-gradient(135deg,
      rgba(255, 250, 245, 0.95) 0%,
      rgba(246, 235, 227, 0.90) 45%,
      rgba(238, 239, 241, 0.90) 100%) !important;
  opacity: 1 !important;
}"""

content = content.replace(broken_after, fixed_after)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Light mode background restored.")
