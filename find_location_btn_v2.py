def find_button():
    import re
    with open('Checkout - Fase 1.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    search_term = 'Usar a localização atual'
    # Busca com regex para ignorar variations de espaco/case
    pattern = re.compile(re.escape(search_term), re.IGNORECASE)
    match = pattern.search(content)
    
    if match:
        start = max(0, match.start() - 1000)
        end = min(len(content), match.end() + 1000)
        print("--- Match Encontrado ---")
        print(content[start:end])
    else:
        print("Termo não encontrado.")

if __name__ == "__main__":
    find_button()
