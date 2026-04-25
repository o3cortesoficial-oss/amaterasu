from bs4 import BeautifulSoup
import os

with open('ShopeePageFinal/index.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

refs = set()
for tag in soup.find_all(['link', 'script', 'img']):
    if tag.name == 'link' and tag.get('href'):
        refs.add(tag.get('href'))
    elif tag.name == 'script' and tag.get('src'):
        refs.add(tag.get('src'))
    elif tag.name == 'img' and tag.get('src'):
        refs.add(tag.get('src'))

# Also check for url() in style tags
import re
for style in soup.find_all('style'):
    urls = re.findall(r'url\([\'"]?([^\'"]+)[\'"]?\)', style.string or '')
    for u in urls:
        refs.add(u)

# Filter out absolute URLs
local_refs = [r for r in refs if not r.startswith(('http', '//', 'data:'))]

print("Referenced local files:")
for r in sorted(local_refs):
    print(r)
