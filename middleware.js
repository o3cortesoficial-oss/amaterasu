// No Vercel Middleware (standalone), ao retornar "undefined" ou nada, o request continua normalmente.
// Removemos a dependencia de @vercel/edge para evitar erros de build.

// Configuração do Middleware para Vercel
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
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

  // 1. CLOAKING E ROTEAMENTO NA RAIZ (/)
  if (pathname === '/') {
    if (isBot) {
      console.log(`[PROTEÇÃO] BOT na raiz - Servindo White Page via Rewrite`);
      const whiteUrl = new URL('/white.html', req.url);
      return new Response(null, {
        headers: {
          'x-middleware-rewrite': whiteUrl.toString()
        }
      });
    } else {
      console.log(`[ACL] HUMANO na raiz - Servindo Oferta via Rewrite`);
      const landingUrl = new URL('/Landpagedrone.html', req.url);
      return new Response(null, {
        headers: {
          'x-middleware-rewrite': landingUrl.toString()
        }
      });
    }
  }

  // 2. PROTEÇÃO CONTRA ACESSO DIRETO DE BOTS ÀS PÁGINAS SENSÍVEIS
  if (isBot) {
    if (pathname === '/Landpagedrone.html' || 
        pathname.includes('Checkout') || 
        pathname === '/admin' ||
        pathname === '/admin.html') {
      console.log(`[PROTEÇÃO] Redirecionando BOT (${userAgent}) - Tentativa de acesso a ${pathname}`);
      return Response.redirect(new URL('/', req.url));
    }
  }

  // 3. PROTEÇÃO DO PAINEL ADMIN (Para humanos)
  if (pathname === '/admin' || pathname === '/admin.html') {
    const hasSession = req.headers.get('cookie')?.includes('amz_admin_session');
    if (!hasSession) {
      console.log(`[AUTH] Usuario não autenticado tentando acessar admin. Redirecionando para login.`);
      return Response.redirect(new URL('/login', req.url));
    }
  }

  // 4. PARA OUTRAS ROTAS:
  // Retornamos nada (undefined), deixando a Vercel seguir as regras do vercel.json
  return;
}
