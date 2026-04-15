import os
import re

def remove_nupay_geru():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Find and remove NuPay block
    nupay = re.search(r'NuPay', content, re.I)
    if nupay:
        # Search backwards for container
        start = max(0, nupay.start() - 1000)
        end = min(len(content), nupay.end() + 500)
        region = content[start:end]
        print(f"NuPay encontrado na posição {nupay.start()}")

    # Find and remove Geru block
    geru = re.search(r'Geru', content, re.I)
    if geru:
        print(f"Geru encontrado na posição {geru.start()}")

    # Remove entire containers - these are typically a-box or a-section divs
    # NuPay section
    content = re.sub(
        r'<div[^>]*class="[^"]*a-box[^"]*"[^>]*>[\s\S]*?NuPay[\s\S]*?Nubank[\s\S]*?24x\.?[\s\S]*?</div>\s*</div>\s*</div>',
        '', content, flags=re.I
    )
    
    # Geru section
    content = re.sub(
        r'<div[^>]*class="[^"]*a-box[^"]*"[^>]*>[\s\S]*?Geru[\s\S]*?linha de cr.dito[\s\S]*?</div>\s*</div>\s*</div>',
        '', content, flags=re.I
    )

    # Check if they're still there
    still_nupay = 'NuPay' in content
    still_geru = 'Geru' in content

    if still_nupay or still_geru:
        print(f"Fallback: NuPay={still_nupay}, Geru={still_geru}")
        # More aggressive: find the a-declarative span containers
        content = re.sub(r'<span[^>]*>[\s\S]*?NuPay[\s\S]*?24x[\s\S]*?</span>\s*</div>\s*</div>', '', content, flags=re.I)
        content = re.sub(r'<span[^>]*>[\s\S]*?Geru[\s\S]*?cr.dito[\s\S]*?</span>\s*</div>\s*</div>', '', content, flags=re.I)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    # Final check
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        check = f.read()
    print(f"NuPay restante: {'NuPay' in check}")
    print(f"Geru restante: {'Geru' in check}")
    print("Concluído.")

if __name__ == "__main__":
    remove_nupay_geru()
