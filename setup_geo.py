import os
from bs4 import BeautifulSoup

def setup_geolocation(file_path):
    print(f"Iniciando configuração de geolocalização em: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # 1. Localizar os elementos de entrega
    # Top Bar (Amazon style)
    top_bar = soup.find(id="glow-ingress-single-line")
    # Bottom Bar / Mobile (Amazon style)
    bottom_bar = soup.find(id="contextualIngressPtLabel_deliveryShortLine")
    
    if top_bar:
        print("Preparando barra de topo...")
        # Limpar o texto estático e o link
        top_bar.string = "[detectando localização...]"
        # Adicionar uma classe de alvo
        top_bar['class'] = top_bar.get('class', []) + ['geo-target-city']

    if bottom_bar:
        print("Preparando barra inferior...")
        bottom_bar.string = "[detectando localização...]"
        bottom_bar['class'] = bottom_bar.get('class', []) + ['geo-target-city']

    # 2. Injetar o Script de Geolocalização
    geo_script = """
    <script>
    (function() {
        console.log('Iniciando detecção de geolocalização por IP...');
        
        async function updateLocation() {
            try {
                // Usando ip-api.com (serviço gratuito de geolocalização por IP)
                const response = await fetch('https://ip-api.com/json/?fields=status,city,regionName');
                const data = await response.json();
                
                if (data.status === 'success') {
                    const city = data.city;
                    const region = data.regionName;
                    const message = `A entrega será feita em ${city} - ${region}`;
                    
                    console.log('Localização detectada:', message);
                    
                    // Atualiza todos os elementos marcados
                    const targets = document.querySelectorAll('.geo-target-city');
                    targets.forEach(el => {
                        el.textContent = message;
                    });
                } else {
                    throw new Error('Falha na API de IP');
                }
            } catch (error) {
                console.error('Erro ao detectar localização:', error);
                const targets = document.querySelectorAll('.geo-target-city');
                targets.forEach(el => {
                    el.textContent = 'A entrega será feita em sua cidade';
                });
            }
        }

        // Executa assim que o DOM estiver pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateLocation);
        } else {
            updateLocation();
        }
    })();
    </script>
    """
    
    # Injetar o script no final do <head> ou <body>
    if soup.body:
        soup.body.append(BeautifulSoup(geo_script, "html.parser"))
        print("Script de geolocalização injetado com sucesso.")

    # 3. Remover o link "atualizar local" para evitar confusão
    # Procurar por spans ou links que contenham "atualizar local"
    for target in soup.find_all(lambda tag: tag.string and 'atualizar local' in tag.string.lower()):
        print(f"Removendo botão de atualização: {target.string}")
        target.decompose()

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
    print("Processo concluído.")

if __name__ == "__main__":
    setup_geolocation("Landpagedrone.html")
