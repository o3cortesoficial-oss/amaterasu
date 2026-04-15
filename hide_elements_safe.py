import os

def hide_safely():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    safe_script = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    // 1. Esconder "Adicionar um cartão de crédito"
    var links = document.querySelectorAll('a.pmts-add-payment-link');
    links.forEach(function(a) {
        if (a.textContent.indexOf('Adicionar um cartão de crédito') !== -1) {
            a.style.display = 'none';
        }
    });

    // 2. Esconder "Cupom de desconto ou Vale-presente"
    // Geralmente está dentro de um form text-input
    var forms = document.querySelectorAll('form.pmts-add-payment-instrument-form');
    forms.forEach(function(f) {
        if (f.textContent.indexOf('Cupom de desconto ou Vale-presente') !== -1) {
            f.style.display = 'none';
        }
    });

    // 3. Esconder NuPay e Geru
    var els = document.querySelectorAll('span, div, b, strong');
    els.forEach(function(el) {
        var text = el.textContent.trim();
        // Check for exact phrases to avoid hiding the wrong thing
        if (text === 'NuPay' || text === 'Habilite sua conta do Nubank e pague com NuPay em até 24x.' ||
            text === 'Solicitar crédito para parcelar sem cartão com a Geru' || text === 'Solicite agora uma linha de crédito') {
            
            // Find the outermost container to hide (usually an .a-box or .a-section)
            var container = el.closest('.pmts-mpo-add-payment-method-trigger-mobile') || el.closest('.a-box');
            if (container) {
                container.style.display = 'none'; // hiding safely with JS inline style
            }
        }
    });

    // 4. Esconder botão continuar inferior
    var bottomInput = document.querySelector('input[data-csa-c-slot-id="continue-button-bottom"]');
    if (bottomInput) {
        var bottomContainer = bottomInput.closest('.a-declarative') || bottomInput.closest('.a-button');
        if (bottomContainer) {
            bottomContainer.style.display = 'none';
        }
    }
});
</script>
"""

    if '</body>' in content:
        content = content.replace('</body>', safe_script + '\n</body>', 1)
    else:
        content += '\n' + safe_script

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Elementos ocultados de forma SEGURA.")

if __name__ == "__main__":
    hide_safely()
