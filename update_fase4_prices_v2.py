import os
import re

file_path = r'C:\Users\samue\Downloads\Oferta drone AMZ\Checkout - Fase 4.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

price_sync_block = """
    // --- 2. Sincronização Dinâmica de Preços ---
    const priceWhole = localStorage.getItem('checkout_price_whole') || '4.510';
    const priceFraction = localStorage.getItem('checkout_price_fraction') || '50';
    
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
    const formattedFinal = formattedItem; // O total do pedido deve ser o mesmo do item

    // Atualizar Preço do Item na Lista
    document.querySelectorAll('.lineitem-price-text').forEach(el => {
        el.innerHTML = formattedItem;
    });

    // Atualizar Tabela de Subtotais (Puxando valores e calculando math)
    const subtotalTable = document.getElementById('subtotals-marketplace-table');
    if (subtotalTable) {
        const rows = subtotalTable.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.innerText;
            const valEl = row.querySelector('.a-text-right');
            
            // Mostrar todas as linhas novamente
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
            
            // Atualizar o valor do desconto de "Frete GRÁTIS"
            if (text.includes('Frete GRÁTIS') && text.includes('R$')) {
                if (valEl) valEl.innerHTML = formattedDiscount;
            }
        });
    }
"""

# Use regex to find the old block and replace it
pattern = r'// --- 2\. Sincronização Dinâmica de Preços ---.*?// --- 3\.'
replacement = price_sync_block + '\n    // --- 3.'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Price synchronization updated to show correctly with shipping and discounts.")
else:
    print("Could not find the price synchronization block to update.")
