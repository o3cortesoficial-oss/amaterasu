import os
import re

def fix_address_display():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Substituições seguras de TEXTO puro (sem mexer em tags HTML)
    text_replacements = [
        ('Rua R. A. Costa 149, Aragarças, Aragarças, Goiás, 76240000, Brasil', 'Seu endereço'),
        ('Rua R. A. Costa 149, Aragarças, Aragarças, Goiás, 76240000', 'Seu endereço'),
        ('Rua R. A. Costa 149', 'Seu endereço'),
        ('Rua R. A. Costa', 'Seu endereço'),
    ]
    
    for old, new in text_replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"Substituído: '{old}' -> '{new}'")

    # Limpar restos de endereço que ficaram soltos
    content = content.replace(', Aragarças, Aragarças, Goiás, 76240000, Brasil', '')
    content = content.replace(', Aragarças, Goiás, 76240000, Brasil', '')
    content = content.replace(', 76240000, Brasil', '')
    
    # Atualizar o script de carregamento para usar os novos placeholders
    # O script já injetado procura por "Rua R. A. Costa" - atualizar para "Seu endereço"
    content = content.replace(
        "el.textContent.indexOf('Rua R. A. Costa')",
        "el.textContent.indexOf('Seu endere')"
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    # Verificação
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        check = f.read()
    
    for term in ['R. A. Costa', '76240000', 'Aragarças']:
        print(f"  '{term}': {'AINDA PRESENTE' if term in check else 'OK removido'}")

    print("Concluído.")

if __name__ == "__main__":
    fix_address_display()
