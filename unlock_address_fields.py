import os
import re

def unlock_fields():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # IDs dos campos a desbloquear
    ids = ['address-ui-widgets-enterAddressCity', 'address-ui-widgets-enterAddressStateOrRegion']
    
    for fid in ids:
        # Regex para capturar a tag completa do input com esse ID
        # Lidamos com tags que podem estar em múltiplas linhas
        pattern = rf'(<input[^>]+id=\"{fid}\"[^>]*>)'
        match = re.search(pattern, content, re.I | re.DOTALL)
        
        if match:
            original_tag = match.group(0)
            new_tag = original_tag
            
            # 1. Remover atributos de bloqueio
            new_tag = re.sub(r'\sreadonly\b', '', new_tag, flags=re.I)
            new_tag = re.sub(r'\sdisabled\b', '', new_tag, flags=re.I)
            new_tag = re.sub(r'\stabindex\s*=\s*[\"\']-1[\"\']', '', new_tag, flags=re.I)
            
            # 2. Remover classe de aparência bloqueada
            new_tag = new_tag.replace('autoCompleteDisabled', '')
            
            # 3. Limpar placeholders enganosos
            if 'City' in fid:
                new_tag = re.sub(r'placeholder=\"[^\"]*\"', 'placeholder="Cidade"', new_tag, flags=re.I)
            else:
                new_tag = re.sub(r'placeholder=\"[^\"]*\"', 'placeholder="Estado"', new_tag, flags=re.I)
            
            # Aplicar a substituição no conteúdo global
            content = content.replace(original_tag, new_tag)
            print(f"Campo {fid} desbloqueado.")
        else:
            print(f"Campo {fid} não encontrado.")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Processo de desbloqueio concluído.")

if __name__ == "__main__":
    unlock_fields()
