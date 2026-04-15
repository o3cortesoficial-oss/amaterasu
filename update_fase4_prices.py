import os
import re

file_path = r'C:\Users\samue\Downloads\Oferta drone AMZ\Checkout - Fase 4.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I'll update the custom_js part of the file.
# The previous script is already there, I'll replace the // --- 2. Sincronização Dinâmica de Preços --- block.

price_sync_block = """
    // --- 2. Sincronização Dinâmica de Preços ---
    const priceWhole = localStorage.getItem('checkout_price_whole') || '4.510';
    const priceFraction = localStorage.getItem('checkout_price_fraction') || '50';
    
    const formattedItem = 'R$ ' + priceWhole + ',' + priceFraction;
    const formattedZero = 'R$ 0,00';

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
            
            if (text.includes('Itens:')) {
                if (valEl) valEl.innerHTML = formattedItem;
            } else if (text.includes('Frete:')) {
                if (valEl) valEl.innerHTML = formattedZero;
            } else if (text.includes('Total:') || text.includes('Total do pedido:')) {
                if (valEl) valEl.innerHTML = formattedItem;
            }
            
            // Ocultar a linha de "Frete GRÁTIS" (desconto) para não confundir
            if (text.includes('Frete GRÁTIS') && text.includes('-R$')) {
                row.style.display = 'none';
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
    print("Price synchronization updated to match product page exactly.")
else:
    print("Could not find the price synchronization block to update.")
