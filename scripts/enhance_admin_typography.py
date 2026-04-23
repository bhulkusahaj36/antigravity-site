import os
import re

# 1. Update feed.css
feed_path = 'css/feed.css'
if os.path.exists(feed_path):
    with open(feed_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Refine feed-tab
    content = content.replace(
        'font-family: var(--font-gu-sans);\n    font-size: 0.9rem;\n    font-weight: 700;',
        'font-family: var(--font-en);\n    font-size: 0.8rem;\n    font-weight: 600;\n    letter-spacing: 0.08em;'
    )
    
    # Refine feed-label
    content = content.replace(
        'font-family: var(--font-en);\n    font-size: 0.62rem;\n    font-weight: 700;',
        'font-family: var(--font-en);\n    font-size: 0.65rem;\n    font-weight: 700;\n    letter-spacing: 0.12em;'
    )
    
    with open(feed_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("feed.css updated.")

# 2. Update admin.css
admin_path = 'css/admin.css'
if os.path.exists(admin_path):
    with open(admin_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Globally ensure admin uses Inter for everything except headings
    if 'font-family' not in content[:200]: # Check if already set
         content = content.replace(
            ':root {',
            'body.admin-page {\n  font-family: var(--font-en) !important;\n}\n\n:root {'
        )
    
    # Refine admin-login-subtitle
    content = content.replace(
        'font-size: 0.75rem;\n  color: var(--text-muted);\n  letter-spacing: 0.12em;',
        'font-family: var(--font-en);\n  font-size: 0.7rem;\n  color: var(--text-muted);\n  letter-spacing: 0.18em;\n  font-weight: 600;'
    )

    with open(admin_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("admin.css updated.")
