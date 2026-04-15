import os

def fix_spacing():
    path = 'Checkout - Fase 1.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Remove o CSS antigo que não funcionou
    old_css = """
<style>
/* Espaçamento entre botão e footer */
.a-button-span-submit, .a-button-input[type="submit"] {
    margin-bottom: 40px !important;
}
#address-ui-widgets-form-submit-button {
    margin-bottom: 40px !important;
}
.checkout-footer, #navFooter, .nav-footer {
    margin-top: 40px !important;
}
</style>
"""
    content = content.replace(old_css, '')

    # Novo CSS com seletores corretos
    new_css = """
<style>
/* Espaçamento entre botão e footer */
[data-testid="bottom-continue-button"] {
    margin-bottom: 50px !important;
}
#nav-ftr {
    margin-top: 50px !important;
}
</style>
"""
    if '</head>' in content:
        content = content.replace('</head>', new_css + '</head>', 1)
    else:
        content = new_css + content

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Espaçamento corrigido.")

if __name__ == "__main__":
    fix_spacing()
