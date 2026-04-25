import os
import re

def fix_content(file_path):
    print(f'Fixing {file_path}')
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Replace \ with / in paths. 
        # In CSS, paths are usually in url() or after : / property.
        # In JS, it's more complex, but we mainly care about asset paths.
        
        # For simplicity and safety, let's target common asset extensions and directory prefixes.
        new_content = content
        
        # Replace backslashes in what looks like paths
        # This regex looks for backslashes preceded or followed by alphanumeric characters or common path chars,
        # but not part of a unicode escape (\uXXXX)
        def path_fix(match):
            s = match.group(0)
            # If it's a unicode escape, leave it alone
            if re.match(r'\\u[0-9a-fA-F]{4}', s):
                return s
            return s.replace('\\', '/')

        # Replace backslashes that are not part of an escape sequence
        # We look for \ that is NOT followed by u[0-9a-f]{4} or n, r, t, ", '
        new_content = re.sub(r'\\(?![unrt"\'\\]|[0-9]{3})', '/', new_content)

        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
    except Exception as e:
        print(f'Error fixing {file_path}: {e}')
    return False

# Directories to process
dirs = ['ShopeePage']

for d in dirs:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith(('.html', '.css', '.js')):
                fix_content(os.path.join(root, file))
