import os
import re
import shutil

def restore_and_fix():
    backup = 'Checkout - Fase 2 BKUP.html'
    target = 'Checkout - Fase 2.html'
    
    if not os.path.exists(backup):
        print(f"Backup não encontrado: {backup}")
        return
    
    # 1. Restaurar backup
    shutil.copy2(backup, target)
    print("Backup restaurado.")

    with open(target, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 2. Neutralizar links Amazon (href apenas, sem tocar na estrutura)
    content = re.sub(
        r'href=["\']https?://[^"\']*amazon[^"\']*["\']',
        'href="#" onclick="return false;"',
        content, flags=re.I
    )
    print("Links Amazon neutralizados.")

    # 3. Limpar dados hardcoded (apenas texto, sem mexer em tags)
    content = content.replace('Said Labs Global', 'Seu nome')
    # Não mexer em estrutura HTML - só texto puro
    
    # 4. Redirecionar forms
    content = re.sub(
        r'action=["\']?/checkout/[^"\'>\s]*["\']?',
        'action="Checkout - Fase 3.html"',
        content, flags=re.I
    )
    print("Forms redirecionados para Fase 3.")

    # 5. Injetar bloqueio Amazon + carregamento de dados do localStorage
    inject = """
<script>
(function() {
    // Bloqueio Amazon
    var blockList = ['amazon.com', 'amazon.com.br'];
    document.addEventListener('click', function(e) {
        var a = e.target.closest('a');
        if (a && a.href && blockList.some(function(d) { return a.href.indexOf(d) !== -1; })) {
            e.preventDefault();
        }
    }, true);

    // Carregar dados da Fase 1
    var raw = localStorage.getItem('checkout_address');
    if (!raw) return;
    var data = JSON.parse(raw);
    
    var nome = data.nome || '';
    var parts = [];
    if (data.rua) parts.push(data.rua);
    if (data.numero) parts.push(data.numero);
    if (data.bairro) parts.push(data.bairro);
    if (data.cidade) parts.push(data.cidade);
    if (data.estado) parts.push(data.estado);
    if (data.cep) parts.push(data.cep);
    parts.push('Brasil');
    var endereco = parts.join(', ');

    var els = document.querySelectorAll('span, div, b, strong');
    els.forEach(function(el) {
        if (el.textContent.trim() === 'Seu nome') el.textContent = nome;
        if (el.textContent.indexOf('Rua R. A. Costa') !== -1) el.textContent = endereco;
    });
    
    // "Entrega para X"
    els.forEach(function(el) {
        if (el.textContent.indexOf('Entrega para') !== -1 && el.textContent.indexOf('Seu nome') !== -1) {
            el.innerHTML = el.innerHTML.replace('Seu nome', nome);
        }
    });
})();
</script>
"""
    if '</body>' in content:
        content = content.replace('</body>', inject + '</body>', 1)

    with open(target, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Todas as correções aplicadas com sucesso.")

if __name__ == "__main__":
    restore_and_fix()
