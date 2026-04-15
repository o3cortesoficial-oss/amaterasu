import os
import re

def remove_delivery_instructions():
    path = 'Checkout - Fase 1.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Find the "Instruções de entrega" text and its container
    # Look for the expandable section containing this text
    patterns = [
        # Pattern 1: a-expander or a-box containing the delivery instructions
        r'<div[^>]*class=\"[^\"]*a-expander[^\"]*\"[^>]*>.*?Instru.*?es de entrega.*?</div>\s*</div>\s*</div>',
        # Pattern 2: a-row or section containing delivery instructions
        r'<div[^>]*>[\s\S]*?Instru.*?es de entrega \(opcional\)[\s\S]*?c.digos de acesso etc\.[\s\S]*?</div>\s*</div>',
    ]
    
    # First, let's find the exact context
    match = re.search(r'Instru.*?es de entrega', content, re.I)
    if match:
        start = max(0, match.start() - 500)
        end = min(len(content), match.end() + 500)
        context = content[start:end]
        print("--- CONTEXTO ---")
        print(context)
        print("--- FIM CONTEXTO ---")
        
        # Now find the outermost container div
        # Search backwards for the container start
        search_start = max(0, match.start() - 1000)
        search_end = min(len(content), match.end() + 1000)
        region = content[search_start:search_end]
        
        # Look for the a-expander-container or delivery-instructions section
        expander_match = re.search(
            r'<div[^>]*class=\"[^\"]*(?:a-expander-container|delivery-instruction)[^\"]*\"[^>]*>.*?Instru.*?es de entrega.*?(?:</div>\s*){2,6}',
            region, re.I | re.DOTALL
        )
        
        if expander_match:
            to_remove = expander_match.group(0)
            content = content.replace(to_remove, '')
            print(f"\nRemovido bloco expander ({len(to_remove)} chars)")
        else:
            # Fallback: find the a-row containing it
            row_match = re.search(
                r'<div[^>]*class=\"[^\"]*a-row[^\"]*\"[^>]*>\s*<div[^>]*>.*?Instru.*?es de entrega.*?(?:</div>\s*){2,5}',
                region, re.I | re.DOTALL
            )
            if row_match:
                to_remove = row_match.group(0)
                content = content.replace(to_remove, '')
                print(f"\nRemovido bloco a-row ({len(to_remove)} chars)")
            else:
                print("\nNão encontrou container exato, removendo via abordagem agressiva...")
                # Most aggressive: remove everything between markers
                content = re.sub(
                    r'<[^>]*>[\s]*Instru[^<]*es de entrega \(opcional\)[\s]*</[^>]*>[\s]*<[^>]*>[\s]*Notas, prefer[^<]*ncias, c[^<]*digos de acesso etc\.?[\s]*</[^>]*>',
                    '',
                    content,
                    flags=re.I | re.DOTALL
                )
                print("Textos removidos via fallback.")
    else:
        print("Texto 'Instruções de entrega' não encontrado.")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Concluído.")

if __name__ == "__main__":
    remove_delivery_instructions()
