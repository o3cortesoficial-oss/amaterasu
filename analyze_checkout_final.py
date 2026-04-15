import re
import os

def analyze():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    print("--- PESQUISA DE INPUTS ---")
    # Capturar tag <input> completa para ver atributos
    inputs = re.findall(r'(<input[^>]+>)', content, re.I)
    for i, tag in enumerate(inputs):
        id_m = re.search(r'id="([^"]*)"', tag)
        name_m = re.search(r'name="([^"]*)"', tag)
        val_m = re.search(r'value="([^"]*)"', tag)
        
        iid = id_m.group(1) if id_m else "N/A"
        name = name_m.group(1) if name_m else "N/A"
        val = val_m.group(1) if val_m else ""
        
        if "address" in iid.lower() or "address" in name.lower() or val:
            print(f"[{i}] ID: {iid} | Name: {name} | Value: '{val}'")

    print("\n--- PESQUISA DE BOTÃO ---")
    # Procurar por "localização" com regex frouxo
    pattern = re.compile(r'localiza[ç\w]..o\s+atual', re.I)
    match = pattern.search(content)
    if match:
        print(f"Texto do botão encontrado na posição {match.start()}")
        # Pegar contexto amplo
        context = content[max(0, match.start()-500) : min(len(content), match.end()+500)]
        print("Contexto ao redor do botão:")
        print(context)

if __name__ == "__main__":
    analyze()
