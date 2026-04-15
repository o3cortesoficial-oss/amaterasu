import os
import re

def find_fields_by_placeholder():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Texto exato do screenshot
    target_text = "Insira o CEP acima para preencher a cidade"
    
    print("--- BUSCA POR TEXTO DE PLACEHOLDER ---")
    matches = list(re.finditer(re.escape(target_text), content, re.I))
    
    if not matches:
        # Tenta uma busca parcial caso o encoding tenha mudado algo
        print("Texto exato não encontrado, tentando busca parcial...")
        matches = list(re.finditer(r'Insira o CEP acima', content, re.I))

    for i, m in enumerate(matches):
        # Pegar um contexto grande ao redor
        start = max(0, m.start() - 200)
        end = min(len(content), m.end() + 200)
        print(f"--- Encontro {i} ---")
        print(content[start:end])
        print("-" * 20)

if __name__ == "__main__":
    find_fields_by_placeholder()
