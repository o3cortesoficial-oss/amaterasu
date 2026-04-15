import os

def update_first_name():
    path = 'Checkout - Fase 2.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # We will inject a new small script block to handle just this first name logic
    script = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    var raw = localStorage.getItem('checkout_address');
    if (raw) {
        var data = JSON.parse(raw);
        var nomeCompleto = data.nome || 'Cliente';
        var primeiroNome = nomeCompleto.split(' ')[0];
        
        // Find the specific span containing " Said"
        var spans = document.querySelectorAll('span.a-size-medium.a-text-bold');
        spans.forEach(function(span) {
            if (span.textContent.trim() === 'Said') {
                span.textContent = ' ' + primeiroNome;
            }
        });
    }
});
</script>
"""

    if '</body>' in content:
        content = content.replace('</body>', script + '\n</body>', 1)
    else:
        content += '\n' + script

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Script do primeiro nome adicionado com sucesso.")

if __name__ == "__main__":
    update_first_name()
