import os
import re

def unified_fix():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 1. Limpeza Radical
    # Remove qualquer injeção anterior minha (procura por Nominatim ou blocker do Amazon)
    content = re.sub(r'<script.*?>.*?(nominatim\.openstreetmap\.org|amazon\.com\.br).*?<\/script>', '', content, flags=re.I | re.DOTALL)
    
    # Remove valores hardcoded (caso algum tenha voltado)
    old_values = ['76240000', 'Aragarças', 'Goiás', '149', 'Said Labs Global', 'Rua R. A. Costa']
    for v in old_values:
        # Padrão para value=ARAGARCAS (sem aspas) ou value="ARAGARCAS"
        content = re.sub(rf'value\s*=\s*[\"\']?{re.escape(v)}[\"\']?', 'value=""', content, flags=re.I)

    # 2. O NOVO SCRIPT UNIFICADO
    final_script = """
<script>
/**
 * UNIFIED CHECKOUT SCRIPT: GEOLOCATION + AMAZON DECOUPLING
 */
(function() {
    console.log('Script Unificado Ativo');

    // --- 1. DECOUPLING LOGIC ---
    const blockList = ['amazon.com', 'amazon.com.br'];

    // Redirecionar form para Fase 2
    document.querySelectorAll('form').forEach(f => {
        if (f.action.includes('amazon') || f.action.includes('/checkout/')) {
            f.action = 'Checkout - Fase 2.html';
        }
    });

    // Bloquear links externos
    document.addEventListener('click', function(e) {
        const a = e.target.closest('a');
        if (a && a.href && blockList.some(d => a.href.includes(d))) {
            e.preventDefault();
            console.log('Link bloqueado:', a.href);
        }
    }, true);

    // --- 2. GEOLOCATION LOGIC ---
    function findField(identifiers) {
        for (let id of identifiers) {
            let el = document.getElementById(id) || document.querySelector(`[name*="${id}"]`) || document.querySelector(`[placeholder*="${id}"]`);
            if (el) return el;
        }
        return null;
    }

    const fieldMap = {
        postalCode: ['PostalCode', 'CEP', 'zip'],
        street: ['streetName', 'AddressLine1', 'Rua', 'Endereço'],
        number: ['buildingNumber', 'Número', 'number'],
        neighborhood: ['neighborhood', 'Bairro', 'district'],
        city: ['AddressCity', 'Cidade', 'city'],
        state: ['AddressStateOrRegion', 'Estado', 'state', 'uf']
    };

    function triggerGeo() {
        const btn = Array.from(document.querySelectorAll('.a-button-text, button, a'))
                         .find(el => el.textContent.toLowerCase().includes('localização atual'));
        
        if (!btn) {
            console.error('Botão não encontrado');
            return;
        }

        const btnContainer = btn.closest('.a-button') || btn;
        btnContainer.style.cursor = 'pointer';
        
        btnContainer.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (!navigator.geolocation) {
                alert('Geolocalização não suportada.');
                return;
            }

            const originalText = btn.innerText;
            btn.innerText = 'Buscando Localização...';

            navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1`, {
                        headers: { 'Accept-Language': 'pt-BR' }
                    });
                    const data = await response.json();
                    
                    if (data && data.address) {
                        const addr = data.address;
                        const values = {
                            postalCode: addr.postcode || '',
                            street: addr.road || addr.pedestrian || '',
                            number: addr.house_number || '',
                            neighborhood: addr.suburb || addr.neighbourhood || '',
                            city: addr.city || addr.town || addr.village || '',
                            state: addr.state || ''
                        };

                        for (let key in fieldMap) {
                            const input = findField(fieldMap[key]);
                            if (input) {
                                input.value = values[key];
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                        alert('Endereço preenchido!');
                    } else {
                        alert('Erro ao converter endereço.');
                    }
                } catch (err) {
                    alert('Erro de conexão com o serviço de mapas.');
                } finally {
                    btn.innerText = originalText;
                }
            }, (err) => {
                alert('Acesso à localização negado pelo navegador.');
                btn.innerText = originalText;
            }, { enableHighAccuracy: true, timeout: 10000 });
        });
    }

    // Inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', triggerGeo);
    } else {
        triggerGeo();
    }
})();
</script>
"""

    # 3. Finalização
    # Garante que as tags de fechamento existam e sejam as únicas
    content = content.replace('</body>', '').replace('</html>', '').strip()
    final_content = content + "\n" + final_script + "\n</body>\n</html>"

    with open(path, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print("Correção unificada aplicada com sucesso.")

if __name__ == "__main__":
    unified_fix()
