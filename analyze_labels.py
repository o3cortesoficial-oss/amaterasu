import os
import re

def analyze_labels():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Labels de endereço em português
    targets = ["CEP", "Endereço", "Número", "Bairro", "Cidade", "Estado", "localização atual"]
    
    print("--- PESQUISA DE LABELS E INPUTS ---")
    for t in targets:
        print(f"\n>>>> Buscando '{t}':")
        # Encontrar todas as posições da label
        for m in re.finditer(re.escape(t), content, re.I):
            # Ver o contexto DEPOIS da label (onde o input deve estar)
            context = content[m.end() : m.end() + 500]
            # Tentar achar o primeiro <input> ou <select> nesse contexto
            inp_match = re.search(r'<(input|select)[^>]*>', context, re.I)
            if inp_match:
                tag = inp_match.group(0)
                print(f"  Encontrado no índice {m.start()}: {tag}")
            else:
                print(f"  Nenhum input encontrado logo após a label no índice {m.start()}")

if __name__ == "__main__":
    analyze_labels()
