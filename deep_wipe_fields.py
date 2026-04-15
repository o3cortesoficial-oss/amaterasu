import os
import re

def wipe_values():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Regex para capturar value= seguido por:
    # 1. Valor entre aspas duplas: value="val"
    # 2. Valor entre aspas simples: value='val'
    # 3. Valor sem aspas até o próximo espaço ou >: value=val
    # Substitui por value=""
    
    # Padrão para valores com aspas
    content = re.sub(r'value=["\'][^"\']*["\']', 'value=""', content, flags=re.I)
    
    # Padrão para valores SEM aspas (termina em espaço ou > ou fim da tag)
    # Procuramos value= seguido de caracteres que não sejam espaço ou > ou aspas
    content = re.sub(r'value=([^\s"\'>]+)', 'value=""', content, flags=re.I)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Limpeza de campos concluída com sucesso.")

if __name__ == "__main__":
    wipe_values()
