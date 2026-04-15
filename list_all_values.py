import re
import os

def list_values():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Regex para pegar o id e o valor de tags que tenham value="..."
    matches = re.finditer(r'<[^>]+(?:id|name)=["\']([^"\']+)["\'][^>]*value=["\']([^"\']*)["\']', content, re.I)
    
    print("--- VALORES ENCONTRADOS EM INPUTS/SELECTS ---")
    found = False
    for m in matches:
        el_id = m.group(1)
        val = m.group(2)
        if val.strip() and not val.startswith('http'): # Ignorar URLs
            print(f"ID/Nome: {el_id} | Valor: '{val}'")
            found = True
    
    if not found:
        print("Nenhum valor hardcoded encontrado.")

if __name__ == "__main__":
    list_values()
