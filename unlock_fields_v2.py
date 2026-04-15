import os
import re

def unlock_fields_final():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # IDs dos campos a desbloquear (buscando sem aspas também)
    ids = ['address-ui-widgets-enterAddressCity', 'address-ui-widgets-enterAddressStateOrRegion']
    
    for fid in ids:
        # Regex flexível para id=valor ou id="valor" ou id='valor'
        pattern = rf'(<input[^>]+id=["\']?{re.escape(fid)}["\']?[^>]*>)'
        matches = list(re.finditer(pattern, content, re.I | re.DOTALL))
        
        if matches:
            for match in matches:
                original_tag = match.group(0)
                new_tag = original_tag
                
                # 1. Remover atributos de bloqueio
                new_tag = re.sub(r'\sreadonly\b', '', new_tag, flags=re.I)
                new_tag = re.sub(r'\sdisabled\b', '', new_tag, flags=re.I)
                new_tag = re.sub(r'\stabindex\s*=\s*["\']?-1["\']?', '', new_tag, flags=re.I)
                
                # 2. Remover classe de aparência bloqueada
                new_tag = new_tag.replace('autoCompleteDisabled', '')
                
                # 3. Limpar placeholders
                if 'City' in fid:
                    new_tag = re.sub(r'placeholder=["\'][^"\']*["\']', 'placeholder="Cidade"', new_tag, flags=re.I)
                    new_tag = re.sub(r'placeholder=([^\s>]+)', 'placeholder="Cidade"', new_tag, flags=re.I)
                else:
                    new_tag = re.sub(r'placeholder=["\'][^"\']*["\']', 'placeholder="Estado"', new_tag, flags=re.I)
                    new_tag = re.sub(r'placeholder=([^\s>]+)', 'placeholder="Estado"', new_tag, flags=re.I)
                
                content = content.replace(original_tag, new_tag)
                print(f"Instância de {fid} desbloqueada.")
        else:
            print(f"ID {fid} não encontrado.")

    # FALLBACK: Remover agressivamente qualquer readonly de inputs que tenham o texto do placeholder
    content = re.sub(r'(<input[^>]+)readonly([^>]+Insira o CEP acima[^>]*>)', r'\1 \2', content, flags=re.I)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Processo concluído.")

if __name__ == "__main__":
    unlock_fields_final()
