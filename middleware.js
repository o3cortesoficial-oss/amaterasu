// No Vercel Middleware (standalone), ao retornar "undefined" ou nada, o request continua normalmente.
// Removemos a dependencia de @vercel/edge para evitar erros de build.

export const config = {
  matcher: [
    '/',
    '/Landpagedrone.html',
    '/Landpagedrone_limpo.html',
    '/Checkout - Fase :path*',
    '/Checkout%20-%20Fase%20:path*'
  ],
};

export default function middleware(req) {
  const url = req.nextUrl;
  const userAgent = req.headers.get('user-agent') || '';
  
  // Lista de padrões de User-Agents de bots e crawlers conhecidos
  const botPatterns = [
    'facebookexternalhit',
    'Facebot',
    'Googlebot',
    'AdsBot-Google',
    'Mediapartners-Google',
    'Vercelbot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'ia_archiver',
    'Pinterest',
    'LinkedInBot',
    'TelegramBot',
    'Twitterbot'
  ];

  const isBot = botPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );

  // Se for bot tentando acessar as páginas de oferta/checkout ou a raiz
  if (isBot) {
    console.log(`Bot detectado: ${userAgent} acessando ${url.pathname}`);
    
    // Se for a raiz, mostra a página de carpintaria (index.html)
    if (url.pathname === '/') {
        // Na Vercel, o request continua para index.html automaticamente
        return; 
    }
    
    // Se estiver tentando acessar diretamente as páginas internas, redireciona para a home (carpintaria)
    // ou retorna um 404 falso
    url.pathname = '/'; 
    return Response.redirect(url);
  }

  // Se for um usuário real acessando a raiz, mostramos a landing page do drone
  if (url.pathname === '/') {
    url.pathname = '/Landpagedrone.html';
    return Response.rewrite(url);
  }

  // Por padrão, continua o request
  return;
}
