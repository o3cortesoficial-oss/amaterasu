import re
import os

def find_tags_by_value():
    path = 'Checkout - Fase 1.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Valores que o usuário informou/diagnóstico anterior viu
    targets = {
        "CEP": "76240000",
        "ENDEREÇO": "Rua R. A. Costa",
        "NOME": "Said Labs Global",
        "NÚMERO": "149",
        "BAIRRO": "Aragarças",
        "CIDADE": "Aragarças",
        "ESTADO": "Goiás"
    }

    print("--- MAREAMENTO DE TAGS POR VALOR ---")
    for key, val in targets.items():
        # Busca frouxa para lidar com o valor
        pattern = re.compile(rf'<input[^>]*value=\"{re.escape(val)}[^>]*>', re.I)
        match = pattern.search(content)
        if match:
            print(f"Campo {key}: {match.group(0)}")
        else:
            print(f"Campo {key}: NÃO ENCONTRADO via valor '{val}'")

    # Encontrar o botão
    btn_pattern = re.compile(r'localiza[ç\w]..o\s+atual', re.I)
    btn_match = btn_pattern.search(content)
    if btn_match:
        # Pagar container do botão (geralmente uma div ou span com classe a-button)
        ctx = content[max(0, btn_match.start()-200) : btn_match.end()+200]
        print(f"\nContexto do Botão:\n{ctx}")

if __name__ == "__main__":
    find_tags_by_value()
