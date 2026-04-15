from bs4 import BeautifulSoup
import re

def redirect_buy_buttons(file_path, target_url):
    print(f"Redirecionando botes de compra em: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. Encontrar todos os elementos que dizem "Comprar agora"
    buy_text_matches = soup.find_all(string=re.compile(r'Comprar\s*agora', re.I))
    
    redirected_count = 0
    
    for match in buy_text_matches:
        # Encontrar o container clicvel mais prximo (a, button ou form)
        parent = match.parent
        while parent and parent.name not in ['a', 'button', 'form'] and parent.name != 'body':
            parent = parent.parent
        
        if parent and parent.name != 'body':
            if parent.name == 'a':
                parent['href'] = target_url
                parent['onclick'] = "" # Remover eventos JS da Amazon
                print(f"Link 'a' redirecionado para {target_url}")
            elif parent.name == 'form':
                parent['action'] = target_url
                parent['method'] = "get"
                print(f"Formulrio redirecionado para {target_url}")
            else:
                # Se for um button ou div, transformamos em link ou adicionamos onclick
                parent['onclick'] = f"window.location.href='{target_url}';"
                parent.css = "cursor: pointer;"
                print(f"Elemento {parent.name} redirecionado via onclick")
            redirected_count += 1

    # 2. Procurar por IDs especficos da Amazon se falhar o texto
    buy_ids = ['buy-now-button', 'buyNow', 'submit.buy-now', 'one-click-button']
    for bid in buy_ids:
        found = soup.find(id=bid)
        if found:
            if found.name == 'input':
                # Se for um input submit, precisamos mudar o form
                if found.form:
                    found.form['action'] = target_url
                    found.form['method'] = "get"
            else:
                found['onclick'] = f"window.location.href='{target_url}';"
                found['style'] = found.get('style', '') + "; cursor: pointer;"
            print(f"Gatilho por ID '{bid}' redirecionado.")
            redirected_count += 1

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    
    print(f"Concludo. {redirected_count} gatilhos de compra redirecionados para {target_url}.")

if __name__ == "__main__":
    redirect_buy_buttons("Landpagedrone.html", "Checkout - Fase 1.html")
