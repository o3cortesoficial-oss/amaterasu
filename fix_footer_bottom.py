import os

def fix_footers():
    files = ['Checkout - Fase 1.html', 'Checkout - Fase 2.html', 'Checkout - Fase 3.html', 'Checkout - Fase 4.html']
    
    css_fix = """
<style id="footer-sticky-fix">
html {
    height: 100% !important;
    background-color: #f2f4f8 !important; /* fallback */
}
body {
    min-height: 100vh !important;
    display: flex !important;
    flex-direction: column !important;
    margin: 0 !important;
}
#a-page {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 !important;
    min-height: 100vh !important;
}
footer, .nav-ftr-batmobile, #nav-ftr {
    margin-top: auto !important;
}
</style>
"""

    for path in files:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            if 'id="footer-sticky-fix"' not in content:
                if '</head>' in content:
                    content = content.replace('</head>', css_fix + '\n</head>', 1)
                else:
                    content = css_fix + content
                    
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fix aplicado em {path}")

if __name__ == "__main__":
    fix_footers()
