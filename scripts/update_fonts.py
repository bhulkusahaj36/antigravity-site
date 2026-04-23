import os
import re

font_link = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@300;400;600;700&family=Noto+Serif+Gujarati:wght@400;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap'

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to find the Google Fonts href and replace it
    new_content = re.sub(
        r'https://fonts\.googleapis\.com/css2\?family=[^"\']+',
        font_link,
        content
    )
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated fonts in {file_path}")

print("Done.")
