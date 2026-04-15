import os

path = 'Checkout - Fase 2.html'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

target = "if (span.textContent.trim() === 'Cliente') {"
replacement = "if (span.textContent.trim() === 'Cliente' || span.textContent.trim() === 'Said') {"

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Correcao aplicada: Said -> Cliente no injection script")
else:
    print("Nao encontrei o target.")
