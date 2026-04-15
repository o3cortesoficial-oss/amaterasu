import os
import re

file_path = r'C:\Users\samue\Downloads\Oferta drone AMZ\Checkout - Fase 4.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Atualização do bloco de sincronização para tratar a vírgula extra
price_sync_block = """
    // --- 2. Sincronização Dinâmica de Preços ---
    let priceWhole = localStorage.getItem('checkout_price_whole') || '4.510';
    let priceFraction = localStorage.getItem('checkout_price_fraction') || '50';
    
    // Remover vírgulas residuais que possam vir da captura
    priceWhole = priceWhole.replace(',', '').trim();
    priceFraction = priceFraction.replace(',', '').trim();
    
    // Obter valor numérico limpo para cálculos
    const cleanPriceWhole = priceWhole.replace(/[^0-9]/g, '');
    const cleanPriceFraction = priceFraction.replace(/[^0-9]/g, '');
    let itemBaseValue = parseFloat(cleanPriceWhole + '.' + cleanPriceFraction);
    
    let shippingValue = 8.90;
    let totalBeforeDiscount = itemBaseValue + shippingValue;

    // Formatação
    const formatBRL = (val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    
    const formattedItem = 'R$ ' + priceWhole + ',' + priceFraction;
    const formattedShipping = 'R$ ' + formatBRL(shippingValue);
    const formattedTotalBefore = 'R$ ' + formatBRL(totalBeforeDiscount);
    const formattedDiscount = '-R$ ' + formatBRL(shippingValue);
    const formattedFinal = formattedItem;

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
            const valEl = row.querySelector('.a-text-right');
            
            row.style.display = '';

            if (text.includes('Itens:')) {
                if (valEl) valEl.innerHTML = formattedItem;
            } else if (text.includes('Frete:')) {
                if (valEl) valEl.innerHTML = formattedShipping;
            } else if (text.includes('Total:') && !text.includes('Total do pedido:')) {
                if (valEl) valEl.innerHTML = formattedTotalBefore;
            } else if (text.includes('Total do pedido:')) {
                if (valEl) valEl.innerHTML = formattedFinal;
            }
            
            if (text.includes('Frete GRÁTIS') && text.includes('R$')) {
                if (valEl) valEl.innerHTML = formattedDiscount;
            }
        });
    }
"""

pattern = r'// --- 2\. Sincronização Dinâmica de Preços ---.*?// --- 3\.'
replacement = price_sync_block + '\n    // --- 3.'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Correcao das virgulas aplicada com sucesso.")
else:
    print("Nao foi possivel localizar o bloco para correcao.")
