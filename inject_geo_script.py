import os

def inject_script():
    file_path = 'Checkout - Fase 1.html'
    if not os.path.exists(file_path):
        print(f"Erro: {file_path} não encontrado.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    js_code = """
<script>
document.addEventListener('DOMContentLoaded', function() {
    // 1. Localizar o botão de geolocalização pelo texto
    const allSpans = document.querySelectorAll('span.a-button-text');
    let geoBtn = null;
    for (let span of allSpans) {
        if (span.textContent.includes('localização atual')) {
            geoBtn = span.closest('.a-button');
            break;
        }
    }

    if (!geoBtn) {
        console.error('Botão de localização não encontrado.');
        return;
    }

    // Estilo para indicar interatividade
    geoBtn.style.cursor = 'pointer';

    geoBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!navigator.geolocation) {
            alert('Geolocalização não é suportada pelo seu navegador.');
            return;
        }

        // Feedback visual
        const originalText = geoBtn.innerText;
        geoBtn.innerText = 'Buscando localização...';

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log(`Lat: ${latitude}, Lon: ${longitude}`);

                try {
                    // Reverse geocoding via Nominatim (OpenStreetMap)
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                        headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'DroneOfferCheckout/1.0' }
                    });
                    const data = await response.json();
                    
                    if (data && data.address) {
                        const addr = data.address;
                        console.log('Endereço encontrado:', addr);

                        // Mapeamento de campos Amazon
                        const fields = {
                            'address-ui-widgets-enterAddressPostalCode': addr.postcode || '',
                            'address-ui-widgets-enterAddressLine1': addr.road || addr.pedestrian || addr.suburb || '',
                            'address-ui-widgets-buildingNumber': addr.house_number || '',
                            'address-ui-widgets-neighborhood': addr.suburb || addr.neighbourhood || addr.city_district || '',
                            'address-ui-widgets-enterAddressCity': addr.city || addr.town || addr.village || '',
                            'address-ui-widgets-enterAddressStateOrRegion': addr.state || ''
                        };

                        // Preencher campos
                        for (let [id, value] of Object.entries(fields)) {
                            const input = document.getElementById(id);
                            if (input) {
                                input.value = value;
                                // Disparar eventos
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                        
                        alert('Endereço preenchido com sucesso!');
                    } else {
                        alert('Não foi possível obter os detalhes do endereço.');
                    }
                } catch (error) {
                    console.error('Erro no checkout geo:', error);
                    alert('Erro ao consultar serviço de localização.');
                } finally {
                    geoBtn.innerText = originalText;
                }
            },
            (error) => {
                let msg = 'Erro ao obter localização.';
                if (error.code === 1) msg = 'Permissão de localização negada.';
                console.error('Geo error:', error);
                alert(msg);
                geoBtn.innerText = originalText;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
});
</script>
"""
    
    # Injetar antes do último </body>
    if '</body>' in content:
        parts = content.rsplit('</body>', 1)
        new_content = parts[0] + js_code + '</body>' + parts[1]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Script injetado com sucesso no último </body>.")
    else:
        # Se não houver </body>, apenas anexa
        with open(file_path, 'a', encoding='utf-8') as f:
            f.write(js_code + "\n</body>\n</html>")
        print("Aviso: tag </body> não encontrada. Script anexado ao final.")

if __name__ == "__main__":
    inject_script()
