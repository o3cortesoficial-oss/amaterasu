from bs4 import BeautifulSoup
import os

def find_gallery_elements(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # 1. Procurar por imagens grandes (mais de 5000 chars de base64)
    imgs = [img for img in soup.find_all('img') if len(img.get('src', '')) > 5000]
    print(f"Total de imagens grandes: {len(imgs)}")
    
    for i, img in enumerate(imgs[:8]):
        parent = img.parent
        print(f"IMG {i}: ID={img.get('id')}, Parent={parent.name}, ParentClass={parent.get('class')}")
        
    # 2. Procurar pelos dots de paginação
    dots_container = None
    for tag in soup.find_all(['ul', 'div']):
        cl = tag.get('class', [])
        if cl and any('pagination' in str(c).lower() for c in cl):
            print(f"Possível container de dots: {tag.name}, ID={tag.get('id')}, Class={cl}")
            dots_container = tag
            
    if dots_container:
        dots = dots_container.find_all(True, recursive=False)
        print(f"Quantidade de dots encontrados: {len(dots)}")

if __name__ == "__main__":
    find_gallery_elements("Landpagedrone.html")
