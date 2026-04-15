def find_button():
    with open('Checkout - Fase 1.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    search_term = 'localização atual'
    idx = content.find(search_term)
    
    if idx != -1:
        # Pega 1000 caracteres antes e depois para ter contexto
        start = max(0, idx - 1000)
        end = min(len(content), idx + 1000)
        print("--- Contexto Encontrado ---")
        print(content[start:end])
    else:
        print("Termo não encontrado.")

if __name__ == "__main__":
    find_button()
