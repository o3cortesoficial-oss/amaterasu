import os
import re

def add_spacing():
    path = 'Checkout - Fase 1.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Inject CSS to add margin-bottom to the submit button container before the footer
    css = """
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
    # Insert the CSS right before </head>
    if '</head>' in content:
        content = content.replace('</head>', css + '</head>', 1)
    else:
        content = css + content

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Espaçamento adicionado.")

if __name__ == "__main__":
    add_spacing()
