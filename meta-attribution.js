(function () {
  const STORAGE_KEYS = {
    sessionId: "amz_session_id",
    attributionSnapshot: "amz_meta_attribution_snapshot",
  };

  const TRACKING_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_id",
    "fbclid",
    "campaign_id",
    "campaign_name",
    "campaign",
    "adset_id",
    "adset_name",
    "adset",
    "ad_id",
    "ad_name",
    "ad",
    "creative_id",
    "creative_name",
    "creative",
  ];

  const META_KEY_MAP = {
    campaignId: ["campaign_id", "utm_id"],
    campaignName: ["campaign_name", "campaign", "utm_campaign"],
    adsetId: ["adset_id"],
    adsetName: ["adset_name", "adset"],
    adId: ["ad_id"],
    adName: ["ad_name", "ad", "utm_content"],
    creativeId: ["creative_id"],
    creativeName: ["creative_name", "creative", "utm_content"],
  };

  function readStorage(storage, key) {
    // We now prioritize sessionStorage per user request to move away from localStorage
    const targetStorage = window.sessionStorage;
    try {
      return targetStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(storage, key, value) {
    const targetStorage = window.sessionStorage;
    try {
      targetStorage.setItem(key, value);
    } catch (error) {}
  }

  function safeJsonParse(value) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return (
      "meta-" +
      Math.random().toString(36).slice(2) +
      "-" +
      Date.now().toString(36)
    );
  }

  function ensureSessionId() {
    let sessionId = readStorage(window.sessionStorage, STORAGE_KEYS.sessionId);

    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      writeStorage(window.sessionStorage, STORAGE_KEYS.sessionId, sessionId);
    }

    return sessionId;
  }

  function getQueryParams() {
    const url = new URL(window.location.href);
    const all = {};

    url.searchParams.forEach(function (value, key) {
      if (value) {
        all[key] = value;
      }
    });

    return all;
  }

  function pickTrackingParams(allParams) {
    return TRACKING_KEYS.reduce(function (accumulator, key) {
      if (allParams[key]) {
        accumulator[key] = allParams[key];
      }
      return accumulator;
    }, {});
  }

  function readMetaField(params, keys) {
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (params[key]) {
        return params[key];
      }
    }

    return "";
  }

  function buildMetaParams(trackingParams) {
    return Object.keys(META_KEY_MAP).reduce(function (accumulator, field) {
      accumulator[field] = readMetaField(trackingParams, META_KEY_MAP[field]);
      return accumulator;
    }, {});
  }

  function isMetaTraffic(trackingParams) {
    const source = String(trackingParams.utm_source || "").toLowerCase();
    const medium = String(trackingParams.utm_medium || "").toLowerCase();

    return Boolean(
      trackingParams.fbclid ||
        source.includes("meta") ||
        source.includes("facebook") ||
        source.includes("instagram") ||
        medium.includes("paid_social") ||
        medium.includes("meta") ||
        trackingParams.campaign_name ||
        trackingParams.adset_name ||
        trackingParams.ad_name,
    );
  }

  function buildTouch(pageId) {
    const allParams = getQueryParams();
    const trackingParams = pickTrackingParams(allParams);
    const meta = buildMetaParams(trackingParams);
    const now = new Date().toISOString();

    return {
      capturedAt: now,
      pageId: pageId,
      pageUrl: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || "",
      trackingParams: trackingParams,
      meta: meta,
      isMeta: isMetaTraffic(trackingParams),
    };
  }

  function loadSnapshot() {
    return safeJsonParse(readStorage(window.sessionStorage, STORAGE_KEYS.attributionSnapshot)) || null;
  }

  function saveSnapshot(snapshot) {
    const serialized = JSON.stringify(snapshot);
    writeStorage(window.sessionStorage, STORAGE_KEYS.attributionSnapshot, serialized);
    if (snapshot && snapshot.attributionId) {
      writeStorage(window.sessionStorage, "amz_attribution_id", snapshot.attributionId);
      try {
        window.localStorage.setItem("amz_attribution_id", snapshot.attributionId);
      } catch (error) {}
    }
  }

  function buildOrUpdateSnapshot(pageId) {
    const currentTouch = buildTouch(pageId);
    const stored = loadSnapshot();
    const sessionId = ensureSessionId();
    const isNewSession = Boolean(stored && stored.sessionId && stored.sessionId !== sessionId);

    // Guardamos first touch e last touch separadamente; a Dashboard usa o last touch
    // quando ele existe e faz fallback para o first touch quando necessario.
    if (!stored || currentTouch.isMeta || isNewSession) {
      const next = !isNewSession && stored ? stored : {
        attributionId: createId(),
        sessionId: sessionId,
        startedAt: currentTouch.capturedAt,
        firstTouch: null,
        lastTouch: null,
      };

      next.sessionId = sessionId;
      next.lastSeenAt = currentTouch.capturedAt;

      if (currentTouch.isMeta && !next.firstTouch) {
        next.firstTouch = currentTouch;
      }

      if (currentTouch.isMeta) {
        next.lastTouch = currentTouch;
      }

      if (!next.entryPage) {
        next.entryPage = currentTouch.pageUrl;
      }

      if (!next.firstTouch && Object.keys(currentTouch.trackingParams).length) {
        next.firstTouch = currentTouch;
      }

      if (!next.lastTouch && Object.keys(currentTouch.trackingParams).length) {
        next.lastTouch = currentTouch;
      }

      saveSnapshot(next);
      return next;
    }

    stored.sessionId = sessionId;
    stored.lastSeenAt = currentTouch.capturedAt;
    saveSnapshot(stored);
    return stored;
  }

  function readAddressPayload() {
    const raw = readStorage(window.sessionStorage, "checkout_address");
    return safeJsonParse(raw) || {};
  }

  function buildConversionPayload(pageId, stage) {
    const snapshot = buildOrUpdateSnapshot(pageId);
    const address = readAddressPayload();
    const amountWhole = readStorage(window.sessionStorage, "checkout_price_whole") || "";
    const amountFraction = readStorage(window.sessionStorage, "checkout_price_fraction") || "00";
    const amountCents = Number(
      String(amountWhole).replace(/\D/g, "") + String(amountFraction).replace(/\D/g, "").padStart(2, "0"),
    ) || 0;

    return {
      attributionId: snapshot.attributionId,
      sessionId: snapshot.sessionId,
      pageId: pageId,
      stage: stage,
      amount: amountCents,
      buyer: {
        name: readStorage(window.sessionStorage, "user_name") || address.nome || "",
        fullAddress:
          readStorage(window.sessionStorage, "user_full_address") ||
          address.full_address ||
          "",
        cpf: address.cpf || "",
        phone: address.telefone || "",
        zipCode: address.cep || "",
        city: address.cidade || "",
        state: address.estado || "",
      },
      landingPage: snapshot.entryPage || window.location.href,
      firstTouch: snapshot.firstTouch,
      lastTouch: snapshot.lastTouch,
      capturedAt: new Date().toISOString(),
      pageUrl: window.location.href,
    };
  }

  function sendJson(url, payload, keepalive) {
    const body = JSON.stringify(payload);

    if (keepalive && navigator.sendBeacon) {
      try {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return Promise.resolve({ ok: true, beacon: true });
      } catch (error) {}
    }

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: Boolean(keepalive),
    });
  }

  function syncAttribution(pageId) {
    const snapshot = buildOrUpdateSnapshot(pageId);

    return sendJson("/api/analytics/attribution", {
      attributionId: snapshot.attributionId,
      sessionId: snapshot.sessionId,
      pageId: pageId,
      firstTouch: snapshot.firstTouch,
      lastTouch: snapshot.lastTouch,
      entryPage: snapshot.entryPage || window.location.href,
      currentPage: window.location.href,
      syncedAt: new Date().toISOString(),
    });
  }

  function registerConversionIntent(options) {
    const payload = buildConversionPayload(options.pageId, options.stage || "conversion_intent");
    return sendJson("/api/analytics/conversion", payload, true);
  }

  function init(options) {
    const pageId = options && options.pageId ? options.pageId : "unknown";

    ensureSessionId();
    syncAttribution(pageId).catch(function () {});

    if (options && options.registerConversion) {
      registerConversionIntent({
        pageId: pageId,
        stage: options.conversionStage || "conversion_intent",
      });
    }
  }

  window.__amzMetaAttribution = {
    init: init,
    syncAttribution: syncAttribution,
    registerConversionIntent: registerConversionIntent,
    getSnapshot: loadSnapshot,
  };
})();
