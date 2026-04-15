from bs4 import BeautifulSoup

def debug_slider(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    
    track = soup.find(id="custom-slider-track")
    if not track:
        print("ERRO: custom-slider-track não encontrado!")
        # Tentar ver onde as imagens foram parar
        imgs = [img for img in soup.find_all('img') if len(img.get('src', '')) > 5000]
        print(f"Imagens grandes encontradas fora do track: {len(imgs)}")
        if imgs:
            print(f"Pai da primeira imagem: {imgs[0].parent.name}, Classe={imgs[0].parent.get('class')}")
        return

    items = track.find_all(recursive=False)
    print(f"Itens no track: {len(items)}")
    
    if items:
        first = items[0]
        print(f"Estrutura do primeiro item:\n{str(first)[:1000]}")
        
        img = first.find("img")
        if img:
            print(f"Atributos da imagem: {img.attrs}")
            print(f"SRC length: {len(img.get('src', ''))}")
        else:
            print("ERRO: Nenhuma TAG IMG dentro do item do slider.")

if __name__ == "__main__":
    debug_slider("Landpagedrone.html")
