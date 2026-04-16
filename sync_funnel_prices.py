import os
import re

# Final confirmed price
NEW_PRICE_VAL = 138.77
NEW_PRICE_WHOLE = "138"
NEW_PRICE_FRACTION = "77"
NEW_PRICE_FORMATTED = f"{NEW_PRICE_WHOLE},{NEW_PRICE_FRACTION}"

# Old prices found in the code
OLD_PRICES = ["4.510,50", "4.519,40", "4.510"]
OLD_PRICE_VAL = 4510.50
OLD_PRICE_WHOLE = "4510"

# Target directories and files
BASE_DIR = r"C:\Users\samue\Downloads\Oferta drone AMZ"
FILES_TO_PROCESS = [
    "Landpagedrone.html",
    "Checkout - Fase 1.html",
    "Checkout - Fase 2.html",
    "Checkout - Fase 3.html",
    "Checkout - Fase 4.html",
    "Checkout - Fase 5 (page qr code).html",
    "success.html",
    "assets/js/supabase-bridge.js",
    "assets/js/pix-ui.js",
    "api/index.mjs"
]

def sync_prices():
    print(f"--- Starting Hardened Price Sync to R$ {NEW_PRICE_FORMATTED} ---")
    
    for filename in FILES_TO_PROCESS:
        file_path = os.path.join(BASE_DIR, filename)
        if not os.path.exists(file_path):
            print(f"Skipping: {filename} (not found)")
            continue
            
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        original_content = content
        
        # 1. Replace hardcoded formatted strings
        for old_price in OLD_PRICES:
            content = content.replace(f"R$&nbsp;{old_price}", f"R$&nbsp;{NEW_PRICE_FORMATTED}")
            content = content.replace(f"R$ {old_price}", f"R$ {NEW_PRICE_FORMATTED}")
            
        # 2. Replace numeric values in JSON/JS (e.g., 4510.5, 4510.50)
        content = re.sub(r'4510\.50?', str(NEW_PRICE_VAL), content)
        
        # 3. Replace whole number occurrences (e.g., sessionStorage value '4510')
        # Use word boundaries to avoid replacing parts of other numbers/ids
        content = re.sub(r'\b4510\b', NEW_PRICE_WHOLE, content)
            
        # 4. Lander specific fix for individual spans
        if filename == "Landpagedrone.html":
            content = re.sub(r'<span class="a-price-whole">.*?</span>', f'<span class="a-price-whole">{NEW_PRICE_WHOLE}</span>', content)
            content = re.sub(r'<span class="a-price-fraction">.*?</span>', f'<span class="a-price-fraction">{NEW_PRICE_FRACTION}</span>', content)

        if content != original_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Updated: {filename}")
        else:
            print(f"No changes needed for: {filename}")

    print("--- Hardened Price Sync Complete ---")

if __name__ == "__main__":
    sync_prices()
