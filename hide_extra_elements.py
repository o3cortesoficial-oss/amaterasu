import os

def hide_extra_elements():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Injetar script para ocultar "Cartão de Crédito" e "Cupom"
    script = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Esconder "Adicionar um cartão de crédito"
    var els = document.querySelectorAll('span, div, b, strong, h1, h2, h3, label');
    els.forEach(function(el) {
        if (el.textContent.trim() === 'Adicionar um cartão de crédito') {
            // O container geral costuma ser o mais próximo .pmts-add-payment-instrument ou .a-box
            var container = el.closest('.a-box') || el.closest('.pmts-add-payment-instrument') || el.parentElement;
            if (container) {
                container.style.display = 'none';
                container.classList.add('hide-safely');
            }
        }
        
        // Esconder "Cupom de desconto ou Vale-presente"
        if (el.textContent.trim() === 'Cupom de desconto ou Vale-presente') {
            // O container é provavelmente um a-box ou pmts-claim-code
            var container = el.closest('.pmts-claim-code') || el.closest('.a-box') || el.closest('.a-row') || el.parentElement;
            if (container) {
                container.style.display = 'none';
                container.classList.add('hide-safely');
            }
        }
    });

    // Também tentar encontrar o form ou input do cupom diretamente para ocultar
    var couponInputs = document.querySelectorAll('input[placeholder="Digitar código"], input[name="claimCode"]');
    couponInputs.forEach(function(input) {
         var box = input.closest('.a-box') || input.closest('form') || input.closest('.a-row');
         if (box) {
             box.style.display = 'none';
         }
    });
});
</script>
"""

    if '</body>' in content:
        content = content.replace('</body>', script + '\n</body>', 1)
    else:
        content += '\n' + script

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Elementos de cartão e cupom foram ocultados de forma segura.")

if __name__ == "__main__":
    hide_extra_elements()
