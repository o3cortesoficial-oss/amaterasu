import os
import re

def final_fix():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 1. Limpeza agressiva de valores fixos (os que o usuário vê)
    old_values = ['76240000', 'Aragarças', 'Goiás', '149', 'Said Labs Global', 'Rua R. A. Costa']
    for val in old_values:
        content = content.replace(f'value="{val}"', 'value=""')
        content = content.replace(f"value='{val}'", 'value=""')

    # 2. Remoção de scripts de localização antigos
    # Remove qualquer script que use Nominatim
    content = re.sub(r'<script.*?>.*?nominatim\.openstreetmap\.org.*?<\/script>', '', content, flags=re.DOTALL | re.IGNORECASE)

    # 3. Preparação do NOVO script (Muito mais robusto)
    js_logic = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Tenta encontrar o botão por texto ou IDs comuns
    function findGeoButton() {
        const texts = ['localização atual', 'location', 'localização'];
        const allElements = document.querySelectorAll('.a-button, button, a, span');
        for (let el of allElements) {
            for (let t of texts) {
                if (el.textContent.toLowerCase().includes(t)) {
                    return el.closest('.a-button') || el;
                }
            }
        }
        return null;
    }

    const geoBtn = findGeoButton();
    if (!geoBtn) {
        console.error('Botão de geolocalização não encontrado.');
        return;
    }

    geoBtn.style.cursor = 'pointer';
    geoBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!navigator.geolocation) {
            alert('Geolocalização não suportada no seu navegador.');
            return;
        }

        const originalText = geoBtn.innerText;
        geoBtn.innerText = 'Buscando...';

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                        headers: { 'Accept-Language': 'pt-BR' }
                    });
                    const data = await response.json();
                    
                    if (data && data.address) {
                        const addr = data.address;
                        // Mapeamento amplo para lidar com variações de IDs da Amazon
                        const map = {
                            postalCode: ['address-ui-widgets-enterAddressPostalCode', 'zip', 'cep'],
                            street: ['address-ui-widgets-streetName', 'address-ui-widgets-enterAddressLine1', 'rua', 'address'],
                            number: ['address-ui-widgets-buildingNumber', 'numero', 'number'],
                            neighborhood: ['address-ui-widgets-neighborhood', 'bairro', 'district'],
                            city: ['address-ui-widgets-enterAddressCity', 'cidade', 'city'],
                            state: ['address-ui-widgets-enterAddressStateOrRegion', 'estado', 'state', 'uf']
                        };

                        const values = {
                            postalCode: addr.postcode || '',
                            street: addr.road || addr.pedestrian || '',
                            number: addr.house_number || '',
                            neighborhood: addr.suburb || addr.neighbourhood || '',
                            city: addr.city || addr.town || addr.village || '',
                            state: addr.state || ''
                        };

                        for (let key in map) {
                            const val = values[key];
                            for (let selector of map[key]) {
                                let el = document.getElementById(selector) || document.querySelector(`[name*="${selector}"]`);
                                if (el) {
                                    el.value = val;
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }
                        }
                        alert('Endereço atualizado com sucesso!');
                    } else {
                        alert('Não foi possível obter os detalhes do endereço.');
                    }
                } catch (err) {
                    alert('Erro ao consultar serviço de localização.');
                } finally {
                    geoBtn.innerText = originalText;
                }
            },
            (err) => {
                alert('Permissão de localização negada.');
                geoBtn.innerText = originalText;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
});
</script>
"""

    # 4. Injeção Final e Limpeza de Tags
    content = content.replace('</body>', '').replace('</html>', '').strip()
    final_content = content + js_logic + "\n</body>\n</html>"

    with open(path, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print("Correções aplicadas com sucesso. Valores limpos e script robusto injetado.")

if __name__ == "__main__":
    final_fix()
