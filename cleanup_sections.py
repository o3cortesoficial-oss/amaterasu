from bs4 import BeautifulSoup
import sys

def remove_sections(file_path):
    print(f"Limpando seções indesejadas em: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # Lista de palavras-chave para encontrar os títulos das seções
    keywords = ["frequentemente comprados", "você também vai gostar", "patrocinado", "clientes que compraram"]
    
    removed_count = 0
    
    for keyword in keywords:
        # Encontrar todas as ocorrências de texto que contenham a palavra-chave
        tags = soup.find_all(string=lambda x: x and keyword in x.lower())
        for tag in tags:
            # Subir na hierarquia até encontrar um container (div) que pareça ser a seção completa
            # Geralmente subimos até encontrar uma classe que comece com 'celwidget' ou um 'ilm' card
            parent = tag.parent
            while parent and parent.name != 'body':
                # Critérios para identificar o container da seção (Amazon usa padrões específicos)
                classes = parent.get('class', [])
                parent_id = parent.get('id', '')
                
                if (any('card' in c.lower() for c in classes) or 
                    any('widget' in c.lower() for c in classes) or 
                    'fbt' in parent_id.lower() or 
                    'recommendations' in parent_id.lower()):
                    
                    parent.decompose()
                    removed_count += 1
                    print(f"Seção removida: {keyword} (ID={parent_id})")
                    break
                parent = parent.parent

    # Remoção forçada por IDs conhecidos se sobrarem
    known_ids = [
        "fbt_x86_ilm_card", "sims-fbt", "desktop_recommendations_1", 
        "sp_detail", "sp_detail2", "bottomRow", "raw-data-fbt"
    ]
    for kid in known_ids:
        found = soup.find(id=kid)
        if found:
            found.decompose()
            removed_count += 1
            print(f"Removido ID conhecido: {kid}")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    
    print(f"Limpeza concluída. Total de seções removidas: {removed_count}")

if __name__ == "__main__":
    remove_sections("Landpagedrone.html")
