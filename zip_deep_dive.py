import zipfile
with zipfile.ZipFile('Shopee page.zip', 'r') as z:
    for info in z.infolist():
        print(f"{info.filename} (size: {info.file_size})")
