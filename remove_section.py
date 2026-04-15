from bs4 import BeautifulSoup

def remove_purchased_section(file_path):
    print(f"Lendo e filtrando: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # Texto alvo (pode variar codificacao, entao buscamos parcial)
    target_texts = [
        "Clientes que compraram este item também compraram", 
        "Clientes que compraram este item tamb",
        "Frequentemente comprados juntos",
        "Você também vai gostar de",
        "Voc\u00ea tamb\u00e9m vai gostar de"
    ]
    
    removed = False
    # Procurar por headings que contem o texto
    for h in soup.find_all(['h2', 'h1', 'h3', 'h4', 'span']):
        text = h.get_text().strip()
        if any(target in text for target in target_texts):
            print(f"Encontrado header: {text}")
            # Subir na árvore para encontrar o container principal da seção
            # Geralmente é um div com id começando com 'vsp' ou 'purchase-sims' ou uma classe amazon de widget
            container = h.find_parent('div', class_=lambda x: x and ('carousel' in x or 'p13n' in x or 'sims' in x))
            if not container:
                # Se não achou por classe, tenta subir alguns níveis até um div genérico grande
                container = h.parent
                # Amazon costuma envolver em várias camadas. Vamos tentar achar um div que pareça um container de seção
                for _ in range(5):
                    if container.name == 'div':
                        break
                    container = container.parent
            
            if container:
                print(f"Removendo container: {container.name} ID: {container.get('id')} Class: {container.get('class')}")
                container.decompose()
                removed = True
    
    # Se ainda sobrar texto solto que não foi pego pelo container automático, fazemos uma limpeza por ID
        # Busca alternativa caso o BeautifulSoup não pegue o texto direto (ex: texto dentro de atributos ou quebrado)
        print("Tenta busca alternativa por padrões de ID/Class da Amazon...")
        # IDs comuns para essa seção
        for id_val in ['purchase-sims-feature', 'purchase-sims', 'similarities_feature_div', 'desktop-dp-sims_purchase-sims-feature']:
            element = soup.find(id=id_val)
            if element:
                print(f"Removendo por ID: {id_val}")
                element.decompose()
                removed = True
    
    if removed:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(str(soup))
        print("Seção removida com sucesso.")
    else:
        print("Não foi possível encontrar a seção para remoção.")

if __name__ == "__main__":
    remove_purchased_section("Landpagedrone.html")
