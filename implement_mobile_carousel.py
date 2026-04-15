from bs4 import BeautifulSoup

def implement_mobile_carousel(file_path):
    print(f"Implementando novo carrossel mobile oficial em: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # Imagens capturadas oficiais
    images = [
        "https://m.media-amazon.com/images/I/71X8k+M5+dL._SL1500_.jpg", # Main
        "https://m.media-amazon.com/images/I/71iV8M6-HUL._SL1500_.jpg",
        "https://m.media-amazon.com/images/I/61mNnQvK8mL._SL1500_.jpg",
        "https://m.media-amazon.com/images/I/61hX4rWq2KL._SL1500_.jpg",
        "https://m.media-amazon.com/images/I/71qS+RjL7yL._SL1500_.jpg",
        "https://m.media-amazon.com/images/I/61G+h-O4mQL._SL1500_.jpg",
        "https://m.media-amazon.com/images/I/71E3fW18bML._SL1500_.jpg"
    ]

    # 1. Localizar o container principal quebrado
    container = soup.find(id="image-block-container")
    if not container:
        # Tentar procurar pelo novo ID se eu já tiver alterado
        container = soup.find(id="custom-slider-fix-css")
        if not container:
            # Fallback: tentar localizar qualquer container de imagem perto do topo
            container = soup.select_one("#ppd #main-image-container, #ppd .a-section")

    if not container:
        print("Erro: Container de imagem não encontrado. Verificando estrutura alternativa...")
        return

    # 2. Criar a Nova Estrutura HTML Mobile
    new_html = f"""
    <div id="image-block-container" class="a-section a-spacing-none" style="background: #fff; position: relative;">
        <!-- Container de Carrossel -->
        <div class="official-mobile-carousel-viewport" style="overflow: hidden; position: relative; width: 100%;">
            <div id="official-carousel-track" style="display: flex; transition: transform 0.3s ease-out; width: 100%;">
                {" ".join([f'<div class="official-carousel-slide" style="min-width: 100%; display: flex; justify-content: center; align-items: center; height: 350px;"><img src="{url}" style="max-width: 100%; max-height: 100%; object-fit: contain;"></div>' for url in images])}
            </div>
        </div>
        
        <!-- Ícones de Coração e Compartilhar (Top Right) -->
        <div style="position: absolute; top: 15px; right: 15px; display: flex; flex-direction: column; gap: 15px; z-index: 10;">
            <div style="background: #fff; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); cursor: pointer;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </div>
            <div style="background: #fff; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); cursor: pointer;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            </div>
        </div>

        <!-- Dots de Paginação -->
        <div id="official-dots-container" style="display: flex; justify-content: center; gap: 8px; padding: 15px 0;">
            {" ".join([f'<div class="official-dot" data-index="{i}" style="width: 8px; height: 8px; border-radius: 50%; background: #ddd; cursor: pointer; transition: background 0.3s;"></div>' for i in range(len(images))])}
        </div>
    </div>
    """
    
    # Substituir o antigo pelo novo
    container.replace_with(BeautifulSoup(new_html, "html.parser"))

    # 3. Estilos Adicionais
    extra_css = """
    <style id="official-mobile-slider-styles">
    .official-dot.active {
        background: #e47911 !important; /* Laranja Amazon */
        width: 10px !important;
        height: 10px !important;
    }
    #image-block-pagination-dots { display: none !important; } /* Esconder resíduos */
    </style>
    """
    if soup.head:
        soup.head.append(BeautifulSoup(extra_css, "html.parser"))

    # 4. Script de Lógica do Slider
    slider_js = """
    <script id="official-mobile-slider-js">
    (function() {
        function initOfficialSlider() {
            const track = document.getElementById('official-carousel-track');
            const dots = document.querySelectorAll('.official-dot');
            if (!track || dots.length === 0) return;

            function goToSlide(index) {
                track.style.transform = `translateX(-${index * 100}%)`;
                dots.forEach(d => d.classList.remove('active'));
                dots[index].classList.add('active');
            }

            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => goToSlide(index));
            });

            // Swipe support básico
            let touchStartX = 0;
            track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
            track.addEventListener('touchend', e => {
                let touchEndX = e.changedTouches[0].clientX;
                let diff = touchStartX - touchEndX;
                let currentIndex = Array.from(dots).findIndex(d => d.classList.contains('active'));
                
                if (Math.abs(diff) > 50) {
                    if (diff > 0 && currentIndex < dots.length - 1) goToSlide(currentIndex + 1);
                    else if (diff < 0 && currentIndex > 0) goToSlide(currentIndex - 1);
                }
            });

            // Iniciar no primeiro
            goToSlide(0);
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initOfficialSlider);
        } else {
            initOfficialSlider();
        }
    })();
    </script>
    """
    if soup.body:
        soup.body.append(BeautifulSoup(slider_js, "html.parser"))

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
    print("Sucesso: Carrossel Oficial Mobile substituído e fotos restauradas.")

if __name__ == "__main__":
    implement_mobile_carousel("Landpagedrone.html")
