import os
from bs4 import BeautifulSoup

# Arquivos
BACKUP_FILE = 'Landpagedrone_limpo.html'
OUTPUT_FILE = 'Landpagedrone.html'

def perform_restoration():
    if not os.path.exists(BACKUP_FILE):
        print(f"Erro: Backup {BACKUP_FILE} não encontrado.")
        return

    print(f"Lendo backup: {BACKUP_FILE}")
    with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    soup = BeautifulSoup(html, 'html.parser')

    # 1. Adicionar Meta-Referrer for images
    if not soup.find('meta', attrs={'name': 'referrer'}):
        meta = soup.new_tag('meta')
        meta['name'] = 'referrer'
        meta['content'] = 'no-referrer'
        if soup.head:
            soup.head.insert(0, meta)
        else:
            head = soup.new_tag('head')
            soup.insert(0, head)
            head.append(meta)

    # 2. Definir o Novo Carrossel (Estrutura Mobile Oficial)
    new_carousel_html = """
    <div id="image-block-container" style="background: white; position: relative; width: 100%; min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; margin-top: 10px;">
        <!-- Botão Coração -->
        <div style="position: absolute; top: 15px; right: 15px; z-index: 100; background: white; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); cursor: pointer;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" style="color: #111;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </div>
        <!-- Botão Compartilhar -->
        <div style="position: absolute; top: 70px; right: 15px; z-index: 100; background: white; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); cursor: pointer;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" style="color: #111;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8m-14-4l7-7 7 7m-7-7v13"></path></svg>
        </div>

        <!-- Wrapper do Slider -->
        <div id="slider-wrapper" style="width: 100%; display: flex; transition: transform 0.3s ease-out; cursor: grab;">
            <div class="slide-item" style="min-width: 100%; display: flex; justify-content: center;"><img src="https://m.media-amazon.com/images/I/61mNn-Xp2JL._AC_SL1500_.jpg" style="max-width: 100%; max-height: 400px; object-fit: contain;"></div>
            <div class="slide-item" style="min-width: 100%; display: flex; justify-content: center;"><img src="https://m.media-amazon.com/images/I/61fIq7o-1cL._AC_SL1500_.jpg" style="max-width: 100%; max-height: 400px; object-fit: contain;"></div>
            <div class="slide-item" style="min-width: 100%; display: flex; justify-content: center;"><img src="https://m.media-amazon.com/images/I/61X-NImrVfL._AC_SL1500_.jpg" style="max-width: 100%; max-height: 400px; object-fit: contain;"></div>
            <div class="slide-item" style="min-width: 100%; display: flex; justify-content: center;"><img src="https://m.media-amazon.com/images/I/71N-HkS-2pL._AC_SL1500_.jpg" style="max-width: 100%; max-height: 400px; object-fit: contain;"></div>
            <div class="slide-item" style="min-width: 100%; display: flex; justify-content: center;"><img src="https://m.media-amazon.com/images/I/71m6kC-35aL._AC_SL1500_.jpg" style="max-width: 100%; max-height: 400px; object-fit: contain;"></div>
            <div class="slide-item" style="min-width: 100%; display: flex; justify-content: center;"><img src="https://m.media-amazon.com/images/I/71jY-V5u2DL._AC_SL1500_.jpg" style="max-width: 100%; max-height: 400px; object-fit: contain;"></div>
            <div class="slide-item" style="min-width: 100%; display: flex; justify-content: center;"><img src="https://m.media-amazon.com/images/I/61I07y7M1FL._AC_SL1500_.jpg" style="max-width: 100%; max-height: 400px; object-fit: contain;"></div>
        </div>

        <!-- Paginação (Dots) -->
        <div id="slider-dots" style="display: flex; gap: 8px; margin: 15px 0;">
            <div class="dot active" style="width: 8px; height: 8px; border-radius: 50%; background: #007185; cursor: pointer;"></div>
            <div class="dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer;"></div>
            <div class="dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer;"></div>
            <div class="dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer;"></div>
            <div class="dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer;"></div>
            <div class="dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer;"></div>
            <div class="dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer;"></div>
        </div>

        <script>
        (function() {
            const wrapper = document.getElementById('slider-wrapper');
            const dots = document.querySelectorAll('#slider-dots .dot');
            let currentIndex = 0;
            let startX = 0;
            let currentTranslate = 0;
            let prevTranslate = 0;
            let isDragging = false;

            function goToSlide(index) {
                currentIndex = index;
                wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
                dots.forEach((dot, i) => {
                    dot.style.background = i === currentIndex ? '#007185' : '#ccc';
                });
            }

            dots.forEach((dot, i) => {
                dot.onclick = () => goToSlide(i);
            });

            // Swipe Logic
            wrapper.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                isDragging = true;
                wrapper.style.transition = 'none';
            });

            wrapper.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const currentX = e.touches[0].clientX;
                const diff = currentX - startX;
                const move = -currentIndex * wrapper.offsetWidth + diff;
                wrapper.style.transform = `translateX(${move}px)`;
            });

            wrapper.addEventListener('touchend', (e) => {
                isDragging = false;
                wrapper.style.transition = 'transform 0.3s ease-out';
                const endX = e.changedTouches[0].clientX;
                const diff = endX - startX;
                if (Math.abs(diff) > 50) {
                    if (diff > 0 && currentIndex > 0) goToSlide(currentIndex - 1);
                    else if (diff < 0 && currentIndex < dots.length - 1) goToSlide(currentIndex + 1);
                    else goToSlide(currentIndex);
                } else {
                    goToSlide(currentIndex);
                }
            });
        })();
        </script>
    </div>
    """

    # 3. Localizar o bloco alvo no backup
    # Vamos subir para o container pai para remover os dots bugados e a aninhagem
    target = soup.find(id='horizontalMediaCarousel')
    if not target:
        # Fallback se o ID mudou
        target = soup.find(id='image-block-container')
        if not target:
            target = soup.find(class_='fp-image-wrapper')
            if target:
                target = target.find_parent('div', id=True) or target.find_parent('div')

    if target:
        print(f"Bloco alvo localizado. Substituindo...")
        target.replace_with(BeautifulSoup(new_carousel_html, 'html.parser'))
    else:
        print("Erro: Não foi possível localizar o bloco de imagem original no backup.")
        return

    # Salvar o novo arquivo
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"Arquivo restaurado e corrigido salvo em: {OUTPUT_FILE}")

if __name__ == "__main__":
    perform_restoration()
    # Re-executar os outros scripts de limpeza
    print("Executando scripts de limpeza adicionais...")
    os.system('python clean_links.py')
    os.system('python setup_geo.py')
    print("Processo concluído com sucesso!")
