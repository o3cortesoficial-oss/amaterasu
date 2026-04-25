import os

def fix_slashes(file_path):
    print(f'Fixing slashes in {file_path}')
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Replace // with / in paths, but NOT after http: or https:
        # Actually, simpler: replace // with / globally, then fix http:/ back to http://
        new_content = content.replace('////', '//')
        new_content = new_content.replace('///', '//')
        
        # Ensure http:// and https:// are correct
        new_content = new_content.replace('http:///', 'http://')
        new_content = new_content.replace('https:///', 'https://')

        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
    except Exception as e:
        print(f'Error fixing slashes in {file_path}: {e}')
    return False

dirs = ['ShopeePage']
for d in dirs:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith(('.html', '.css', '.js')):
                fix_slashes(os.path.join(root, file))
