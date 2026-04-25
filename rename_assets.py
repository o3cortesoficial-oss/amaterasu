import os
import urllib.parse

for dir_name in ['ShopeePage/images', 'ShopeePage/js', 'ShopeePage/css']:
    if not os.path.exists(dir_name): continue
    for filename in os.listdir(dir_name):
        if '%' in filename:
            new_name = urllib.parse.unquote(filename)
            if new_name != filename:
                print(f'Renaming {dir_name}/{filename} to {new_name}')
                try:
                    os.rename(os.path.join(dir_name, filename), os.path.join(dir_name, new_name))
                except Exception as e:
                    print(f'Error: {e}')
