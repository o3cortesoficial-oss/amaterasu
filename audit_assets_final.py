import os
import re

def audit_assets():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    print("--- AUDITORIA DE ATIVOS (SRC/HREF) ---")
    
    # Links
    links = re.findall(r'href=["\'](https?://[^"\']*amazon[^"\']*)["\']', content, re.I)
    print(f"Links (href): {len(links)}")
    for l in set(links):
        print(f"  - {l}")

    # Imagens/Assets
    srcs = re.findall(r'src=["\'](https?://[^"\']*amazon[^"\']*)["\']', content, re.I)
    print(f"\nAtivos (src): {len(srcs)}")
    for s in set(srcs):
        print(f"  - {s}")

    # Form Actions
    forms = re.findall(r'<form[^>]+action=["\']([^"\']*)["\']', content, re.I)
    print(f"\nForm Actions: {forms}")

if __name__ == "__main__":
    audit_assets()
