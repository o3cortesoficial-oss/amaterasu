import os
import re

def connect_phases():
    # --- FASE 1: Salvar dados no localStorage ao clicar em "Usar este endereço" ---
    fase1_path = 'Checkout - Fase 1.html'
    with open(fase1_path, 'r', encoding='utf-8', errors='ignore') as f:
        fase1 = f.read()

    save_script = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Interceptar o botão "Usar este endereço" para salvar dados
    document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function() {
            var fields = {
                nome: document.querySelector('[name*="FullName"], [name*="fullName"]'),
                rua: document.querySelector('[name*="streetName"], [name*="AddressLine1"]'),
                numero: document.querySelector('[name*="buildingNumber"]'),
                bairro: document.querySelector('[name*="neighborhood"]'),
                cidade: document.querySelector('[name*="City"], [name*="city"]'),
                estado: document.querySelector('[name*="State"], [name*="state"]'),
                cep: document.querySelector('[name*="PostalCode"], [name*="postalCode"]'),
                telefone: document.querySelector('[name*="Phone"], [name*="phone"]')
            };
            var data = {};
            for (var key in fields) {
                data[key] = fields[key] ? fields[key].value : '';
            }
            localStorage.setItem('checkout_address', JSON.stringify(data));
        });
    });
});
</script>
"""
    if '</body>' in fase1:
        fase1 = fase1.replace('</body>', save_script + '</body>', 1)
    
    with open(fase1_path, 'w', encoding='utf-8') as f:
        f.write(fase1)
    print("Fase 1: Script de salvamento adicionado.")

    # --- FASE 2: Limpar dados antigos e puxar do localStorage ---
    fase2_path = 'Checkout - Fase 2.html'
    with open(fase2_path, 'r', encoding='utf-8', errors='ignore') as f:
        fase2 = f.read()

    # Primeiro, encontrar o bloco com o endereço hardcoded
    # Procurar por "Said Labs Global" e "Rua R. A. Costa"
    old_values = ['Said Labs Global', 'Rua R. A. Costa', '76240000', '149']
    for v in old_values:
        if v in fase2:
            print(f"  Fase 2: Encontrado '{v}' - será substituído dinamicamente")

    # Injetar script que substitui o conteúdo do endereço
    load_script = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    var raw = localStorage.getItem('checkout_address');
    if (!raw) return;
    
    var data = JSON.parse(raw);
    
    // Montar o endereço formatado
    var nome = data.nome || 'Cliente';
    var parts = [];
    if (data.rua) parts.push(data.rua);
    if (data.numero) parts.push(data.numero);
    if (data.bairro) parts.push(data.bairro);
    if (data.cidade) parts.push(data.cidade);
    if (data.estado) parts.push(data.estado);
    if (data.cep) parts.push(data.cep);
    parts.push('Brasil');
    var endereco = parts.join(', ');

    // Encontrar o elemento que exibe "Entrega para ..."
    var allElements = document.querySelectorAll('span, div, b, strong');
    allElements.forEach(function(el) {
        // Substituir nome
        if (el.textContent.trim() === 'Said Labs Global') {
            el.textContent = nome;
        }
    });

    // Substituir o endereço completo
    allElements.forEach(function(el) {
        var text = el.textContent.trim();
        if (text.indexOf('Rua R. A. Costa') !== -1 || text.indexOf('76240000') !== -1) {
            el.textContent = endereco;
        }
    });

    // Também substituir em "Entrega para X"
    allElements.forEach(function(el) {
        if (el.textContent.indexOf('Entrega para') !== -1 && el.textContent.indexOf('Said Labs') !== -1) {
            el.innerHTML = el.innerHTML.replace('Said Labs Global', nome);
        }
    });
});
</script>
"""
    # Limpar </body></html> e reinserir
    if '</body>' in fase2:
        fase2 = fase2.replace('</body>', load_script + '</body>', 1)

    with open(fase2_path, 'w', encoding='utf-8') as f:
        f.write(fase2)
    print("Fase 2: Script de carregamento adicionado.")
    print("Conexão entre fases configurada.")

if __name__ == "__main__":
    connect_phases()
