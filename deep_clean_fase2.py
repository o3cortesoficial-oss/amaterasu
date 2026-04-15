import os
import re

def deep_clean_fase2():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Buscar e listar TODAS as ocorrências de "Said Labs"
    matches = list(re.finditer(r'Said Labs\s*\w*', content, re.I))
    print(f"Ocorrências restantes de 'Said Labs': {len(matches)}")
    for m in matches:
        start = max(0, m.start() - 50)
        end = min(len(content), m.end() + 50)
        print(f"  Contexto: ...{content[start:end]}...")

    # Substituir todas as variações
    content = re.sub(r'Said Labs Global', 'Seu nome', content, flags=re.I)
    content = re.sub(r'Said Labs', 'Seu nome', content, flags=re.I)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    # Verificação final
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        check = f.read()
    
    for term in ['Said Labs', 'R. A. Costa', '76240000', 'Aragarças']:
        if term in check:
            print(f"AINDA PRESENTE: {term}")
        else:
            print(f"OK: {term} removido")

if __name__ == "__main__":
    deep_clean_fase2()
