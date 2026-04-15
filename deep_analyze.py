import os
import re

def deep_analyze():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    labels = ["CEP", "Endereço", "Número", "Bairro", "Cidade", "Estado", "localização atual"]
    
    print("--- ANÁLISE DE CONTEXTO ---")
    for label in labels:
        print(f"\n>>>> Buscando: '{label}'")
        # Busca case-insensitive
        matches = list(re.finditer(re.escape(label), content, re.I))
        print(f"Encontrados: {len(matches)}")
        for i, m in enumerate(matches):
            start = max(0, m.start() - 200)
            end = min(len(content), m.end() + 600)
            print(f"  --- Instância {i} ---")
            print(content[start:end])
            print("-" * 40)

if __name__ == "__main__":
    deep_analyze()
