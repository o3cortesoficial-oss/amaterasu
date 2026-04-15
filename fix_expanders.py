from bs4 import BeautifulSoup

def fix_expanders(file_path):
    print(f"Buscando expanders em: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # Localizar todos os containers que usam a lógica de expander da Amazon
    expanders = soup.find_all(class_='a-expander-container')
    
    for exp in expanders:
        # 1. Encontrar o conteúdo que é escondido
        content = exp.find(class_='a-expander-content')
        if not content:
            # Tentar encontrar pela classe de altura colapsada
            content = exp.find(class_='a-expander-collapsed-height')
            
        # 2. Encontrar o gatilho (Veja mais)
        trigger = exp.find(class_='a-expander-prompt')
        if not trigger:
            trigger = exp.find('a', class_='a-expander-header')
            
        if content and trigger:
            # Gerar um ID único se não tiver
            exp_id = exp.get('id', f'exp_{id(exp)}')
            content['id'] = f'{exp_id}_content'
            
            # Forçar estilo inicial
            if 'a-expander-collapsed-height' in content.get('class', []):
                content['style'] = content.get('style', '') + '; max-height: 100px; overflow: hidden; transition: max-height 0.3s ease-out;'
            
            # 3. Injetar comportamento local no gatilho
            trigger['href'] = "javascript:void(0);"
            trigger['onclick'] = f"var c=document.getElementById('{exp_id}_content'); if(c.style.maxHeight==='100px'){{ c.style.maxHeight='none'; this.innerHTML='Veja menos'; }}else{{ c.style.maxHeight='100px'; this.innerHTML='Veja mais'; }}"
            
            print(f"Expander corrigido no elemento {exp_id}")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print("Processo concluído.")

if __name__ == "__main__":
    fix_expanders("Landpagedrone.html")
