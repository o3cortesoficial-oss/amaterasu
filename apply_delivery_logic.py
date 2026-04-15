import os
from bs4 import BeautifulSoup

def inject_delivery_logic(file_path):
    print(f"Injetando lgica de entrega dinmica em: {file_path}")
    if not os.path.exists(file_path):
        print(f"Erro: {file_path} no encontrado.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # Script da lgica de data (Hoje + 9 dias)
    # Procuramos o container de entrega original e atualizamos seu span interno
    script_content = """
    <script>
    (function() {
        function updateDeliveryDate() {
            const daysToAdd = 9;
            const date = new Date();
            date.setDate(date.getDate() + daysToAdd);
            
            const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
            const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            
            const formattedDate = weekdays[date.getDay()] + ", " + date.getDate() + " de " + months[date.getMonth()];
            
            // 1. Alvo especfico pelo ID comum da Amazon
            const directTarget = document.getElementById('mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_ID');
            if (directTarget) {
                const span = directTarget.querySelector('span.a-text-bold') || directTarget;
                span.innerText = formattedDate;
                console.log('Data de entrega atualizada via ID');
            }
            
            // 2. Procura genrica por containers que contenham "Entrega GRTIS"
            document.querySelectorAll('div, span').forEach(el => {
                if (el.children.length === 0 && (el.innerText.includes("Entrega GRÁTIS") || el.innerText.includes("Entrega mais rápida"))) {
                    const boldSpan = el.querySelector('span.a-text-bold') || el.nextElementSibling;
                    if (boldSpan) {
                         boldSpan.innerText = formattedDate;
                    }
                }
                
                // Fallback: se o elemento j for o span com a data antiga
                if (el.classList.contains('a-text-bold') && el.innerText.match(/\d+ de \w+/)) {
                    if (el.parentElement.innerText.includes("Entrega")) {
                        el.innerText = formattedDate;
                    }
                }
            });
        }
        
        window.addEventListener('load', updateDeliveryDate);
        updateDeliveryDate(); 
    })();
    </script>
    """
    
    # Injetar no final do body
    if soup.body:
        soup.body.append(BeautifulSoup(script_content, 'html.parser'))
    else:
        soup.append(BeautifulSoup(script_content, 'html.parser'))
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print("Lgica de entrega dinmica aplicada!")

if __name__ == "__main__":
    inject_delivery_logic("Landpagedrone.html")
