import os
import urllib.parse

dir_path = 'ShopeePage/images'
for filename in os.listdir(dir_path):
    if '%' in filename:
        new_name = urllib.parse.unquote(filename)
        if new_name != filename:
            print(f'Renaming {filename} to {new_name}')
            try:
                os.rename(os.path.join(dir_path, filename), os.path.join(dir_path, new_name))
            except Exception as e:
                print(f'Error: {e}')
