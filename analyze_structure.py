from bs4 import BeautifulSoup
import re

def analyze_checkout(file_path):
    print(f"Analisando: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. Encontrar o boto de localizao
    btn_text = soup.find(string=lambda x: x and 'localização atual' in x.lower())
    if btn_text:
        print(f"Botão de localização encontrado! Texto: {btn_text.strip()}")
        parent = btn_text.parent
        # Subir para o container clicavel
        while parent and parent.name not in ['a', 'button', 'div'] and parent.name != 'body':
            parent = parent.parent
        print(f"ID do Container: {parent.get('id')} Classe: {parent.get('class')}")
    else:
        print("Botão de localização não encontrado via texto exato.")

    # 2. Listar todos os inputs e seus IDs
    print("\n--- Inputs encontrados ---")
    for input_tag in soup.find_all(['input', 'select']):
        iid = input_tag.get('id', '')
        name = input_tag.get('name', '')
        placeholder = input_tag.get('placeholder', '')
        # Tentar encontrar um label proximo
        label = ""
        if iid:
            label_tag = soup.find('label', {'for': iid})
            if label_tag:
                label = label_tag.get_text(strip=True)
        
        if any(word in f"{iid} {name} {label}".lower() for word in ['address', 'city', 'state', 'zip', 'cep', 'rua', 'bairro', 'numero', 'complemento']):
             print(f"Campo: Label='{label}' ID='{iid}' Name='{name}' Placeholder='{placeholder}'")

if __name__ == "__main__":
    analyze_checkout("Checkout - Fase 1.html")
