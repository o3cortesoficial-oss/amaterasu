from bs4 import BeautifulSoup

def cleanup_and_fix(file_path):
    print(f"Limpando duplicatas em: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # 1. Remover o bloco "congelado" (ID ou classe identificada)
    # Identificamos a classe '_universal-detail-ilm-card_style_mobile__CG11l' e potencialmente outros
    target_classes = ['_universal-detail-ilm-card_style_mobile__CG11l', '_universal-detail-ilm-card_style_image__2jCsj']
    removed_count = 0
    for cls in target_classes:
        for tag in soup.find_all(class_=cls):
            tag.decompose()
            removed_count += 1
            
    # Remover também o antigo #image-block-pagination-dots se ele ainda existir fora do nosso container
    for tag in soup.find_all(id="image-block-pagination-dots"):
        # Se NÃO estiver dentro do nosso novo container
        if not tag.find_parent(id="image-block-container"):
            tag.decompose()
            removed_count += 1

    print(f"Removidos {removed_count} elementos duplicados/congelados.")

    # 2. Corrigir as imagens do novo carrossel (garantir que carreguem)
    # Se elas estão aparecendo como "quebradas" no navegador do cliente, 
    # pode ser por causa de 'referrer-policy' ou bloqueio de cache.
    # Vamos adicionar a tag meta para permitir o carregamento
    if soup.head and not soup.find("meta", attrs={"name": "referrer"}):
        new_meta = soup.new_tag("meta", attrs={"name": "referrer", "content": "no-referrer"})
        soup.head.append(new_meta)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
    print("Cleanup e correção de imagens concluídos.")

if __name__ == "__main__":
    cleanup_and_fix("Landpagedrone.html")
