import os
import shutil

def decouple_fase3():
    path = 'Checkout - Fase 3.html'
    backup_path = 'Checkout - Fase 3 BKUP.html'
    
    # Criar backup se não existir
    if not os.path.exists(backup_path):
        shutil.copy2(path, backup_path)
        print("Backup Checkout - Fase 3 BKUP.html criado.")

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    js_inject = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    // 1. Bloqueio Amazon - Prevenir links vazarem do site local
    var blockList = ['amazon.com', 'amazon.com.br'];
    document.addEventListener('click', function(e) {
        var a = e.target.closest('a');
        if (a && a.href && blockList.some(function(d) { return a.href.indexOf(d) !== -1; })) {
            e.preventDefault();
        }
    }, true);

    // 2. Preencher Nome da Fase 1 automaticamente
    var raw = localStorage.getItem('checkout_address');
    var addressObj = raw ? JSON.parse(raw) : {};
    
    var nameInput = document.getElementById('payments-risk-compliance-customer-fullName');
    if (nameInput && addressObj.nome) {
        nameInput.value = addressObj.nome;
    }
    
    // Opcional: Adicionar Mascara simples de CPF
    var cpfInput = document.getElementById('payments-risk-compliance-customer-cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            var val = e.target.value.replace(/\D/g, '');
            if (val.length > 11) val = val.substring(0, 11);
            if (val.length > 9) {
                val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
            } else if (val.length > 6) {
                val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
            } else if (val.length > 3) {
                val = val.replace(/(\d{3})(\d{1,3})/, "$1.$2");
            }
            e.target.value = val;
        });
    }

    // 3. Forçar Redirecionamento no Botão Continuar e Salvar CPF + Nome
    setTimeout(function() {
        var continues = document.querySelectorAll('.a-button-input[type="submit"], #checkout-primary-continue-button-id');
        continues.forEach(function(btn) {
            // Remover submit pra não conflitar com a Amazon
            if (btn.tagName === 'INPUT') {
                btn.type = 'button';
            }
            
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Salvar dados
                if (cpfInput) addressObj.cpf = cpfInput.value;
                if (nameInput) addressObj.nome = nameInput.value;
                localStorage.setItem('checkout_address', JSON.stringify(addressObj));
                
                // Redirecionar para a Fase 4 localmente
                window.location.href = 'Checkout - Fase 4.html';
            }, true);
            
            // Caso tenha uma tag span que embrulhe e pegue o clique:
            var parentSpan = btn.closest('.a-button');
            if (parentSpan) {
                parentSpan.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (cpfInput) addressObj.cpf = cpfInput.value;
                    if (nameInput) addressObj.nome = nameInput.value;
                    localStorage.setItem('checkout_address', JSON.stringify(addressObj));
                    
                    window.location.href = 'Checkout - Fase 4.html';
                }, true);
            }
        });
    }, 500); // 500ms para pegar carregamento
});
</script>
"""
    if 'Bloqueio Amazon - Prevenir links vazarem do site local' not in content:
        if '</body>' in content:
            content = content.replace('</body>', js_inject + '\n</body>')
        else:
            content += '\n' + js_inject
            
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Script injetado com sucesso na Fase 3!")
    else:
        print("Script já injetado na Fase 3.")

if __name__ == "__main__":
    decouple_fase3()
