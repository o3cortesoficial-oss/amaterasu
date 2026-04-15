import os

def remove_bottom_space():
    path = "Checkout - Fase 3.html"
    
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    css_fix = """
<style>
/* Remover espacamentos fantasmas do final da pagina */
.bottomsheet-container, 
#a-popover-root, 
#a-popover-modal, 
#a-white, 
#sis_pixel_r2 {
    display: none !important;
    height: 0 !important;
    width: 0 !important;
    overflow: hidden !important;
}

body {
    padding-bottom: 0px !important;
    margin-bottom: 0px !important;
}

/* Remover possivel margem no HTML */
html {
    padding-bottom: 0px !important;
    margin-bottom: 0px !important;
}
</style>
"""
    if '/* Remover espacamentos fantasmas do final da pagina */' not in content:
        if '</head>' in content:
            content = content.replace('</head>', css_fix + '\n</head>', 1)
        else:
            content = css_fix + content
            
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("CSS para remover espaçamento fantasma adicionado em Fase 3.")
    else:
        print("CSS já existente em Fase 3.")

if __name__ == "__main__":
    remove_bottom_space()
