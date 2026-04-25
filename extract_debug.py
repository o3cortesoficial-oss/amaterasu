import zipfile
import os

with zipfile.ZipFile('Shopee page.zip', 'r') as zip_ref:
    zip_ref.extractall('ShopeePagePython')

print("Extracted files:")
for root, dirs, files in os.walk('ShopeePagePython'):
    for file in files:
        print(os.path.join(root, file))
