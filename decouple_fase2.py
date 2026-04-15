import os
import re

def decouple_fase2():
    path = 'Checkout - Fase 2.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 1. Auditoria
    links = re.findall(r'href=["\']?(https?://[^"\'>\s]*amazon[^"\'>\s]*)', content, re.I)
    forms = re.findall(r'action=["\']?([^"\'>\s]*amazon[^"\'>\s]*)', content, re.I)
    form_rel = re.findall(r'action=["\']?(/checkout/[^"\'>\s]*)', content, re.I)
    scripts = re.findall(r'src=["\']?(https?://[^"\'>\s]*amazon[^"\'>\s]*)', content, re.I)

    print("--- AUDITORIA FASE 2 ---")
    print(f"Links Amazon: {len(links)}")
    for l in set(links):
        print(f"  - {l}")
    print(f"Forms Amazon: {len(forms)}")
    for f in set(forms):
        print(f"  - {f}")
    print(f"Forms relativos (/checkout/): {len(form_rel)}")
    for f in set(form_rel):
        print(f"  - {f}")
    print(f"Scripts Amazon: {len(scripts)}")

    # 2. Neutralizar links
    content = re.sub(r'href=["\']https?://[^"\'>\s]*amazon[^"\']*["\']', 'href="#" onclick="return false;"', content, flags=re.I)
    # Links sem aspas
    content = re.sub(r'href=https?://[^\s>]*amazon[^\s>]*', 'href="#" onclick="return false;"', content, flags=re.I)

    # 3. Redirecionar forms
    content = re.sub(r'action=["\']?/checkout/[^"\'>\s]*["\']?', 'action="Checkout - Fase 3.html"', content, flags=re.I)
    content = re.sub(r'action=["\']?https?://[^"\'>\s]*amazon[^"\'>\s]*["\']?', 'action="Checkout - Fase 3.html"', content, flags=re.I)

    # 4. Injetar bloqueio
    blocker = """
<script>
(function() {
    var blockList = ['amazon.com', 'amazon.com.br'];
    
    // Bloquear links dinâmicos
    document.addEventListener('click', function(e) {
        var a = e.target.closest('a');
        if (a && a.href && blockList.some(function(d) { return a.href.indexOf(d) !== -1; })) {
            e.preventDefault();
        }
    }, true);

    // Bloquear window.open
    var origOpen = window.open;
    window.open = function(url) {
        if (blockList.some(function(d) { return String(url).indexOf(d) !== -1; })) return null;
        return origOpen.apply(window, arguments);
    };

    // Redirecionar forms restantes
    document.querySelectorAll('form').forEach(function(f) {
        if (f.action.indexOf('amazon') !== -1 || f.action.indexOf('/checkout/') !== -1) {
            f.action = 'Checkout - Fase 3.html';
        }
    });
})();
</script>
"""
    # Limpar </body></html> e reinserir
    content = content.replace('</body>', '').replace('</html>', '').rstrip()
    content += '\n' + blocker + '\n</body>\n</html>'

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\nDesvinculação da Fase 2 concluída.")

if __name__ == "__main__":
    decouple_fase2()
