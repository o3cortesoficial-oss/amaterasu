import re
from bs4 import BeautifulSoup

def hard_clean(file_path):
    print(f"Limpando arquivo: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Substituir urls diretas da amazon por javascript:void(0), mas ignora se for uma imagem (.jpg, .png, etc)
    html = re.sub(r'https?://[a-zA-Z0-9.-]*amazon\.[a-z.]+(?![^"\'<>]*\.(?:jpg|jpeg|png|gif|webp|svg))[^\s"\'<>]*', 'javascript:void(0);', html, flags=re.IGNORECASE)
    
    soup = BeautifulSoup(html, "html.parser")

    # 2. Matar todas as tags form
    for form in soup.find_all("form"):
        form["action"] = "javascript:void(0);"
        form["onsubmit"] = "return false;"

    # 3. Matar todos os hrefs de a
    for a in soup.find_all("a"):
        if a.has_attr("href") and not a["href"].startswith("#"):
            a["href"] = "javascript:void(0);"
            
    # 4. Matar eventos onclick em links e inputs que costumam fazer redirecionamentos
    for tag in soup.find_all(["input", "button", "a", "span", "div"]):
        if tag.has_attr("onclick"):
            # O onclick pode conter codigo que redireciona. Vamos neutralizar.
            tag["onclick"] = "event.preventDefault(); return false;"
            
        # Amazon costuma usar spans/botoes com data-action
        if tag.has_attr("data-action"):
            tag["data-action"] = ""

        # Remover urls relativas suspeitas em type="submit" ou inputs
        if tag.name == "input" and tag.has_attr("value"):
            val = tag["value"]
            if val.startswith("/") or "amazon" in val.lower():
                tag["value"] = "#"

    # 5. Adicionar listener interceptador de cliques agressivo
    script = str(soup.new_tag("script"))
    script = """
    <script>
    // ESCUDO AGRESSIVO
    window.addEventListener('load', function() {
        // Bloqueia window.location e window.open
        Object.defineProperty(window, 'location', {
            configurable: true,
            get: function() { return window._location || {}; },
            set: function(val) { console.log('Location set to:', val, 'BLOCKED'); }
        });
        window.open = function() { console.log('window.open BLOCKED'); return null; };
        
        // Bloqueia submitions via js e clicks soltos
        document.addEventListener('click', function(e) {
            var el = e.target.closest('a, button, input[type="submit"], input[type="button"], form');
            if(el) {
                if(el.tagName.toLowerCase() === 'a' && el.getAttribute('href') && el.getAttribute('href').startsWith('#')) {
                    return; // Permite rolar a pagina
                }
                
                // Muitos botoes da amazon apenas disparam ajax que redireciona, 
                // vamos evitar sua acao se ele for do tipo enviar form ou ir pro carrinho
                // Para nao quebrar abas de imagens, nao damos preventDefault incondicional
                if (el.tagName.toLowerCase() !== 'a' && el.id && (el.id.includes('buy-now') || el.id.includes('add-to-cart') || el.tagName.toLowerCase() === 'form')) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Clique bloqueado em botão sensível:', el);
                }
            }
        }, true); // Capturing phase
    });
    </script>
    """
    if soup.head:
        soup.head.append(BeautifulSoup(script, "html.parser"))

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
    print("Limpeza hard executada com sucesso.")

if __name__ == "__main__":
    hard_clean("Landpagedrone.html")
