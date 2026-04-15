import os
import re

def fix_checkout():
    path = 'Checkout - Fase 1.html'
    if not os.path.exists(path):
        print("Arquivo não encontrado.")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remover qualquer script de geolocalização injetado anteriormente (baseado em palavras-chave)
    # Procuramos o bloco que contém nominatim.openstreetmap.org
    pattern = re.compile(r'<script.*?>.*?nominatim\.openstreetmap\.org.*?<\/script>', re.DOTALL | re.IGNORECASE)
    cleaned_content = pattern.sub('', content)

    # 2. Garantir que o conteúdo termina corretamente (remover excessos ou fechar tags)
    # Se não houver </body>, vamos adicionar. 
    # Primeiro, removemos tags duplicadas se houver
    cleaned_content = cleaned_content.replace('</body>', '').replace('</html>', '')
    cleaned_content = cleaned_content.strip()

    js_code = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    const allSpans = document.querySelectorAll('span.a-button-text');
    let geoBtn = null;
    for (let span of allSpans) {
        if (span.textContent.includes('localização atual')) {
            geoBtn = span.closest('.a-button');
            break;
        }
    }

    if (geoBtn) {
        geoBtn.style.cursor = 'pointer';
        geoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (!navigator.geolocation) {
                alert('Geolocalização não suportada no seu navegador.');
                return;
            }

            const originalText = geoBtn.innerText;
            geoBtn.innerText = 'Buscando endereço...';

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                            headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'DroneOffer/1.0' }
                        });
                        const data = await response.json();
                        
                        if (data && data.address) {
                            const addr = data.address;
                            const fields = {
                                'address-ui-widgets-enterAddressPostalCode': addr.postcode || '',
                                'address-ui-widgets-enterAddressLine1': addr.road || addr.pedestrian || addr.suburb || '',
                                'address-ui-widgets-buildingNumber': addr.house_number || '',
                                'address-ui-widgets-neighborhood': addr.suburb || addr.neighbourhood || '',
                                'address-ui-widgets-enterAddressCity': addr.city || addr.town || addr.village || '',
                                'address-ui-widgets-enterAddressStateOrRegion': addr.state || ''
                            };

                            for (let [id, value] of Object.entries(fields)) {
                                const input = document.getElementById(id);
                                if (input) {
                                    input.value = value;
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }
                            alert('Endereço preenchido com sucesso!');
                        } else {
                            alert('Não foi possível converter as coordenadas em endereço.');
                        }
                    } catch (error) {
                        alert('Erro ao consultar serviço de mapas.');
                    } finally {
                        geoBtn.innerText = originalText;
                    }
                },
                (error) => {
                    alert('Permissão de localização necessária para preencher automaticamente.');
                    geoBtn.innerText = originalText;
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        });
    }
});
</script>
"""
    
    final_content = cleaned_content + js_code + "\n</body>\n</html>"
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print("Checkout - Fase 1.html fixado com sucesso.")

if __name__ == "__main__":
    fix_checkout()
