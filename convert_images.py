import base64
import os

folder = 'C:/Users/samue/.gemini/antigravity/brain/tempmediaStorage/'
if not os.path.exists(folder):
    # Fallback para diretório relativo se necessário
    folder = './tempmediaStorage/'

try:
    files = sorted([f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.png', '.jpeg'))])
    
    for i, f in enumerate(files):
        path = os.path.join(folder, f)
        with open(path, 'rb') as img_file:
            b64_data = base64.b64encode(img_file.read()).decode('utf-8')
            ext = f.split('.')[-1]
            print(f"--- IMAGE_{i} ---")
            print(f"data:image/{ext};base64,{b64_data}")
            print(f"--- END_{i} ---")
except Exception as e:
    print(f"Erro ao processar imagens: {e}")
