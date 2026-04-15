from bs4 import BeautifulSoup
import re

def update_prices(file_path):
    print(f"Atualizando preos em: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # Valores calculados
    old_price_str = "748,49"
    new_price_whole = "138"
    new_price_fraction = "77"
    discount_pct = "-81%"
    
    # 1. Atualizar porcentagem de desconto
    # Amazon costuma usar a-color-price ou spans com sinal de menos
    pct_tags = soup.find_all(string=re.compile(r'-\d+%'))
    for tag in pct_tags:
        new_tag = tag.replace(tag.strip(), discount_pct)
        tag.replace_with(new_tag)
        print(f"Desconto atualizado para {discount_pct}")

    # 2. Atualizar preo atual (Geralmente em spans separados para Real e Frao)
    # Parte inteira
    for whole in soup.find_all(class_='a-price-whole'):
        # Limpar o contedo mantendo o smbolo se houver (mas geralmente  apenas o nmero)
        whole.string = new_price_whole
        print(f"Preo (inteiro) atualizado para {new_price_whole}")
    
    # Parte fracionria
    for fraction in soup.find_all(class_='a-price-fraction'):
        fraction.string = new_price_fraction
        print(f"Preo (frao) atualizado para {new_price_fraction}")

    # 3. Atualizar preo riscado (Old Price)
    # Amazon usa a-text-strike ou spans dentro de mir-layout-DELIVERY_BLOCK
    for strike in soup.find_all(class_='a-text-strike'):
        # Procura por algo que parea R$ 5.215,50 e substitui
        strike.string = f"R${old_price_str}"
        print(f"Preo riscado atualizado para R${old_price_str}")
        
    # 4. Caso existam textos soltos de preo que no foram pegos pelas classes
    # (Comum em clones que perdem classes)
    def replace_text(node):
        if node.string and "5.215" in node.string:
            node.string = node.string.replace("5.215,50", old_price_str)
        if node.string and "4.510" in node.string:
            node.string = node.string.replace("4.510,50", f"{new_price_whole},{new_price_fraction}")
            node.string = node.string.replace("4.510", f"{new_price_whole}")

    for tag in soup.find_all(string=True):
        if "5.215" in tag or "4.510" in tag:
            tag.replace_with(tag.replace("5.215,50", old_price_str).replace("4.510,50", f"{new_price_whole},{new_price_fraction}").replace("4.510", new_price_whole))

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print("Preos atualizados com sucesso!")

if __name__ == "__main__":
    update_prices("Landpagedrone.html")
