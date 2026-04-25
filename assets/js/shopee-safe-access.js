(function () {
  "use strict";

  const currentScript = document.currentScript;
  const pageId = currentScript?.dataset?.pageId || "shopee";
  const safePagePath = currentScript?.dataset?.safePage || "/safe-page-shopee.html";
  const stageId = currentScript?.dataset?.stageId || "";
  const trackingKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_id",
    "fbclid",
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "ad_id",
    "ad_name",
    "creative_id",
    "creative_name",
  ];

  let sessionId = sessionStorage.getItem("amz_session_id");
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("amz_session_id", sessionId);
  }

  const originalPageTitle = document.title;
  let accessBlockedViewActive = false;

  function getTracker() {
    return window.__amzMetaAttribution || null;
  }

  function initAttribution() {
    const tracker = getTracker();
    if (tracker && typeof tracker.init === "function") {
      try {
        tracker.init({ pageId });
      } catch (error) {}
    }
  }

  function getAttributionSnapshot() {
    const tracker = getTracker();
    if (tracker && typeof tracker.getSnapshot === "function") {
      try {
        return tracker.getSnapshot() || null;
      } catch (error) {}
    }
    return null;
  }

  function getAttributionId() {
    const snapshot = getAttributionSnapshot();
    return (snapshot && snapshot.attributionId) || sessionStorage.getItem("amz_attribution_id") || "";
  }

  function getPresenceId() {
    const tracker = getTracker();
    if (tracker && typeof tracker.getPresenceId === "function") {
      try {
        return tracker.getPresenceId(pageId);
      } catch (error) {}
    }

    const storageKey = "amz_page_presence_" + pageId;
    let presenceId = sessionStorage.getItem(storageKey);
    if (!presenceId) {
      presenceId = "presence-" + pageId + "-" + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(storageKey, presenceId);
    }
    return presenceId;
  }

  function getDeviceInfo() {
    const userAgent = navigator.userAgent || "";
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const isMobile =
      /android|iphone|ipad|ipod|mobile|windows phone/i.test(userAgent) ||
      viewportWidth <= 768;

    return {
      type: isMobile ? "mobile" : "desktop",
      label: isMobile ? "Mobile" : "Desktop",
      userAgent,
      viewportWidth,
    };
  }

  function getTrafficTouch() {
    const snapshot = getAttributionSnapshot();
    const storedTouch = snapshot && (snapshot.lastTouch || snapshot.firstTouch);
    const params = new URLSearchParams(window.location.search);
    const trackingParams = {};

    trackingKeys.forEach((key) => {
      const value = params.get(key);
      if (value) trackingParams[key] = value;
    });

    if (storedTouch) {
      return {
        ...storedTouch,
        pageId: stageId || pageId,
        pageUrl: window.location.href,
        device: getDeviceInfo(),
      };
    }

    return {
      capturedAt: new Date().toISOString(),
      pageId: stageId || pageId,
      pageUrl: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || "",
      trackingParams,
      meta: {},
      device: getDeviceInfo(),
      isMeta: Boolean(
        trackingParams.fbclid ||
          /meta|facebook|instagram/i.test(trackingParams.utm_source || ""),
      ),
    };
  }

  function revealPage() {
    const preloader = document.getElementById("access-control-preloader");
    if (preloader) preloader.remove();
    if (document.body) {
      document.body.style.display = "block";
    }
  }

  function injectSafePageStyles(doc) {
    const styles = doc.querySelectorAll("style");
    styles.forEach((style, index) => {
      const styleId = "shopee-safe-style-" + index;
      if (document.getElementById(styleId)) return;

      const embeddedStyle = document.createElement("style");
      embeddedStyle.id = styleId;
      embeddedStyle.setAttribute("data-shopee-safe-style", "true");
      embeddedStyle.textContent = style.textContent;
      document.head.appendChild(embeddedStyle);
    });
  }

  async function renderBlockedPage() {
    if (accessBlockedViewActive) return;
    if (!document.body) {
      setTimeout(renderBlockedPage, 50);
      return;
    }
    accessBlockedViewActive = true;

    try {
      const response = await fetch(safePagePath, { cache: "no-store" });
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      injectSafePageStyles(doc);

      if (doc.title) {
        document.title = doc.title;
      }

      document.body.innerHTML = doc.body ? doc.body.innerHTML : html;
      document.documentElement.setAttribute("data-live-access-blocked", "true");
      revealPage();
    } catch (error) {
      revealPage();
      document.body.innerHTML =
        '<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;font-family:Arial,sans-serif;padding:24px;background:#fff;"><div><h1 style="color:#ee4d2d;margin-bottom:12px;">Shopee Brasil</h1><p style="color:#222;">Acesso protegido no momento.</p></div></main>';
    }
  }

  function restoreRealPage() {
    if (!accessBlockedViewActive) return;
    document.title = originalPageTitle;
    window.location.reload();
  }

  function handleAccessControl(data) {
    const control = data && data.accessControl;

    if (!control) {
      if (!accessBlockedViewActive) revealPage();
      return;
    }

    if (control.blocked) {
      renderBlockedPage();
      return;
    }

    if (accessBlockedViewActive) {
      restoreRealPage();
      return;
    }

    revealPage();
  }

  async function checkAccessControl() {
    try {
      const device = getDeviceInfo();
      const query = new URLSearchParams({
        sessionId,
        attributionId: getAttributionId(),
        deviceType: device.type,
        viewportWidth: String(device.viewportWidth || ""),
      });
      const response = await fetch(
        "/api/analytics/live-access/block-status?" + query.toString(),
        { cache: "no-store" },
      );
      const data = await response.json().catch(() => null);
      handleAccessControl(data);
    } catch (error) {
      if (!accessBlockedViewActive) revealPage();
    }
  }

  async function ping() {
    try {
      const device = getDeviceInfo();
      const response = await fetch("/api/analytics/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          stageId: stageId || undefined,
          sessionId,
          presenceId: getPresenceId(),
          attributionId: getAttributionId(),
          currentPage: window.location.href,
          trafficTouch: getTrafficTouch(),
          device,
        }),
      });
      const data = await response.json().catch(() => null);
      handleAccessControl(data);
    } catch (error) {
      if (!accessBlockedViewActive) revealPage();
    }
  }

  initAttribution();
  ping();
  setInterval(checkAccessControl, 3000);
  setInterval(ping, 30000);
})();
