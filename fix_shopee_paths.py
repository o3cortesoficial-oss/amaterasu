import re

with open('ShopeePage/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace \ with / in src and href attributes
def fix_paths(match):
    attr = match.group(1)
    path = match.group(2)
    return f'{attr}="{path.replace("\\", "/")}"'

content = re.sub(r'(src|href)="([^"]+)"', fix_paths, content)

# Also fix the double encoded space in images
content = content.replace('%2520', '%20')

with open('ShopeePage/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
