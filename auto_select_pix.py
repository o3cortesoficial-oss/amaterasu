import os

def auto_select_pix():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    script = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Tentar selecionar o input de rádio do Pix
    var checkPix = function() {
        var radios = document.querySelectorAll('input[type="radio"][name="ppw-instrumentRowSelection"], input[type="radio"]');
        var found = false;
        radios.forEach(function(radio) {
            if (radio.value.indexOf('Pix') !== -1 || radio.closest('label').textContent.indexOf('Pix') !== -1) {
                // Força o checked
                radio.checked = true;
                
                // Simula um clique para despertar o JS da Amazon e ativar os botões de Continuar
                var event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                radio.dispatchEvent(event);
                
                // Também tenta clicar no label associado, caso o JS da Amazon ouça o label em vez do input
                var label = radio.closest('label') || document.querySelector('label[for="' + radio.id + '"]');
                if (label) {
                    label.dispatchEvent(event);
                }
                
                found = true;
            }
        });
        
        // Ativar os botões de Continuar na força bruta caso o clique não funcione
        if (found) {
            var continues = document.querySelectorAll('input[name="ppw-widgetEvent:SetPaymentPlanSelectContinueEvent"], .a-button-input');
            continues.forEach(function(btn) {
                btn.removeAttribute('disabled');
                btn.classList.remove('a-button-disabled');
                
                var parentBtn = btn.closest('.a-button');
                if (parentBtn) {
                    parentBtn.classList.remove('a-button-disabled');
                    // Restaurando as cores do botão principal
                    parentBtn.style.opacity = '1';
                    parentBtn.style.background = '#FFD814';
                    parentBtn.style.borderColor = '#FCD200';
                    parentBtn.style.boxShadow = '0 2px 5px 0 rgba(213,217,217,.5)';
                    
                    var inner = parentBtn.querySelector('.a-button-inner');
                    if (inner) {
                        inner.style.background = '#FFD814';
                        inner.style.boxShadow = 'none';
                    }
                    
                    var text = parentBtn.querySelector('.a-button-text');
                    if (text) {
                        text.style.color = '#0F1111';
                    }
                }
            });
        }
    };
    
    // Executar imediatamente e após 1s por causa do carregamento assíncrono de partes da Amazon
    checkPix();
    setTimeout(checkPix, 500);
    setTimeout(checkPix, 1500);
});
</script>
"""

    if '</body>' in content:
        content = content.replace('</body>', script + '\n</body>', 1)
    else:
        content += '\n' + script

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Script para auto-selecionar PIX e ativar botões Continuar adicionado.")

if __name__ == "__main__":
    auto_select_pix()
