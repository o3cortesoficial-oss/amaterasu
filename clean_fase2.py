import os
import re

def clean_fase2_address():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Substituir textos hardcoded por placeholders genéricos
    replacements = {
        'Said Labs Global': 'Seu nome',
        'Rua R. A. Costa 149': 'Seu endereço',
        'Rua R. A. Costa': 'Seu endereço',
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)

    # Limpar endereço completo em variações
    # Pattern: "Aragarças, Aragarças, Goiás, 76240000, Brasil" ou similar
    content = re.sub(r'Aragarças,?\s*Aragarças,?\s*Goiás,?\s*76240000,?\s*Brasil', '', content, flags=re.I)
    content = re.sub(r',?\s*Aragarças', '', content, flags=re.I)
    content = re.sub(r',?\s*76240000', '', content, flags=re.I)
    content = re.sub(r',?\s*Goiás', '', content, flags=re.I)
    content = content.replace(', 149,', ',')
    content = content.replace(', 149', '')
    content = content.replace(' 149,', ',')

    # Limpar value attributes também
    content = re.sub(r'value=["\']?Said Labs Global["\']?', 'value=""', content, flags=re.I)
    content = re.sub(r'value=["\']?Rua R\. A\. Costa["\']?', 'value=""', content, flags=re.I)
    content = re.sub(r'value=["\']?76240000["\']?', 'value=""', content, flags=re.I)
    content = re.sub(r'value=["\']?149["\']?', 'value=""', content, flags=re.I)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Dados hardcoded limpos da Fase 2.")

    # Verificação
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        check = f.read()
    
    remaining = []
    for term in ['Said Labs', 'R. A. Costa', '76240000']:
        if term in check:
            remaining.append(term)
    
    if remaining:
        print(f"AVISO: Ainda encontrados: {remaining}")
    else:
        print("Verificação OK - nenhum dado antigo encontrado.")

if __name__ == "__main__":
    clean_fase2_address()
