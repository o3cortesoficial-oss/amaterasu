import os

def force_continue():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    script = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Forçar redirecionamento dos botões Continuar para Fase 3
    setTimeout(function() {
        var continues = document.querySelectorAll('.a-button-input[type="submit"]');
        continues.forEach(function(btn) {
            // Remover qualquer type submit para evitar conflitos com forms
            btn.type = 'button';
            
            // Adicionar evento no capturing phase
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = 'Checkout - Fase 3.html';
            }, true);
            
            // Buscar spans parents e aplicar click tambem
            var parentSpan = btn.closest('.a-button');
            if (parentSpan) {
                parentSpan.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = 'Checkout - Fase 3.html';
                }, true);
            }
        });
    }, 2000); // 2 segundos para garantir que tudo carregou
});
</script>
"""
    if 'Forçar redirecionamento dos botões Continuar para Fase 3' not in content:
        if '</body>' in content:
            content = content.replace('</body>', script + '\n</body>', 1)
        else:
            content += '\n' + script

        with open(path, 'w', encoding='utf-8') as f:
             f.write(content)
        print("Força bruta do botão adicionada!")
    else:
        print("Força bruta já existente.")

if __name__ == "__main__":
    force_continue()
