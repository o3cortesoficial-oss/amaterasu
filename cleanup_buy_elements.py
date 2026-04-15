from bs4 import BeautifulSoup

def remove_elements(file_path):
    print(f"Limpando elementos em: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. Remover o boto "Adicionar ao carrinho"
    # Amazon geralmente usa o ID add-to-cart-button ou classes especficas
    btn = soup.find(id='add-to-cart-button')
    if btn:
        btn.decompose()
        print("Boto 'Adicionar ao carrinho' removido via ID.")
    else:
        # Fallback por texto
        btn_text = soup.find(string=lambda x: x and 'Adicionar ao carrinho' in x)
        if btn_text:
            parent = btn_text.parent
            while parent and 'button' not in str(parent.get('class', '')).lower() and parent.name != 'body':
                parent = parent.parent
            if parent and parent.name != 'body':
                parent.decompose()
                print("Boto 'Adicionar ao carrinho' removido via busca de texto.")

    # 2. Remover info de parcelamento ("Em at ...")
    # Geralmente dentro de um id que contm 'installment' ou classes de preo
    inst = soup.find(string=lambda x: x and 'Em at' in x and 'sem juros' in x)
    if inst:
        parent = inst.parent
        # Subir um pouco na hierarquia para remover a linha inteira
        cnt = 0
        while parent and cnt < 3 and parent.name != 'body':
            if 'a-section' in parent.get('class', []) or 'a-row' in parent.get('class', []):
                break
            parent = parent.parent
            cnt += 1
        
        if parent and parent.name != 'body':
            parent.decompose()
            print("Informaes de parcelamento removidas.")

    # 3. Remover botoes mobile (classes comuns de Amazon ATC)
    for mobile_btn in soup.find_all(class_='atc-button-text'):
        parent = mobile_btn.parent
        # Subir ate encontrar o container do botao (geralmente class a-button ou a-button-inner)
        while parent and 'a-button' not in str(parent.get('class', '')).lower() and parent.name != 'body':
            parent = parent.parent
        if parent and parent.name != 'body':
            parent.decompose()
            print("Botão de carrinho mobile removido.")

    # 4. Remover links de "Ver opes de pagamento" que sobraram
    pay_options = soup.find(string=lambda x: x and 'opções de pagamento' in x.lower())
    if pay_options:
        pay_options.parent.decompose()
        print("Link de 'opções de pagamento' removido.")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print("Limpeza de elementos concluda.")

if __name__ == "__main__":
    remove_elements("Landpagedrone.html")
