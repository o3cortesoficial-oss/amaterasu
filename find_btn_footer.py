import os
import re

def find_button_and_footer():
    path = 'Checkout - Fase 1.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Find "Usar este endereço" button
    match = re.search(r'Usar este endere', content, re.I)
    if match:
        start = max(0, match.start() - 400)
        end = min(len(content), match.end() + 200)
        print("--- BOTÃO ---")
        print(content[start:end])
        print()

    # Find footer
    match2 = re.search(r'navFooter|nav-footer|checkout-footer|footer-section', content, re.I)
    if match2:
        start = max(0, match2.start() - 100)
        end = min(len(content), match2.end() + 300)
        print("--- FOOTER ---")
        print(content[start:end])

if __name__ == "__main__":
    find_button_and_footer()
