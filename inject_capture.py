import os

def inject_price_capture():
    file_path = r'C:\Users\samue\Downloads\Oferta drone AMZ\Landpagedrone_limpo.html'
    
    if not os.path.exists(file_path):
        print("Arquivo Landing Page não encontrado.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # JS Logic to capture and store price
    capture_script = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando captura de preço...');
    
    try {
        // Amazon suele usar estas clases para el precio principal
        const wholeElement = document.querySelector('.a-price-whole');
        const fractionElement = document.querySelector('.a-price-fraction');
        
        let priceWhole = '4.510';
        let priceFraction = '50';
        
        if (wholeElement) {
            priceWhole = wholeElement.innerText.replace(/[^0-9.]/g, '').trim();
        }
        
        if (fractionElement) {
            priceFraction = fractionElement.innerText.replace(/[^0-9]/g, '').trim();
        }
        
        console.log('Preço capturado:', priceWhole + ',' + priceFraction);
        
        localStorage.setItem('checkout_price_whole', priceWhole);
        localStorage.setItem('checkout_price_fraction', priceFraction);
        
    } catch (e) {
        console.error('Erro ao capturar preço:', e);
    }
});
</script>
"""

    if '</html>' in content.lower():
        index = content.lower().find('</html>')
        content = content[:index] + capture_script + content[index:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Captura de preço injetada na Landing Page.")
    else:
        content += capture_script
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Captura de preço injetada na Landing Page (final do arquivo).")

if __name__ == "__main__":
    inject_price_capture()
