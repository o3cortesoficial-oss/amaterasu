import json
import re
from bs4 import BeautifulSoup

def final_fix_slider(file_path):
    print(f"Aplicando correção definitiva em: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # 1. CSS de Reset e Estabilidade
    # Removemos o overflow:hidden do body se houver e aplicamos ao container do slider
    # Forçamos uma altura para o container principal não colapsar
    # Resetamos o posicionamento das imagens
    fix_css = """
    <style id="custom-slider-fix-css">
    #image-block-main-image-container {
        min-height: 350px !important;
        height: auto !important;
        overflow: hidden !important;
        position: relative !important;
        display: block !important;
        background: #fff;
    }
    #custom-slider-track {
        display: flex !important;
        width: 100% !important;
        height: 100% !important;
        transition: transform 0.5s ease-in-out !important;
    }
    .custom-slider-item {
        min-width: 100% !important;
        flex-shrink: 0 !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        position: relative !important;
        height: 100% !important;
    }
    .custom-slider-item img {
        max-width: 100% !important;
        max-height: 350px !important;
        width: auto !important;
        height: auto !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: relative !important;
        top: auto !important;
        left: auto !important;
        margin: auto !important;
    }
    /* Eliminar classes obstrutivas da Amazon em todo o slider */
    .custom-slider-item .visibility-hidden, 
    .custom-slider-item .a-hidden, 
    .custom-slider-item .hidden {
        visibility: visible !important;
        display: block !important;
        opacity: 1 !important;
    }
    </style>
    """
    # Remover versões anteriores do nosso CSS de correção se existirem
    old_css = soup.find(id="custom-slider-fix-css")
    if old_css: old_css.decompose()
    
    if soup.head:
        soup.head.append(BeautifulSoup(fix_css, "html.parser"))

    # 2. Processamento de Atributos das Imagens
    track = soup.find(id="custom-slider-track")
    if track:
        imgs = track.find_all("img")
        print(f"Processando {len(imgs)} imagens no slider...")
        for img in imgs:
            # a) Forçar visibilidade no elemento
            styles = img.get("style", "")
            img["style"] = styles + "; visibility: visible !important; opacity: 1 !important; display: block !important; position: relative !important;"
            
            # b) Limpar classes
            if img.has_attr("class"):
                classes = img.get("class", [])
                img["class"] = [c for c in classes if c not in ["visibility-hidden", "a-hidden", "hidden"]]

            # c) Extrair imagem real de data-a-dynamic-image (JSON) se o SRC estiver vazio
            # Amazon costuma usar: {"url_alta": [600, 600], "url_media": [300, 300]}
            dynamic = img.get("data-a-dynamic-image")
            if dynamic:
                try:
                    data = json.loads(dynamic)
                    if data:
                        # Pegar a URL com a maior chave (resolução)
                        # As chaves costumam ser representações de tamanho
                        real_url = list(data.keys())[0] # Pega a primeira disponivel
                        print(f"Imagem extraída de data-a-dynamic-image para {img.get('id')}")
                        img["src"] = real_url
                except:
                    pass
            
            # d) Fallback para data-src
            if img.has_attr("data-src") and (not img.get("src") or len(img.get("src")) < 200):
                 img["src"] = img["data-src"]
                 
            # e) Se ainda estiver vazio, tentar data-old-hires
            if img.has_attr("data-old-hires") and (not img.get("src") or len(img.get("src")) < 200):
                img["src"] = img["data-old-hires"]

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
    print("Correção definitiva aplicada.")

if __name__ == "__main__":
    final_fix_slider("Landpagedrone.html")
