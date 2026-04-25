import os

def fix_links(file_path):
    print(f'Updating links in {file_path}')
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Replace the specific logo name
        new_content = content.replace('Logo Shopee White-d247f0f6.webp', 'Logo_Shopee_White-d247f0f6.webp')
        new_content = new_content.replace('Logo%20Shopee%20White-d247f0f6.webp', 'Logo_Shopee_White-d247f0f6.webp')

        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
    except Exception as e:
        print(f'Error updating {file_path}: {e}')
    return False

dirs = ['ShopeePage']
for d in dirs:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith(('.html', '.css', '.js')):
                fix_links(os.path.join(root, file))
