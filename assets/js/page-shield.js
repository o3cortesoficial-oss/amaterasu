(function () {
  'use strict';

  /* ── Configuração ── */
  var ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '.vercel.app',
    '.vercel.sh',
    '.casaedecoracao.online'
  ];

  /* ── HTML da página de cobertura (Carpintaria de Luxo) ── */
  var COVER_HTML = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Carpintaria de Luxo - Arte em Madeira</title><style>:root{--primary:#5d4037;--accent:#d7ccc8;--text:#212121;--white:#fff}*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:var(--text);background:var(--white)}header{background:linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.6)),url("https://images.unsplash.com/photo-1581421315152-cb384898fc6c?auto=format&fit=crop&q=80&w=1200") center/cover no-repeat;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:var(--white);padding:0 20px}h1{font-size:3.5rem;margin-bottom:1rem;letter-spacing:2px}p.subtitle{font-size:1.25rem;max-width:700px;margin-bottom:2rem}.btn{display:inline-block;background:var(--primary);color:var(--white);padding:12px 30px;text-decoration:none;border-radius:4px;transition:.3s;font-weight:700}.btn:hover{background:#4e342e;transform:translateY(-3px)}section{padding:80px 20px;max-width:1000px;margin:0 auto;text-align:center}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px;margin-top:50px}.card{padding:30px;border:1px solid var(--accent);border-radius:8px;transition:.3s}.card:hover{box-shadow:0 10px 20px rgba(0,0,0,.1)}.card h3{margin-bottom:15px;color:var(--primary)}footer{background:var(--primary);color:var(--white);padding:50px 20px;text-align:center}.contact-info{margin-top:30px;font-size:.9rem;opacity:.8}</style></head><body><header><h1>Carpintaria de Luxo</h1><p class="subtitle">Transformando madeira em obras de arte para o seu ambiente. Design exclusivo, durabilidade e sofistica\\u00e7\\u00e3o.</p><a href="#projetos" class="btn">Conhecer Projetos</a></header><section id="sobre"><h2>Nossa Ess\\u00eancia</h2><div style="width:50px;height:4px;background:var(--primary);margin:20px auto"></div><p style="margin-top:1.5rem">Com mais de 25 anos de experi\\u00eancia no mercado, nossa oficina une t\\u00e9cnicas ancestrais de marcenaria com o que h\\u00e1 de mais moderno em design de interiores.</p><p style="margin-top:1rem">Cada pe\\u00e7a que sai de nossa serraria \\u00e9 \\u00fanica, carregando consigo a textura, a alma da madeira e o compromisso com a satisfa\\u00e7\\u00e3o do cliente.</p></section><section id="projetos" style="background:#fdfdfd"><h2>Nossos Servi\\u00e7os</h2><div class="grid"><div class="card"><h3>Mobili\\u00e1rio Fino</h3><p>Mesas, aparadores e pe\\u00e7as de destaque feitas com madeiras nobres selecionadas.</p></div><div class="card"><h3>Projetos Sob Medida</h3><p>Solu\\u00e7\\u00f5es completas para cozinhas, quartos e escrit\\u00f3rios com acabamento impec\\u00e1vel.</p></div><div class="card"><h3>Restaura\\u00e7\\u00e3o</h3><p>Devolvemos a vida a m\\u00f3veis antigos com t\\u00e9cnicas que respeitam a hist\\u00f3ria da pe\\u00e7a.</p></div></div></section><footer id="contato"><h2>Vamos construir algo incr\\u00edvel juntos?</h2><p style="margin:1.5rem 0">Entre em contato para um projeto personalizado.</p><a href="mailto:contato@carpintariadeluxo.com" class="btn" style="background:transparent;border:2px solid white">Falar com Especialista</a><div class="contact-info"><p>&copy; 2024 Carpintaria de Luxo - Todos os direitos reservados.</p><p>Rua das Palmeiras, 142 &bull; Distrito Industrial &bull; S\\u00e3o Paulo, SP</p></div></footer></body></html>';

  /* ── Anti-clonagem: verifica domínio ── */
  function isDomainAllowed() {
    var host = window.location.hostname || '';
    for (var i = 0; i < ALLOWED_HOSTS.length; i++) {
      var allowed = ALLOWED_HOSTS[i];
      if (allowed.charAt(0) === '.') {
        if (host.endsWith(allowed) || host === allowed.slice(1)) return true;
      } else {
        if (host === allowed) return true;
      }
    }
    return false;
  }

  /* ── Troca a página pelo HTML de cobertura ── */
  function activateShield() {
    try {
      document.open();
      document.write(COVER_HTML);
      document.close();
    } catch (e) {
      document.documentElement.innerHTML = COVER_HTML;
    }
    /* Reporta tentativa ao backend */
    try {
      var img = new Image();
      img.src = '/api/clone-alert.gif?domain=' + encodeURIComponent(window.location.hostname) +
        '&href=' + encodeURIComponent(window.location.href) +
        '&reason=devtools_or_clone&t=' + Date.now();
    } catch (e) { /* silencioso */ }
  }

  /* ── 1. Bloqueio de botão direito ── */
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    return false;
  }, true);

  /* ── 2. Bloqueio de teclas de atalho (F12, Ctrl+Shift+I/J/C, Ctrl+U) ── */
  document.addEventListener('keydown', function (e) {
    /* F12 */
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      activateShield();
      return false;
    }
    /* Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C */
    if ((e.ctrlKey && e.shiftKey) && (
      e.key === 'I' || e.key === 'i' ||
      e.key === 'J' || e.key === 'j' ||
      e.key === 'C' || e.key === 'c' ||
      e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67
    )) {
      e.preventDefault();
      activateShield();
      return false;
    }
    /* Ctrl+U (view source) */
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85) && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      activateShield();
      return false;
    }
  }, true);

  /* ── 3. Anti-clonagem: se domínio não autorizado, ativa escudo ── */
  if (!isDomainAllowed()) {
    activateShield();
  }

  /* ── 6. Desabilita arrastar imagens e seleção de texto (dificulta cópia) ── */
  document.addEventListener('dragstart', function (e) { e.preventDefault(); }, true);
  document.addEventListener('selectstart', function (e) {
    /* Permite seleção dentro de inputs e textareas para não quebrar o checkout */
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    e.preventDefault();
    return false;
  }, true);

})();
