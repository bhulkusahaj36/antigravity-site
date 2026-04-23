import os
import re

path = 'css/style.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Typography Tokens
content = re.sub(
    r'--font-en:\s*[^;]+;',
    "--font-en:      'Inter', 'DM Sans', sans-serif;",
    content
)
content = re.sub(
    r'--font-heading:\s*[^;]+;',
    "--font-heading: 'Outfit', 'Playfair Display', serif;",
    content
)
content = re.sub(
    r'--font-display:\s*[^;]+;',
    "--font-display: 'Outfit', 'Inter', sans-serif;",
    content
)

# 2. Enhance Body Style (professional smoothing and tracking)
content = content.replace(
    'font-family: var(--font-gu-sans), var(--font-en);',
    'font-family: var(--font-gu-sans), var(--font-en);\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  letter-spacing: 0.01em;'
)

# 3. Professional Form Labels
content = content.replace(
    'font-family: var(--font-en);\n  font-size: 0.75rem;\n  font-weight: 600;\n  letter-spacing: 0.08em;',
    'font-family: var(--font-en);\n  font-size: 0.7rem;\n  font-weight: 700;\n  letter-spacing: 0.12em;'
)

# 4. Enhance Section Titles
section_title_search = r'.section-title {\s*font-family: var\(--font-gu\);\s*font-size: ([^;]+);\s*font-weight: 700;'
section_title_replace = r'.section-title {\n  font-family: var(--font-heading);\n  font-size: \1;\n  font-weight: 700;\n  letter-spacing: -0.02em;'
content = re.sub(section_title_search, section_title_replace, content)

# 5. Add global heading defaults if not present
if 'h1, h2, h3, h4, h5, h6 {' not in content:
    heading_defaults = """
/* Global Typography Hierarchy */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-title);
  letter-spacing: -0.02em;
}

p {
  margin-bottom: 1.5rem;
}
"""
    # Insert after variables
    content = re.sub(r'(:root \{[^}]+\})', r'\1\n' + heading_defaults, content, count=1)

# 6. Admin Page Font Override (use Inter for professional dashboard)
content = content.replace(
    'body.admin-page {',
    'body.admin-page {\n  font-family: var(--font-en) !important;'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Typography enhanced for professional look.")
