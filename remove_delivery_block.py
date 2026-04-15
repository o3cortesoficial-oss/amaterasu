import os
import re

def remove_delivery_block():
    path = 'Checkout - Fase 1.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Remove the entire a-row div that contains the delivery instructions widget
    # The structure is: <div class=a-row> <span class=a-declarative data-action=a-secondary-view ...delivery-instructions...> ... </span> </div>
    pattern = r'<div class=a-row>\s*<span[^>]*data-a-secondary-view=\'[^\']*delivery-instructions[^\']*\'[^>]*>.*?</span>\s*</div>'
    match = re.search(pattern, content, re.I | re.DOTALL)
    
    if match:
        content = content.replace(match.group(0), '')
        print(f"Bloco de instruções de entrega removido ({len(match.group(0))} chars)")
    else:
        # Try broader: remove anything referencing delivery-instructions
        pattern2 = r'<div class=a-row>[\s\S]*?delivery-instructions[\s\S]*?</div>\s*\n'
        match2 = re.search(pattern2, content, re.I)
        if match2:
            content = content.replace(match2.group(0), '')
            print(f"Bloco removido via fallback ({len(match2.group(0))} chars)")
        else:
            print("Bloco não encontrado.")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Concluído.")

if __name__ == "__main__":
    remove_delivery_block()
