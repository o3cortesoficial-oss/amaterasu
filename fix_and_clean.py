import re
import os

def fix_and_clean():
    path = 'Checkout - Fase 1.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 1. Limpar valores hardcoded (os que o usuário mencionou)
    # 76240000, Aragarças, Goiás, 149
    content = content.replace('value="76240000"', 'value=""')
    content = content.replace('value="Aragarças"', 'value=""')
    content = content.replace('value="Goiás"', 'value=""')
    content = content.replace('value="149"', 'value=""')
    
    # 2. Procurar o ID correto da linha de endereço (rua)
    # Vamos listar todos os IDs que terminam em AddressLine1 ou similar
    ids = re.findall(r'id="([^"]*AddressLine1[^"]*)"', content)
    print(f"IDs de Rua encontrados: {ids}")
    
    # 3. Procurar o botão com regex flexível para ignorar acentos
    # localiza..o atual
    btn_match = re.search(r'localiza[ç\w]..o\s+atual', content, re.I)
    if btn_match:
        print(f"Botão encontrado via regex!")
        chunk = content[btn_match.start()-200:btn_match.end()+200]
        # Pegar o ID do container do botão
        id_match = re.search(r'id="([^"]*)"', chunk)
        if id_match:
            print(f"ID Provável do Botão: {id_match.group(1)}")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("HTML limpo de valores fixos.")

if __name__ == "__main__":
    fix_and_clean()
