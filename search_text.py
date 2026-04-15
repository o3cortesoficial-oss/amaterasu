fontes = ['Landpagedrone.html', 'Landpagedrone_limpo.html']
alvo = "Principais destaques"

for f in fontes:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            idx = content.find(alvo)
            if idx != -1:
                print(f"--- ACHADO EM {f} (pos={idx}) ---")
                print(content[idx:idx+2000])
            else:
                print(f"Não achado em {f}")
    except Exception as e:
        print(f"Erro ao ler {f}: {e}")
