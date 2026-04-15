import os
import re

def decouple_fase1():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 1. Neutralizar links em <a> tags
    # Altera href="http...amazon..." para href="#" onclick="return false;"
    content = re.sub(r'href=\"https?://[^\"\']*amazon[^\"]*\"', 'href="#" onclick="return false;"', content, flags=re.I)

    # 2. Redirecionar Form Action para a Fase 2 local
    # Procura por actions que pareçam com o checkout da Amazon e substitui por Checkout - Fase 2.html
    # Vamos usar uma regex frouxa para garantir que pegamos o form principal
    content = re.sub(r'action=\"/checkout/p/[^\"]*\"', 'action="Checkout - Fase 2.html"', content, flags=re.I)
    
    # Se houver outros forms relativos ou absolutos apontando para a amazon, redirecionamos
    content = re.sub(r'action=\"https?://[^\"\']*amazon[^\"]*\"', 'action="Checkout - Fase 2.html"', content, flags=re.I)

    # 3. Injetar script de proteção contra redirecionamentos JS
    blocker_script = """
<script>
// Impedir que o site tente nos mandar de volta para a Amazon via JS
(function() {
    const blockList = ['amazon.com', 'amazon.com.br'];
    
    // Bloquear window.location.href overrides
    const originalLocation = window.location;
    const desc = Object.getOwnPropertyDescriptor(window, 'location');
    
    // Bloquear window.open
    const originalOpen = window.open;
    window.open = function(url) {
        if (blockList.some(d => String(url).includes(d))) {
            console.log('Blocked window.open to Amazon:', url);
            return null;
        }
        return originalOpen.apply(window, arguments);
    };

    // Bloquear navegação via links dinâmicos
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (target && target.href && blockList.some(d => target.href.includes(d))) {
            e.preventDefault();
            console.log('Blocked navigation to Amazon:', target.href);
        }
    }, true);
})();
</script>
"""
    if '</body>' in content:
        parts = content.rsplit('</body>', 1)
        content = parts[0] + blocker_script + '</body>' + parts[1]
    else:
        content += blocker_script

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Desvinculação da Fase 1 concluída com sucesso.")

if __name__ == "__main__":
    decouple_fase1()
