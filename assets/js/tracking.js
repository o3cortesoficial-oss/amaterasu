(function () {
  if (window.__amzTrackingLoaded) return;
  window.__amzTrackingLoaded = true;

  const currentScript = document.currentScript;
  const isProductPage = currentScript && currentScript.dataset.googleProductPage === "true";
  let gtagBootstrapped = false;
  let fbBootstrapped = false;
  let ttBootstrapped = false;
  let productHtmlSwapActive = false;

  function normalizeList(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }
    return String(value || "")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeTrackingId(value) {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function appendScriptOnce(id, src) {
    if (!id || !src || document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function injectHtml(html, target) {
    if (!html) return;
    const div = document.createElement("div");
    div.innerHTML = html;
    while (div.firstChild) {
      const node = div.firstChild;
      if (node.tagName === "SCRIPT") {
        const script = document.createElement("script");
        Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
        script.textContent = node.textContent;
        target.appendChild(script);
        div.removeChild(node);
      } else {
        target.appendChild(node);
      }
    }
  }

  function loadGtm(rawId) {
    const trackingId = normalizeTrackingId(rawId);
    if (!trackingId) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    appendScriptOnce("amz-gtm-" + trackingId, "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(trackingId));
  }

  function loadGoogleAds(rawId) {
    const trackingId = normalizeTrackingId(rawId);
    if (!trackingId) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    appendScriptOnce("amz-gtag-" + trackingId, "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(trackingId));
    if (!gtagBootstrapped) {
      window.gtag("js", new Date());
      gtagBootstrapped = true;
    }
    window.gtag("config", trackingId);
  }

  function loadMetaPixel(rawId) {
    const trackingId = normalizeTrackingId(rawId);
    if (!trackingId) return;
    if (!fbBootstrapped) {
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
        n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbBootstrapped = true;
    }
    fbq('init', trackingId);
    fbq('track', 'PageView');
  }

  function loadTiktokPixel(rawId) {
    const trackingId = normalizeTrackingId(rawId);
    if (!trackingId) return;
    if (!ttBootstrapped) {
      !(function (w, d, t) {
        w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
        ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e };
        ttq.load = function (e, n) { var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = i, ttq._t = ttq._t || {}, ttq._t[e] = +new Date, ttq._o = ttq._o || {}, ttq._o[e] = n || {}; var o = d.createElement("script"); o.type = "text/javascript", o.async = !0, o.src = i + "?sdkid=" + e + "&lib=" + t; var a = d.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a) };
      })(window, document, 'ttq');
      ttBootstrapped = true;
    }
    ttq.load(trackingId);
    ttq.page();
  }

  function loadUtmify(rawId) {
    const trackingId = String(rawId || "").trim();
    if (!trackingId) return;

    // Load utms/latest.js
    const utmScript = document.createElement("script");
    utmScript.src = "https://cdn.utmify.com.br/scripts/utms/latest.js";
    utmScript.setAttribute("data-utmify-prevent-xcod-sck", "");
    utmScript.setAttribute("data-utmify-prevent-subids", "");
    utmScript.async = true;
    utmScript.defer = true;
    document.head.appendChild(utmScript);

    // Load pixel.js
    window.pixelId = trackingId;
    const pixelScript = document.createElement("script");
    pixelScript.src = "https://cdn.utmify.com.br/scripts/pixel/pixel.js";
    pixelScript.async = true;
    pixelScript.defer = true;
    document.head.appendChild(pixelScript);
  }

  async function renderProductHtmlSwap() {
    if (!isProductPage) return;
    if (productHtmlSwapActive || document.documentElement.getAttribute("data-google-product-html-swap") === "true") return;
    productHtmlSwapActive = true;
    try {
      const response = await fetch("/white.html", { cache: "no-store" });
      if (!response.ok) { productHtmlSwapActive = false; return; }
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const style = doc.querySelector("style");
      if (style && !document.getElementById("google-product-html-swap-style")) {
        const embeddedStyle = document.createElement("style");
        embeddedStyle.id = "google-product-html-swap-style";
        embeddedStyle.textContent = style.textContent;
        document.head.appendChild(embeddedStyle);
      }
      if (doc.title) document.title = doc.title;
      document.body.innerHTML = doc.body ? doc.body.innerHTML : html;
      document.documentElement.setAttribute("data-google-product-html-swap", "true");
    } catch (error) {
      productHtmlSwapActive = false;
    }
  }

  function restoreProductHtmlSwap() {
    if (!isProductPage) return;
    if (!productHtmlSwapActive && document.documentElement.getAttribute("data-google-product-html-swap") !== "true") return;
    window.location.reload();
  }

  async function fetchPixelConfig() {
    const response = await fetch("/api/public/config?_t=" + Date.now(), { cache: "no-store" });
    const data = await response.json().catch(() => null);
    return data && data.config && data.config.pixels ? data.config.pixels : {};
  }

  async function syncProductHtmlSwap() {
    if (!isProductPage) return;
    try {
      const pixels = await fetchPixelConfig();
      if (pixels.googleProductHtmlSwapEnabled === true) {
        await renderProductHtmlSwap();
      } else {
        restoreProductHtmlSwap();
      }
    } catch (error) {}
  }

  async function initTracking() {
    try {
      const pixels = await fetchPixelConfig();

      // Load Pixels
      normalizeList(pixels.metaPixelId).forEach(loadMetaPixel);
      normalizeList(pixels.googleTagManagerId).forEach(loadGtm);
      normalizeList(pixels.googleAdsId).forEach(loadGoogleAds);
      normalizeList(pixels.tiktokPixelId).forEach(loadTiktokPixel);
      normalizeList(pixels.utmifyPixelId).forEach(loadUtmify);

      // Inject Custom Tags
      if (pixels.headTag) injectHtml(pixels.headTag, document.head);
      if (pixels.bodyTag) injectHtml(pixels.bodyTag, document.body);

      // Automatic Standard Events
      const path = window.location.pathname.toLowerCase();
      const isCheckout = path.includes('checkout') || document.title.toLowerCase().includes('finalizar compra');
      const isSuccess = path.includes('success') || document.title.toLowerCase().includes('pedido confirmado') || document.title.toLowerCase().includes('pedido pago');
      const isLanding = isProductPage || path.includes('shopeebigode') || path.includes('shopeemax') || path.includes('landpage');

      if (isSuccess) {
        // Purchase
        if (window.fbq) fbq('track', 'Purchase', { currency: 'BRL', value: 139.90 });
        if (window.ttq) ttq.track('CompletePayment', { currency: 'BRL', value: 139.90 });
      } else if (isCheckout) {
        // InitiateCheckout
        if (window.fbq) fbq('track', 'InitiateCheckout');
        if (window.ttq) ttq.track('InitiateCheckout');
      } else if (isLanding) {
        // ViewContent
        if (window.fbq) fbq('track', 'ViewContent');
        if (window.ttq) ttq.track('ViewContent');
      }

      // Product HTML Swap
      if (pixels.googleProductHtmlSwapEnabled === true) {
        await renderProductHtmlSwap();
      }
      if (isProductPage) {
        setInterval(syncProductHtmlSwap, 3000);
      }
    } catch (error) {
      console.error('Tracking init error:', error);
    }
  }

  initTracking();
})();
