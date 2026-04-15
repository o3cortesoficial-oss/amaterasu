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
  const url = new URL(req.url);
  const userAgent = req.headers.get('user-agent') || '';
  const pathname = url.pathname;

  // Lista de padrões de User-Agents de bots, crawlers e verificadores conhecidos
  const botPatterns = [
    'facebookexternalhit', 'Facebot', 'Googlebot', 'AdsBot-Google', 'Mediapartners-Google',
    'Vercelbot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot', 'ia_archiver',
    'Pinterest', 'LinkedInBot', 'TelegramBot', 'Twitterbot', 'HeadlessChrome', 'Lighthouse',
    'Discordbot', 'Slackbot', 'Applebot', 'AdsBot', 'CriteoBot', 'Sogou', 'Exabot', 'facebookcatalog',
    'fban/messenger', 'fbav', 'fb_iab', 'fbiv', 'fbss', 'facebookplatform', 'whatsapp', 'skype',
    'uptimerobot', 'pingdom', 'screaming frog', 'ahrefsbot', 'semrushbot', 'dotbot', 'mj12bot',
    'petalsearch', 'serpstatbot', 'siteauditbot'
  ];

  const isBotUA = botPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );

  // Detecção adicional: Headless, empty User-Agent, ou padrões de datacenter
  const isSuspicious = !userAgent || userAgent.length < 20 || 
                       userAgent.includes('Cloudflare-Traffic-Manager') ||
                       userAgent.includes('GSA/') ||
                       userAgent.includes('headless');

  const isBot = isBotUA || isSuspicious;

  // 1. SEGURANÇA MÁXIMA: Se for bot, NUNCA deixa acessar páginas internas
  if (isBot) {
    if (pathname === '/Landpagedrone.html' || pathname.startsWith('/Checkout') || pathname === '/admin.html') {
      console.log(`[PROTEÇÃO] Redirecionando BOT (${userAgent}) - Tentativa de acesso a ${pathname}`);
      return Response.redirect(new URL('/', req.url));
    }
  }

  // 2. CLOAKING NA RAIZ:
  if (pathname === '/') {
    if (isBot) {
      // Bot na raiz vê a Carpintaria (index.html)
      // Não fazemos rewrite aqui, apenas deixamos a Vercel servir index.html
      return;
    } else {
      // Usuário real na raiz vê o Drone (Landpagedrone.html) via Rewrite (URL não muda)
      console.log(`[ACL] Encaminhando usuario real para a oferta`);
      const landingUrl = new URL('/Landpagedrone.html', req.url);
      return new Response(null, {
        headers: {
          'x-middleware-rewrite': landingUrl.toString()
        }
      });
    }
  }

  // 3. PROTEÇÃO DE PÁGINAS INTERNAS (se um bot tentar acessar o link direto)
  if (isBot && (pathname.includes('.html') && pathname !== '/index.html')) {
     return Response.redirect(new URL('/', req.url));
  }

  return;
}
