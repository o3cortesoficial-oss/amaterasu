from bs4 import BeautifulSoup

def check_images(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    track = soup.find(id="custom-slider-track")
    if not track:
        print("Track não encontrado.")
        return
    
    img = track.find("img")
    if not img:
        print("Imagem não encontrada no track.")
        return
        
    print(f"Atributos da imagem: {img.attrs.keys()}")
    for attr in img.attrs:
        val = img.get(attr)
        print(f"Atributo '{attr}' (comprimento {len(str(val))}): {str(val)[:100]}...")

if __name__ == "__main__":
    check_images("Landpagedrone.html")
