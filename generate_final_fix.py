import os

# Ler base64
b64s = []
if os.path.exists('b64_images.txt'):
    with open('b64_images.txt', 'r') as f:
        current_b64 = ""
        for line in f:
            line = line.strip()
            if line.startswith('IMG_'):
                if current_b64:
                    b64s.append(current_b64)
                current_b64 = ""
            else:
                current_b64 += line
        if current_b64:
            b64s.append(current_b64)

carousel_imgs_html = ""
for b64 in b64s:
    carousel_imgs_html += f'            <div class="slide-item" style="min-width: 100%; height: 400px; display: flex; align-items: center; justify-content: center;"><img src="data:image/jpeg;base64,{b64}" style="max-width: 100%; max-height: 100%; object-fit: contain;"></div>\n'

# Se não houver imagens, usa as originais como fallback (mas esperamos que b64s tenha as novas)
if not b64s:
    print("AVISO: Nenhuma imagem Base64 encontrada. Usando URLs da Amazon.")
    # ... fallback logic

new_carousel_html = f"""
    <div id="image-block-container" style="background: white; position: relative; width: 100%; min-height: 480px; display: flex; flex-direction: column; align-items: center; overflow: hidden; margin-top: 10px;">
        <!-- Botão Coração -->
        <div style="position: absolute; top: 15px; right: 15px; z-index: 100; background: white; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); cursor: pointer;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" style="color: #111;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </div>
        <!-- Botão Compartilhar -->
        <div style="position: absolute; top: 70px; right: 15px; z-index: 100; background: white; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); cursor: pointer;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" style="color: #111;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8m-14-4l7-7 7 7m-7-7v13"></path></svg>
        </div>

        <!-- Wrapper do Slider -->
        <div id="slider-wrapper" style="width: 100%; height: 400px; display: flex; transition: transform 0.3s ease-out; cursor: grab;">
{carousel_imgs_html}
        </div>

        <!-- Paginação (Dots) -->
        <div id="slider-dots" style="display: flex; gap: 8px; margin: 20px 0; padding-bottom: 10px;">
            {' '.join([f'<div class="dot {"active" if i==0 else ""}" style="width: 8px; height: 8px; border-radius: 50%; background: {"#007185" if i==0 else "#ccc"}; cursor: pointer;"></div>' for i in range(len(b64s))])}
        </div>

        <script>
        (function() {{
            const wrapper = document.getElementById('slider-wrapper');
            const dots = document.querySelectorAll('#slider-dots .dot');
            let currentIndex = 0;
            let startX = 0;
            let isDragging = false;

            function goToSlide(index) {{
                if (index < 0 || index >= dots.length) return;
                currentIndex = index;
                wrapper.style.transform = `translateX(${{-currentIndex * 100}}%)`;
                dots.forEach((dot, i) => {{
                    dot.style.background = i === currentIndex ? '#007185' : '#ccc';
                }});
            }}

            dots.forEach((dot, i) => {{
                dot.onclick = () => goToSlide(i);
            }});

            // Swipe Logic
            wrapper.addEventListener('touchstart', (e) => {{
                startX = e.touches[0].clientX;
                isDragging = true;
                wrapper.style.transition = 'none';
            }});

            wrapper.addEventListener('touchmove', (e) => {{
                if (!isDragging) return;
                const currentX = e.touches[0].clientX;
                const diff = currentX - startX;
                const move = -currentIndex * wrapper.offsetWidth + diff;
                wrapper.style.transform = `translateX(${{move}}px)`;
            }});

            wrapper.addEventListener('touchend', (e) => {{
                isDragging = false;
                wrapper.style.transition = 'transform 0.3s ease-out';
                const endX = e.changedTouches[0].clientX;
                const diff = endX - startX;
                if (Math.abs(diff) > 50) {{
                    if (diff > 0 && currentIndex > 0) goToSlide(currentIndex - 1);
                    else if (diff < 0 && currentIndex < dots.length - 1) goToSlide(currentIndex + 1);
                    else goToSlide(currentIndex);
                }} else {{
                    goToSlide(currentIndex);
                }}
            }});
        }})();
        </script>
    </div>
"""

# Agora gerar o script final que faz a substituição
script_content = f"""
import os
from bs4 import BeautifulSoup

def final_fix():
    print("Iniciando restaurao final com imagens Base64...")
    with open('Landpagedrone_limpo.html', 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    # Alvo principal para remover o bloco bugado
    target = soup.find(id='horizontalMediaCarousel')
    if not target:
        target = soup.find(id='image-block-container')
    
    if target:
        # Injetar o novo carrossel corrigido
        new_html = r'''{new_carousel_html}'''
        target.replace_with(BeautifulSoup(new_html, 'html.parser'))
        print("Carrossel injetado.")

    # Salvar
    with open('Landpagedrone.html', 'w', encoding='utf-8') as f:
        f.write(str(soup))
    
    # Rodar limpezas
    os.system('python clean_links.py')
    os.system('python setup_geo.py')
    print("Processo concludo!")

if __name__ == "__main__":
    final_fix()
"""

with open('apply_final_b64_fix.py', 'w', encoding='utf-8') as f:
    f.write(script_content)

print("Script apply_final_b64_fix.py gerado.")
