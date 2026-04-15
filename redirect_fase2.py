import os
import re

def redirect_to_fase2():
    path = 'Checkout - Fase 1.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Inject JS to intercept the submit button and redirect to Fase 2
    js = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Find the "Usar este endereço" button by its text
    var buttons = document.querySelectorAll('.a-button-text, input[type="submit"], button');
    buttons.forEach(function(btn) {
        if (btn.textContent && btn.textContent.trim().includes('Usar este endere')) {
            var container = btn.closest('span.a-button') || btn.closest('.a-button') || btn;
            container.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = 'Checkout - Fase 2.html';
            }, true);
        }
    });

    // Also intercept form submissions
    document.querySelectorAll('form').forEach(function(f) {
        f.addEventListener('submit', function(e) {
            e.preventDefault();
            window.location.href = 'Checkout - Fase 2.html';
        });
    });
});
</script>
"""

    if '</body>' in content:
        content = content.replace('</body>', js + '</body>', 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Redirecionamento para Fase 2 configurado.")

if __name__ == "__main__":
    redirect_to_fase2()
