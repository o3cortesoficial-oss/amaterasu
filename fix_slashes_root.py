import re

with open('ShopeeLandpage.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix slashes in src and href
def fix_attr(match):
    return f'{match.group(1)}="{match.group(2).replace("\\", "/")}"'

content = re.sub(r'(src|href)="([^"]+)"', fix_attr, content)

# Fix slashes in url()
def fix_url(match):
    return f'url({match.group(1).replace("\\", "/")})'

content = re.sub(r'url\(([^)]+)\)', fix_url, content)

with open('ShopeeLandpage.html', 'w', encoding='utf-8') as f:
    f.write(content)
