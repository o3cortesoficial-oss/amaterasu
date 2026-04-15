import os
import re

def undo():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Regex para capturar o script problemático
    pattern = r'<script>\s*document\.addEventListener\(\'DOMContentLoaded\',\s*function\(\)\s*\{\s*//\s*Esconder "Adicionar um cartão de crédito"[\s\S]*?</script>'
    
    match = re.search(pattern, content)
    if match:
        content = content.replace(match.group(0), '')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Script problemático removido. Layout restaurado.")
    else:
        print("Script não encontrado via regex.")

if __name__ == "__main__":
    undo()
