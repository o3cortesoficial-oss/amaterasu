import os
import re

def audit_checkout():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    print("--- AUDITORIA DE REDIRECIONAMENTOS E LINKS ---")
    
    # 1. Links em tags <a>
    links = re.findall(r'<a[^>]+href=\"([^\"]*amazon[^\"]*)\"', content, re.I)
    print(f"Links em <a> apontando para Amazon: {len(links)}")
    for l in set(links):
        print(f"  - {l}")

    # 2. Ações de Formulário
    forms = re.findall(r'<form[^>]+action=\"([^\"]*amazon[^\"]*)\"', content, re.I)
    print(f"\nFormulários apontando para Amazon: {len(forms)}")
    for f in set(forms):
        print(f"  - {f}")

    # 3. Scripts externos
    scripts = re.findall(r'<script[^>]+src=\"([^\"]*amazon[^\"]*)\"', content, re.I)
    print(f"\nScripts carregados da Amazon: {len(scripts)}")
    for s in set(scripts):
        print(f"  - {s}")

    # 4. Referências em Scripts (window.location, href rewriting)
    js_refs = re.findall(r'location\.href\s*=\s*[\"\']([^\"\']*amazon[^\"\']*)[\"\']', content, re.I)
    print(f"\nRedirecionamentos JS diretos encontrados: {len(js_refs)}")
    for r in set(js_refs):
        print(f"  - {r}")

if __name__ == "__main__":
    audit_checkout()
