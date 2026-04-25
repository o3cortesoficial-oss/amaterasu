import os
import urllib.parse

root_dir = 'ShopeePage/images'
for filename in os.listdir(root_dir):
    if '%' in filename:
        new_name = urllib.parse.unquote(filename)
        os.rename(os.path.join(root_dir, filename), os.path.join(root_dir, new_name))
        print(f"Renamed: {filename} -> {new_name}")
