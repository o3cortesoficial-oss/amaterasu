from bs4 import BeautifulSoup
import re

def remove_all_atc_remnants(file_path):
    print(f"Limpando resqucios em: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # IDs comuns de botes de carrinho da Amazon que podem deixar rastros
    atc_ids = [
        'add-to-cart-button', 'atc-declarative', 'atc-button-mobile', 
        'add-to-cart-button-ubs', 'atc-button', 'atc-container'
    ]
    
    for aid in atc_ids:
        for tag in soup.find_all(id=re.compile(aid, re.I)):
            tag.decompose()
            print(f"Removido container por ID: {tag.get('id')}")

    # Classes comuns que geram o fundo amarelo
    atc_classes = ['a-button-stack', 'atc-button-text', 'atc-button']
    for cls in atc_classes:
        for tag in soup.find_all(class_=re.compile(cls, re.I)):
            # S remove se no tiver o boto de "Comprar Agora" dentro (preservar o checkout)
            if not tag.find(string=lambda x: x and 'Comprar' in x):
                tag.decompose()
                print(f"Removido container por classe: {cls}")

    # Remover spans de boto vazios (Amazon anatomy)
    for span in soup.find_all('span', class_='a-button-inner'):
        if not span.get_text(strip=True):
            # Se o pai for um span ou div de botao, removemos o pai tambem
            parent = span.parent
            if parent and ('a-button' in str(parent.get('class', '')).lower()):
                parent.decompose()
                print("Removido container de boto vazio.")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print("Processo de limpeza finalizado.")

if __name__ == "__main__":
    remove_all_atc_remnants("Landpagedrone.html")
