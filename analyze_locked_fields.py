import os
import re

def analyze_fields():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    ids = ['address-ui-widgets-enterAddressCity', 'address-ui-widgets-enterAddressStateOrRegion']
    
    print("--- ANÁLISE DE ATRIBUTOS ---")
    for fid in ids:
        # Busca a tag input com esse ID
        match = re.search(rf'<input[^>]+id=\"{fid}\"[^>]*>', content, re.I)
        if match:
            print(f"ID: {fid}\nTag: {match.group(0)}\n")
        else:
            print(f"ID: {fid} não encontrado via ID exato.")

if __name__ == "__main__":
    analyze_fields()
