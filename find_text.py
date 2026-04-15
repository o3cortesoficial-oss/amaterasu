import os
import re

def find_raw_text():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Alvos a serem limpos
    targets = ['Said Labs Global', 'Rua R. A. Costa', '76240000', 'Aragarças']
    
    print("--- PESQUISA TEXTUAL ---")
    for t in targets:
        matches = list(re.finditer(re.escape(t), content, re.I))
        print(f"\n>>>> Texto: '{t}' | Ocorrências: {len(matches)}")
        for i, m in enumerate(matches):
            start = max(0, m.start() - 150)
            end = min(len(content), m.end() + 150)
            print(f"  --- Instância {i} ---")
            print(content[start:end])
            print("-" * 20)

if __name__ == "__main__":
    find_raw_text()
