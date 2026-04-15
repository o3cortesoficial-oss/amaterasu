from bs4 import BeautifulSoup

def implement_slider(file_path):
    print(f"Implementando Slider robusto em: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # 1. Identificar itens da galeria
    # Procuramos por todas as divs de imagem do produto (baseadas nas classes Amazon comumente preservadas)
    gallery_items = soup.find_all("div", class_=lambda x: x and ("fp-image-wrapper" in x or "image-size-wrapper" in x))
    if not gallery_items:
        # Fallback: procurar por imagens grandes que tem um div pai imediato
        imgs = [img for img in soup.find_all('img') if len(img.get('src', '')) > 5000]
        gallery_items = []
        for img in imgs:
            parent = img.find_parent("div")
            if parent and parent not in gallery_items:
                gallery_items.append(parent)

    print(f"Encontrados {len(gallery_items)} itens de galeria.")
    if len(gallery_items) < 2:
        print("Erro: Não foram encontrados itens suficientes para um slider.")
        return

    # O container real deve ser o pai desses itens
    slider_container = gallery_items[0].parent
    print(f"Container identificado: {slider_container.name}, ID: {slider_container.get('id')}, Class: {slider_container.get('class')}")

    # 2. Reestruturar para Slider
    # Limpar o container e colocar um 'track'
    track = soup.new_tag("div", attrs={"id": "custom-slider-track", "style": "display: flex; transition: transform 0.5s ease-in-out; width: 100%;"})
    
    # Adicionar estilos ao container para clipping
    slider_container['style'] = slider_container.get('style', '') + "; overflow: hidden !important; position: relative !important; width: 100% !important; display: block !important;"
    
    for item in gallery_items:
        # Garantir que cada item ocupe 100% da largura
        item['style'] = item.get('style', '') + "; min-width: 100% !important; flex-shrink: 0 !important; display: flex !important; justify-content: center !important;"
        track.append(item.extract())
    
    slider_container.append(track)

    # 3. Vincular os Dots
    # Localizar o container de dots
    dots_container = soup.find(id="image-block-pagination-dots")
    if not dots_container:
        # Fallback por classe
        dots_container = soup.find("div", class_="a-pagination")

    if dots_container:
        print(f"Dots container encontrado: {dots_container.get('id') or dots_container.get('class')}")
        # Marcar os dots para o JS
        dots = dots_container.find_all("li")
        for i, dot in enumerate(dots):
            dot['data-index'] = i
            dot['style'] = dot.get('style', '') + "; cursor: pointer !important;"
    else:
        print("Aviso: Container de dots não encontrado. O slider funcionará via console ou swipe se implementado.")

    # 4. Injetar JS e CSS
    extra_styles = """
    <style>
    .a-pagination .a-active { background-color: #e47911 !important; border-color: #e47911 !important; }
    .a-pagination li { display: inline-block; margin: 0 5px; }
    </style>
    """
    if soup.head:
        soup.head.append(BeautifulSoup(extra_styles, "html.parser"))

    slider_js = """
    <script>
    (function() {
        function initSlider() {
            const track = document.getElementById('custom-slider-track');
            const dotsContainer = document.querySelector('.a-pagination') || document.getElementById('image-block-pagination-dots');
            if (!track || !dotsContainer) return;
            
            const dots = dotsContainer.querySelectorAll('li');
            
            dots.forEach((dot, index) => {
                // Re-bind click
                dot.onclick = function(e) {
                    e.preventDefault();
                    console.log('Slide para index:', index);
                    track.style.transform = `translateX(-${index * 100}%)`;
                    
                    dots.forEach(d => d.classList.remove('a-active'));
                    dot.classList.add('a-active');
                };
            });
            
            if (dots.length > 0) dots[0].classList.add('a-active');
        }
        window.addEventListener('load', initSlider);
    })();
    </script>
    """
    if soup.body:
        soup.body.append(BeautifulSoup(slider_js, "html.parser"))

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
    print("Sucesso: Slider implementado.")

if __name__ == "__main__":
    implement_slider("Landpagedrone.html")
