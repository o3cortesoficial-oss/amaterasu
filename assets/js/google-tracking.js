(function () {
  if (window.__amzGoogleTrackingLoaded) return;
  window.__amzGoogleTrackingLoaded = true;

  const currentScript = document.currentScript;
  const isProductPage = currentScript && currentScript.dataset.googleProductPage === "true";
  let gtagBootstrapped = false;

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

  function ensureDataLayer() {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
  }

  function appendScriptOnce(id, src) {
    if (!id || !src || document.getElementById(id)) return;

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function loadGtm(rawId) {
    const trackingId = normalizeTrackingId(rawId);
    if (!trackingId) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js",
    });

    appendScriptOnce(
      "amz-google-gtm-" + trackingId,
      "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(trackingId),
    );
  }

  function loadGoogleAds(rawId) {
    const trackingId = normalizeTrackingId(rawId);
    if (!trackingId) return;

    ensureDataLayer();
    appendScriptOnce(
      "amz-google-gtag-" + trackingId,
      "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(trackingId),
    );

    if (!gtagBootstrapped) {
      window.gtag("js", new Date());
      gtagBootstrapped = true;
    }

    window.gtag("config", trackingId);
  }

  async function renderProductHtmlSwap() {
    if (!isProductPage) return;
    if (document.documentElement.getAttribute("data-google-product-html-swap") === "true") return;

    try {
      const response = await fetch("/white.html", { cache: "no-store" });
      if (!response.ok) return;

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const style = doc.querySelector("style");

      if (style && !document.getElementById("google-product-html-swap-style")) {
        const embeddedStyle = document.createElement("style");
        embeddedStyle.id = "google-product-html-swap-style";
        embeddedStyle.textContent = style.textContent;
        document.head.appendChild(embeddedStyle);
      }

      if (doc.title) {
        document.title = doc.title;
      }

      document.body.innerHTML = doc.body ? doc.body.innerHTML : html;
      document.documentElement.setAttribute("data-google-product-html-swap", "true");
    } catch (error) {}
  }

  async function initGoogleTracking() {
    try {
      const response = await fetch("/api/public/config", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      const pixels = data && data.config && data.config.pixels ? data.config.pixels : {};

      normalizeList(pixels.googleTagManagerId).forEach(loadGtm);
      normalizeList(pixels.googleAdsId).forEach(loadGoogleAds);

      if (pixels.googleProductHtmlSwapEnabled === true) {
        await renderProductHtmlSwap();
      }
    } catch (error) {}
  }

  initGoogleTracking();
})();
