from bs4 import BeautifulSoup

def fix_slider_images(file_path):
    print(f"Corrigindo visibilidade das fotos em: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # 1. Fortalecer o CSS do slider para garantir que nada as esconda
    fix_css = """
    <style>
    .custom-slider-item img {
        visibility: visible !important;
        opacity: 1 !important;
        display: block !important;
    }
    .visibility-hidden {
        visibility: visible !important; /* Forçar exibição de classes da Amazon */
    }
    .custom-slider-track {
        height: auto !important;
        min-height: 300px; /* Garantir que o rail tenha altura */
    }
    </style>
    """
    if soup.head:
        soup.head.append(BeautifulSoup(fix_css, "html.parser"))

    # 2. Limpar classes de visibilidade no HTML diretamente
    track = soup.find(id="custom-slider-track")
    if track:
        imgs = track.find_all("img")
        print(f"Limpando {len(imgs)} imagens...")
        for img in imgs:
            if img.has_attr("class"):
                # Remover qualquer classe 'visibility-hidden' ou 'hidden'
                classes = img.get("class", [])
                new_classes = [c for c in classes if c not in ["visibility-hidden", "hidden", "a-hidden"]]
                img["class"] = new_classes
            
            # Garantir que o src seja o link correto se houver data-src
            if img.has_attr("data-src") and (not img.get("src") or len(img.get("src")) < 100):
                print(f"Restaurando src a partir de data-src para imagem {img.get('id')}")
                img["src"] = img["data-src"]

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
    print("Correção aplicada.")

if __name__ == "__main__":
    fix_slider_images("Landpagedrone.html")
