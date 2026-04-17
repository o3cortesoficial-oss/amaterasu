/**
 * Checkout bridge shared by all funnel pages.
 * Keeps legacy sessionStorage keys alive while syncing the real state with the API.
 */
(function () {
  function readJson(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function normalizePageId(input) {
    if (typeof input === "string") return input;
    if (input && typeof input === "object" && typeof input.pageId === "string") {
      return input.pageId;
    }
    return "unknown";
  }

  function toCents(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return 0;
      if (Number.isInteger(value) && Math.abs(value) >= 1000) return value;
      return Math.round(value * 100);
    }

    var text = String(value).trim();
    if (!text) return 0;
    if (/^-?\d+$/.test(text)) {
      var numeric = Number(text);
      if (Math.abs(numeric) >= 1000) return numeric;
      return Math.round(numeric * 100);
    }

    var normalized = text
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    var parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  }

  function centsToAmount(cents) {
    return (Number(cents || 0) || 0) / 100;
  }

  function splitCents(cents) {
    var safe = Math.max(0, Math.round(Number(cents || 0) || 0));
    return {
      whole: String(Math.floor(safe / 100)),
      fraction: String(safe % 100).padStart(2, "0"),
    };
  }

  function buildLegacyAddress(state) {
    return {
      nome: state.nome || state.name || "",
      telefone: state.telefone || state.phone || "",
      cpf: state.cpf || "",
      cep: state.cep || state.zipCode || "",
      rua: state.rua || state.street || "",
      numero: state.numero || state.number || "",
      complemento: state.complemento || state.complement || "",
      bairro: state.bairro || state.neighborhood || "",
      cidade: state.cidade || state.city || "",
      estado: state.estado || state.state || "",
      full_address: state.full_address || state.fullAddress || "",
    };
  }

  function hasMeaningfulCheckoutData(state) {
    var snapshot = normalizeState(state);
    return Boolean(
      snapshot.nome ||
        snapshot.name ||
        snapshot.cpf ||
        snapshot.cep ||
        snapshot.rua ||
        snapshot.numero ||
        snapshot.bairro ||
        snapshot.cidade ||
        snapshot.estado ||
        snapshot.full_address ||
        snapshot.amountCents
    );
  }

  function normalizeState(raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    var buyer = source.buyer && typeof source.buyer === "object" ? source.buyer : source;
    var state = Object.assign({}, buyer, source);
    var cents = toCents(
      state.amountCents ||
        state.amount_cents ||
        state.amount ||
        state.totalAmount ||
        state.total_amount
    );
    var parts = splitCents(cents);

    state.amountCents = cents;
    state.amount = centsToAmount(cents);
    state.totalAmount = centsToAmount(cents);
    state.checkout_price_whole = state.checkout_price_whole || parts.whole;
    state.checkout_price_fraction = state.checkout_price_fraction || parts.fraction;
    state.productPrice =
      state.productPrice ||
      state.product_price ||
      state.checkout_price_whole + "," + state.checkout_price_fraction;
    state.name = state.name || state.nome || "";
    state.nome = state.nome || state.name || "";
    state.phone = state.phone || state.telefone || "";
    state.telefone = state.telefone || state.phone || "";
    state.zipCode = state.zipCode || state.cep || "";
    state.cep = state.cep || state.zipCode || "";
    state.street = state.street || state.rua || "";
    state.rua = state.rua || state.street || "";
    state.number = state.number || state.numero || "";
    state.numero = state.numero || state.number || "";
    state.complement = state.complement || state.complemento || "";
    state.complemento = state.complemento || state.complement || "";
    state.neighborhood = state.neighborhood || state.bairro || "";
    state.bairro = state.bairro || state.neighborhood || "";
    state.city = state.city || state.cidade || "";
    state.cidade = state.cidade || state.city || "";
    state.state = state.state || state.estado || "";
    state.estado = state.estado || state.state || "";
    state.fullAddress = state.fullAddress || state.full_address || "";
    state.full_address = state.full_address || state.fullAddress || "";
    state.buyer = Object.assign({}, state);

    return state;
  }

  function syncCompatibilityStorage(state) {
    var snapshot = normalizeState(state);
    var legacyAddress = buildLegacyAddress(snapshot);
    var parts = splitCents(snapshot.amountCents);

    sessionStorage.setItem("checkout_price_whole", parts.whole);
    sessionStorage.setItem("checkout_price_fraction", parts.fraction);
    sessionStorage.setItem("amz_total_amount", String(snapshot.amount || 0));
    sessionStorage.setItem("checkout_address", JSON.stringify(legacyAddress));
    sessionStorage.setItem("user_name", snapshot.nome || "");
    sessionStorage.setItem(
      "user_full_address",
      snapshot.full_address || legacyAddress.full_address || ""
    );
  }

  function readLegacyState() {
    var address = readJson(sessionStorage.getItem("checkout_address")) || {};
    var cents = toCents(
      (sessionStorage.getItem("checkout_price_whole") || "0") +
        "." +
        (sessionStorage.getItem("checkout_price_fraction") || "00")
    );

    return normalizeState(
      Object.assign({}, address, {
        nome: sessionStorage.getItem("user_name") || address.nome || "",
        full_address:
          sessionStorage.getItem("user_full_address") || address.full_address || "",
        amount: cents,
      })
    );
  }

  function decorateState(state, bridge) {
    var snapshot = normalizeState(state);
    syncCompatibilityStorage(snapshot);
    return Object.assign({}, snapshot, {
      buyer: Object.assign({}, snapshot),
      attribution_id: bridge.getAttributionId(),
      session_id: bridge.getSessionId(),
      data: snapshot,
      error: null,
    });
  }

  var Bridge = {
    state: {},
    pageId: "",
    trackingPromise: null,

    getAttributionId: function () {
      var id = sessionStorage.getItem("amz_attribution_id");
      if (!id) {
        var snapshot = readJson(sessionStorage.getItem("amz_meta_attribution_snapshot"));
        if (snapshot && snapshot.attributionId) {
          id = snapshot.attributionId;
        }
      }
      if (!id) {
        id = "attr_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
      }

      sessionStorage.setItem("amz_attribution_id", id);
      try {
        localStorage.removeItem("amz_attribution_id");
      } catch (error) {}
      return id;
    },

    getSessionId: function () {
      var id = sessionStorage.getItem("amz_session_id");
      if (!id) {
        id = "sess_" + Math.random().toString(36).slice(2, 11);
        sessionStorage.setItem("amz_session_id", id);
      }
      return id;
    },

    ensurePublicTracking: async function () {
      if (window.__amzPublicTrackingLoaded) return;
      if (window.__amzPublicTrackingPromise) {
        return window.__amzPublicTrackingPromise;
      }

      window.__amzPublicTrackingPromise = fetch("/api/public/config", {
        cache: "no-store",
      })
        .then(function (response) {
          return response.ok ? response.json() : null;
        })
        .then(function (payload) {
          var pixels = payload && payload.config ? payload.config.pixels || {} : {};
          if (!pixels) return;

          if (pixels.headTag && !document.getElementById("amz-head-tag")) {
            var headContainer = document.createElement("div");
            headContainer.id = "amz-head-tag";
            headContainer.style.display = "none";
            headContainer.innerHTML = pixels.headTag;
            document.head.appendChild(headContainer);
          }

          if (pixels.bodyTag && !document.getElementById("amz-body-tag")) {
            var bodyContainer = document.createElement("div");
            bodyContainer.id = "amz-body-tag";
            bodyContainer.style.display = "none";
            bodyContainer.innerHTML = pixels.bodyTag;
            document.body.appendChild(bodyContainer);
          }

          if (Array.isArray(pixels.metaPixelId) && pixels.metaPixelId.length) {
            if (!window.fbq) {
              !(function (f, b, e, v, n, t, s) {
                if (f.fbq) return;
                n = f.fbq = function () {
                  n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
                };
                if (!f._fbq) f._fbq = n;
                n.push = n;
                n.loaded = !0;
                n.version = "2.0";
                n.queue = [];
                t = b.createElement(e);
                t.async = !0;
                t.src = v;
                s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s);
              })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
            }
            pixels.metaPixelId.forEach(function (pixelId) {
              window.fbq("init", pixelId);
            });
            window.fbq("track", "PageView");
          }

          if (Array.isArray(pixels.googleAdsId) && pixels.googleAdsId.length) {
            if (!window.gtag) {
              window.dataLayer = window.dataLayer || [];
              window.gtag = function () {
                window.dataLayer.push(arguments);
              };

              var gtagScript = document.createElement("script");
              gtagScript.async = true;
              gtagScript.src =
                "https://www.googletagmanager.com/gtag/js?id=" +
                encodeURIComponent(pixels.googleAdsId[0]);
              document.head.appendChild(gtagScript);
              window.gtag("js", new Date());
            }

            pixels.googleAdsId.forEach(function (tagId) {
              window.gtag("config", tagId);
            });
          }

          if (Array.isArray(pixels.googleTagManagerId) && pixels.googleTagManagerId.length) {
            pixels.googleTagManagerId.forEach(function (tagId, index) {
              if (document.getElementById("amz-gtm-" + index)) return;
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
              var gtmScript = document.createElement("script");
              gtmScript.async = true;
              gtmScript.id = "amz-gtm-" + index;
              gtmScript.src =
                "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(tagId);
              document.head.appendChild(gtmScript);
            });
          }

          if (Array.isArray(pixels.tiktokPixelId) && pixels.tiktokPixelId.length) {
            if (!window.ttq) {
              window.ttq = [];
              window.ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "load"];
              window.ttq.setAndDefer = function (target, method) {
                target[method] = function () {
                  target.push([method].concat([].slice.call(arguments, 0)));
                };
              };
              for (var i = 0; i < window.ttq.methods.length; i += 1) {
                window.ttq.setAndDefer(window.ttq, window.ttq.methods[i]);
              }
              var ttScript = document.createElement("script");
              ttScript.async = true;
              ttScript.src = "https://analytics.tiktok.com/i18n/pixel/events.js";
              document.head.appendChild(ttScript);
            }

            pixels.tiktokPixelId.forEach(function (pixelId) {
              if (window.ttq.load) window.ttq.load(pixelId);
            });
            if (window.ttq.page) window.ttq.page();
          }

          window.__amzPublicTrackingLoaded = true;
        })
        .catch(function () {});

      return window.__amzPublicTrackingPromise;
    },

    init: async function (pageInput) {
      this.pageId = normalizePageId(pageInput);
      var attrId = this.getAttributionId();
      var sessId = this.getSessionId();

      this.ensurePublicTracking();

      try {
        await fetch("/api/analytics/attribution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attributionId: attrId,
            sessionId: sessId,
            pageId: this.pageId,
            currentPage: window.location.href,
            firstTouch: {
              pageUrl: window.location.href,
              capturedAt: new Date().toISOString(),
            },
          }),
        });
      } catch (error) {
        console.warn("Tracking bridge init failed:", error);
      }

      return this.load();
    },

    load: async function () {
      var attrId = this.getAttributionId();
      var legacyState = readLegacyState();
      this.ensurePublicTracking();
      try {
        var response = await fetch(
          "/api/checkout/state?attributionId=" + encodeURIComponent(attrId),
          { cache: "no-store" }
        );
        var payload = await response.json();
        if (payload && payload.state && hasMeaningfulCheckoutData(payload.state)) {
          this.state = normalizeState(Object.assign({}, legacyState, payload.state));
        } else {
          this.state = legacyState;
        }
      } catch (error) {
        console.warn("Bridge: Load failed", error);
        this.state = legacyState;
      }

      return decorateState(this.state, this);
    },

    save: async function (data) {
      var attrId = this.getAttributionId();
      var sessId = this.getSessionId();
      var incomingData =
        data && typeof data === "object" ? Object.assign({}, data) : {};
      var shouldResetMatchedEvent = incomingData.resetMatchedEvent === true;

      if (Object.prototype.hasOwnProperty.call(incomingData, "resetMatchedEvent")) {
        delete incomingData.resetMatchedEvent;
      }

      this.state = normalizeState(Object.assign({}, this.state, incomingData));
      if (shouldResetMatchedEvent) {
        this.state.matched_event_id = "";
        this.state.matched_event_object_id = "";
        this.state.order_id = "";
      }
      syncCompatibilityStorage(this.state);

      try {
        var response = await fetch("/api/checkout/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attributionId: attrId,
            sessionId: sessId,
            pageId: this.pageId,
            stage: this.pageId,
            amount: this.state.amountCents || this.state.amount || this.state.totalAmount || 0,
            buyer: this.state,
            capturedAt: new Date().toISOString(),
            resetMatchedEvent: shouldResetMatchedEvent,
          }),
        });
        var payload = await response.json();
        if (payload && payload.state) {
          this.state = normalizeState(payload.state);
          syncCompatibilityStorage(this.state);
        }
      } catch (error) {
        console.warn("Bridge: Save failed", error);
      }

      return decorateState(this.state, this);
    },

    getState: async function () {
      var snapshot = await this.load();
      return Object.assign({}, snapshot, {
        buyer: Object.assign({}, snapshot.buyer || snapshot),
      });
    },

    get: function (key) {
      return this.state[key];
    },

    validateFields: function (selectors) {
      var valid = true;
      var firstInvalid = null;

      for (var key in selectors) {
        var selector = selectors[key];
        var el = document.querySelector(selector);
        if (!el || !el.value || el.value.trim().length === 0) {
          valid = false;
          if (el) {
            el.style.borderColor = "red";
            if (!firstInvalid) firstInvalid = el;
          }
        } else if (el) {
          el.style.borderColor = "";
        }
      }

      if (!valid && firstInvalid) {
        firstInvalid.focus();
        alert("Por favor, preencha todos os campos obrigatórios.");
      }

      return valid;
    },
  };

  window.__amzBridge = Bridge;
  window.Bridge = Bridge;
})();
