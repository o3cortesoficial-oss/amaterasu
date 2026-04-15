from bs4 import BeautifulSoup

def debug_checkout():
    with open('Checkout - Fase 1.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    target_ids = [
        'address-ui-widgets-enterAddressPostalCode',
        'address-ui-widgets-enterAddressLine1',
        'address-ui-widgets-buildingNumber',
        'address-ui-widgets-neighborhood',
        'address-ui-widgets-enterAddressCity',
        'address-ui-widgets-enterAddressStateOrRegion'
    ]

    print("--- Diagnóstico de Campos ---")
    for tid in target_ids:
        els = soup.find_all(id=tid)
        print(f"ID: {tid} | Encontrados: {len(els)}")
        for i, el in enumerate(els):
            # Verificar se o elemento está num container oculto
            parent = el.parent
            hidden = False
            while parent and parent.name != 'body':
                classes = str(parent.get('class', []))
                if 'aok-hidden' in classes or 'sf-hidden' in classes or 'display:none' in str(parent.get('style', '')):
                    hidden = True
                    break
                parent = parent.parent
            
            print(f"  [{i}] Value: '{el.get('value', '')}' | Hidden: {hidden} | Tag: {el.name} | Classes: {el.get('class')}")

    # Verificar o botão
    btn_text = 'localização atual'
    all_spans = soup.find_all('span', class_='a-button-text')
    matches = [s for s in all_spans if btn_text in s.get_text().lower()]
    print(f"\n--- Diagnóstico de Botão ---")
    print(f"Spans com '{btn_text}': {len(matches)}")
    for m in matches:
        btn = m.find_parent(class_='a-button')
        if btn:
            print(f"  Botão ID: {btn.get('id')} | Classes: {btn.get('class')}")

if __name__ == "__main__":
    debug_checkout()
