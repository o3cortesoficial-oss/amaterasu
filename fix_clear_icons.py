import os

def fix_clear_icons():
    path = 'Checkout - Fase 1.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # CSS para esconder todos os ícones de limpar por padrão
    # e JS para mostrar/esconder com base no conteúdo do input
    fix = """
<style>
/* Esconder X de limpar quando campo está vazio */
.address-ui-widgets-clear-icon {
    display: none !important;
}
.address-ui-widgets-clear-icon.show-clear {
    display: block !important;
}
</style>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Pegar todos os inputs com atributo clearable
    var inputs = document.querySelectorAll('input[clearable]');
    inputs.forEach(function(input) {
        var clearIcon = input.parentElement.querySelector('.address-ui-widgets-clear-icon');
        if (!clearIcon) return;

        function toggleClear() {
            if (input.value.trim().length > 0) {
                clearIcon.classList.add('show-clear');
            } else {
                clearIcon.classList.remove('show-clear');
            }
        }

        // Esconder no início
        toggleClear();

        // Monitorar digitação
        input.addEventListener('input', toggleClear);
        input.addEventListener('change', toggleClear);

        // Ao clicar no X, limpar o campo
        clearIcon.addEventListener('click', function() {
            input.value = '';
            toggleClear();
            input.focus();
        });

        clearIcon.style.cursor = 'pointer';
    });
});
</script>
"""

    if '</head>' in content:
        content = content.replace('</head>', fix + '</head>', 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Ícones de limpar corrigidos.")

if __name__ == "__main__":
    fix_clear_icons()
