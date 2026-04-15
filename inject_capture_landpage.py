import os
import re

file_path = r'C:\Users\samue\Downloads\Oferta drone AMZ\Landpagedrone.html'

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Script to capture price
capture_script = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    function capturePrice() {
        const wholeElement = document.querySelector('.a-price-whole');
        const fractionElement = document.querySelector('.a-price-fraction');
        
        if (wholeElement && fractionElement) {
            const whole = wholeElement.innerText.trim();
            const fraction = fractionElement.innerText.trim();
            
            localStorage.setItem('checkout_price_whole', whole);
            localStorage.setItem('checkout_price_fraction', fraction);
            console.log('Price captured from Landpagedrone.html:', whole, fraction);
        } else {
            console.warn('Price elements not found on this page.');
        }
    }
    
    capturePrice();
    // Re-capture if anything dynamic happens
    setTimeout(capturePrice, 1000);
});
</script>
"""

# Inject before </body>
if '</body>' in content:
    content = content.replace('</body>', capture_script + '</body>')
else:
    content += capture_script

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Capture script successfully injected into Landpagedrone.html")
