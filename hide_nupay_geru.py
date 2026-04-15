import os

def hide_nupay_geru():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # CSS / JS to safely hide the blocks without breaking HTML tags
    hide_script = """
<style>
/* CSS fallback if the script fails, though we don't have stable IDs to rely on. 
   We will rely on JS for exact text matching to hide the parents safely. */
.hide-safely {
    display: none !important;
}
</style>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Find all spans or divs that might contain "NuPay" or "Geru"
    var els = document.querySelectorAll('span, div, b, strong');
    els.forEach(function(el) {
        var text = el.textContent.trim();
        // Check for exact phrases to avoid hiding the wrong thing
        if (text === 'NuPay' || text === 'Habilite sua conta do Nubank e pague com NuPay em até 24x.' ||
            text === 'Solicitar crédito para parcelar sem cartão com a Geru' || text === 'Solicite agora uma linha de crédito') {
            
            // Find the outermost container to hide (usually an .a-box or .a-section)
            // But we have to be careful not to hide the whole page.
            var container = el.closest('.pmts-mpo-add-payment-method-trigger-mobile') || el.closest('.a-box');
            if (container) {
                container.classList.add('hide-safely');
            }
        }
    });
});
</script>
"""

    if '</body>' in content:
        content = content.replace('</body>', hide_script + '\n</body>', 1)
    else:
        # Append to the end
        content += '\n' + hide_script

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Script de ocultação do NuPay/Geru injetado com sucesso.")

if __name__ == "__main__":
    hide_nupay_geru()
