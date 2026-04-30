import glob

files = glob.glob('*.html')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'id="navLinks"' in content and '<button class="nav-mobile-close"' not in content:
        # For role="list"
        old_str1 = '<ul class="nav-links" id="navLinks" role="list">\n                <li><a href="prasangs.html"'
        new_str1 = '<ul class="nav-links" id="navLinks" role="list">\n                <button class="nav-mobile-close" id="navCloseBtn" aria-label="Close menu">&times;</button>\n                <li><a href="prasangs.html"'
        
        # For without role="list"
        old_str2 = '<ul class="nav-links" id="navLinks">\n                <li><a href="prasangs.html"'
        new_str2 = '<ul class="nav-links" id="navLinks">\n                <button class="nav-mobile-close" id="navCloseBtn" aria-label="Close menu">&times;</button>\n                <li><a href="prasangs.html"'
        
        if old_str1 in content:
            content = content.replace(old_str1, new_str1)
        elif old_str2 in content:
            content = content.replace(old_str2, new_str2)
        else:
            # Fallback
            content = content.replace('<ul class="nav-links" id="navLinks">', '<ul class="nav-links" id="navLinks">\n                <button class="nav-mobile-close" id="navCloseBtn" aria-label="Close menu">&times;</button>')
            content = content.replace('<ul class="nav-links" id="navLinks" role="list">', '<ul class="nav-links" id="navLinks" role="list">\n                <button class="nav-mobile-close" id="navCloseBtn" aria-label="Close menu">&times;</button>')

        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
