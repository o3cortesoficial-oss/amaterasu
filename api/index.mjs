import crypto, { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY_SERVICE_ROLE ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY_ANON_PUBLIC ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  "";
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);
const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseKey) : null;

const defaultApiHost = "api.shieldtecnologia.com";
const defaultPrimeCashApiHost = "api.primecashbrasil.com";
const defaultPosVendaWebhookBaseUrl =
  "https://xncotgcngryyokbbmess.supabase.co/functions/v1/webhook";
const defaultPosVendaPlatform = "zedy";
const defaultPosVendaTrackingBaseUrl = "https://trackorder-br.com/rastreio";
const maxStoredWebhookEvents = 250;
const maxStoredConversionIntents = 500;
const metricsPageSize = 50;
const maxPageSize = 50;
const metricsCacheTtlMs = 30 * 1000;
const maxMetricsPages = 10;
const pushcutTimeoutMs = 8000;
const conversionMatchWindowMs = 12 * 60 * 60 * 1000;
const activeSessionWindowMs = 2 * 60 * 1000;
const cloneAlertType = "clone_alert";
const trackingPixelBuffer = Buffer.from(
  "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64",
);

const fallbackAdminEmail = "saidlabsglobal@gmail.com";
const fallbackAdminPassword = "530348Home10";
const fallbackJwtSecret = "amazon-seller-central-secret-key-123";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || fallbackAdminEmail).trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || fallbackAdminPassword).trim();
const AUTH_COOKIE_NAME = "amz_admin_session";
const JWT_SECRET = (process.env.JWT_SECRET || fallbackJwtSecret).trim();
const hasAdminAuthConfig = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD && JWT_SECRET);
const runtimeConfigApiHost = process.env.TITANSHUB_API_HOST || "";
const runtimeConfigPublicKey = process.env.TITANSHUB_PUBLIC_KEY || "";
const runtimeConfigSecretKey = process.env.TITANSHUB_SECRET_KEY || "";
const runtimePrimeCashApiHost = process.env.PRIMECASH_API_HOST || "";
const runtimePrimeCashSecretKey = process.env.PRIMECASH_SECRET_KEY || "";
const runtimePosVendaWebhookUrl = process.env.POSVENDA_PRO_WEBHOOK_URL || "";
const runtimePosVendaToken = process.env.POSVENDA_PRO_TOKEN || "";
const runtimePosVendaPlatform = process.env.POSVENDA_PRO_PLATFORM || "";
const runtimePosVendaTrackingBaseUrl =
  process.env.POSVENDA_PRO_TRACKING_BASE_URL || "";
const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
const localConfigPath = path.resolve(apiDirectory, "../.admin-data/titans-config.json");

const PAID_STATUSES = new Set([
  "approved",
  "paid",
  "confirmed",
  "completed",
  "success",
]);

const REFUND_STATUSES = new Set([
  "refunded",
  "chargeback",
  "cancelled",
  "canceled",
]);

const TRAFFIC_ANALYTICS_PAGE_IDS = [
  "landing",
  "checkout_unified",
  "checkout_name",
  "checkout_cpf",
  "checkout_email",
  "checkout_phone",
  "checkout_cep",
  "checkout_street",
  "checkout_number",
  "checkout_complement",
  "checkout_neighborhood",
  "checkout_city",
  "checkout_state",
  "checkout_pix_generated",
];

const AMAZON_ORDER_PRODUCT_TITLES = new Set([
  normalizeText("Drone DJI Mini 3 Standard (Com tela) - DJI047").toLowerCase(),
]);

const SHOPEE_ORDER_PRODUCT_TITLES = new Set([
  normalizeText(
    "Drone Mini 4 Pro (Com Tela) Fly More Combo com câmera 4K cinza 3 baterias.",
  ).toLowerCase(),
]);

const memoryStore = {
  config: null,
  attributionSessions: new Map(),
  conversionIntents: new Map(),
  webhookEvents: new Map(),
  viewStats: new Map(),
  transactionsCache: new Map(),
  liveAccessBlocks: new Map(),
};

function ensureMemoryConfig() {
  if (!memoryStore.config) {
    memoryStore.config = createDefaultConfig();
  }

  return memoryStore.config;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readPingPayload(req, url, body) {
  if (req.method === "GET") {
    return {
      pageId: url.searchParams.get("pageId") || "",
      stageId: url.searchParams.get("stageId") || "",
      sessionId: url.searchParams.get("sessionId") || "",
      presenceId: url.searchParams.get("presenceId") || "",
      attributionId: url.searchParams.get("attributionId") || "",
      currentPage: url.searchParams.get("currentPage") || "",
      geo: {
        lat: url.searchParams.get("lat") || "",
        lng: url.searchParams.get("lng") || "",
        accuracy: url.searchParams.get("accuracy") || "",
        source: url.searchParams.get("geoSource") || "",
        city: url.searchParams.get("city") || "",
        region: url.searchParams.get("region") || "",
        country: url.searchParams.get("country") || "",
      },
    };
  }

  return body || {};
}

function normalizeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeIsoTimestamp(value, fallback = null) {
  const text = normalizeText(value);
  if (!text) {
    return fallback;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toISOString();
}

function ensurePlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeGeoPoint(value) {
  const source = ensurePlainObject(value);
  const lat = Number(source.lat ?? source.latitude);
  const lng = Number(source.lng ?? source.lon ?? source.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  const accuracy = Number(source.accuracy ?? source.precision ?? 0);

  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) && accuracy > 0 ? accuracy : null,
    source: normalizeText(source.source) || "browser_geolocation",
    city: normalizeText(source.city),
    region: normalizeText(source.region),
    country: normalizeText(source.country),
  };
}

function normalizeAccessControl(value) {
  const source = ensurePlainObject(value);
  if (!Object.prototype.hasOwnProperty.call(source, "blocked")) {
    return null;
  }

  return {
    blocked:
      source.blocked === true ||
      source.blocked === 1 ||
      normalizeText(source.blocked).toLowerCase() === "true" ||
      normalizeText(source.blocked) === "1",
    updatedAt: normalizeIsoTimestamp(
      source.updatedAt || source.updated_at,
      new Date().toISOString(),
    ),
    returnTo: normalizeText(source.returnTo || source.return_to),
    changedBy: normalizeText(source.changedBy || source.changed_by) || "admin",
  };
}

function normalizeDeviceInfo(value) {
  const source = ensurePlainObject(value);
  const rawType = normalizeText(source.type || source.deviceType || source.device_type).toLowerCase();
  const userAgent = normalizeText(source.userAgent || source.user_agent);
  const viewportWidth = Number(source.viewportWidth || source.viewport_width || 0);
  const hasSignal =
    Boolean(rawType) ||
    Boolean(userAgent) ||
    (Number.isFinite(viewportWidth) && viewportWidth > 0);

  if (!hasSignal) {
    return null;
  }

  const mobileSignal =
    rawType === "mobile" ||
    rawType === "tablet" ||
    /android|iphone|ipad|ipod|mobile|windows phone/i.test(userAgent) ||
    (Number.isFinite(viewportWidth) && viewportWidth > 0 && viewportWidth <= 768);
  const type = mobileSignal ? "mobile" : "desktop";

  return {
    type,
    label: type === "mobile" ? "Mobile" : "Desktop",
    userAgent,
    viewportWidth: Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : null,
  };
}

function hasTouchOriginSignal(touch) {
  return Boolean(
    touch &&
      (hasTrackingData(touch) ||
        normalizeText(touch.referrer) ||
        normalizeText(touch.pageUrl)),
  );
}

function buildLiveAccessBlockKey(input = {}) {
  const attributionId = normalizeText(input.attributionId || input.attribution_id);
  const sessionId = normalizeText(input.sessionId || input.session_id);

  if (attributionId) {
    return `attr:${attributionId}`;
  }

  if (sessionId) {
    return `sess:${sessionId}`;
  }

  return "";
}

function readHeaderText(req, ...headerNames) {
  for (const headerName of headerNames) {
    const rawValue = req.headers?.[String(headerName || "").toLowerCase()];
    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        const text = normalizeText(item);
        if (text) {
          return text;
        }
      }
      continue;
    }

    const text = normalizeText(rawValue);
    if (text) {
      return text;
    }
  }

  return "";
}

function getRequestIp(req) {
  const forwardedFor = readHeaderText(req, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor
      .split(",")
      .map((part) => normalizeText(part))
      .find(Boolean) || "";
  }

  return (
    readHeaderText(req, "x-real-ip", "cf-connecting-ip") ||
    normalizeText(req.socket?.remoteAddress)
  );
}

function buildRequestGeoPoint(req, source = "ip_geolocation") {
  return normalizeGeoPoint({
    lat: readHeaderText(req, "x-vercel-ip-latitude"),
    lng: readHeaderText(req, "x-vercel-ip-longitude"),
    accuracy: 5000,
    source,
    city: readHeaderText(req, "x-vercel-ip-city"),
    region: readHeaderText(
      req,
      "x-vercel-ip-country-region",
      "x-vercel-ip-region",
    ),
    country: readHeaderText(req, "x-vercel-ip-country"),
  });
}

async function lookupIpGeoPoint(req) {
  const headerGeo = buildRequestGeoPoint(req, "vercel_ip_geolocation");
  if (headerGeo) {
    return headerGeo;
  }

  const clientIp = getRequestIp(req);
  if (!clientIp) {
    return null;
  }

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(clientIp)}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "casaedecoracao.online live-access/1.0",
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload || payload.success === false) {
      return null;
    }

    return normalizeGeoPoint({
      lat: payload.latitude,
      lng: payload.longitude,
      accuracy: 5000,
      source: "ip_lookup",
      city: payload.city,
      region: payload.region,
      country: payload.country_code || payload.country,
    });
  } catch (error) {
    return null;
  }
}

function buildCheckoutGeoQueries(payload) {
  const street = pickFirstFilled(payload.street, payload.address, payload.rua);
  const number = pickFirstFilled(payload.number, payload.numero);
  const neighborhood = pickFirstFilled(payload.neighborhood, payload.bairro);
  const city = pickFirstFilled(payload.city, payload.cidade);
  const state = pickFirstFilled(payload.state, payload.estado);
  const zipCode = normalizeDigits(pickFirstFilled(payload.zipCode, payload.cep));

  const streetLine = [street, number].filter(Boolean).join(", ");
  const localityLine = [neighborhood, city, state, zipCode].filter(Boolean).join(", ");
  const country = "Brasil";

  return Array.from(
    new Set(
      [
        [streetLine, localityLine, country].filter(Boolean).join(", "),
        [[street, neighborhood].filter(Boolean).join(", "), city, state, zipCode, country]
          .filter(Boolean)
          .join(", "),
        [zipCode, city, state, country].filter(Boolean).join(", "),
        [city, state, country].filter(Boolean).join(", "),
      ]
        .map((query) => normalizeText(query))
        .filter(Boolean),
    ),
  );
}

async function geocodeCheckoutGeoPoint(payload, req) {
  const queries = buildCheckoutGeoQueries(ensurePlainObject(payload));

  for (const query of queries) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&addressdetails=1&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            "User-Agent": "casaedecoracao.online live-access/1.0",
          },
          signal: AbortSignal.timeout(4000),
        },
      );

      if (!response.ok) {
        continue;
      }

      const results = await response.json();
      const match = Array.isArray(results) ? results[0] : null;
      if (!match) {
        continue;
      }

      const address = ensurePlainObject(match.address);
      const geo = normalizeGeoPoint({
        lat: match.lat,
        lng: match.lon,
        accuracy: 25,
        source: "checkout_address_geocode",
        city: pickFirstFilled(
          address.city,
          address.town,
          address.village,
          address.municipality,
          payload.city,
          payload.cidade,
        ),
        region: pickFirstFilled(address.state, payload.state, payload.estado),
        country: pickFirstFilled(
          String(address.country_code || "").toUpperCase(),
          payload.country,
          "BR",
        ),
      });

      if (geo) {
        return geo;
      }
    } catch (error) {}
  }

  return lookupIpGeoPoint(req);
}

function pickFirstFilled(...values) {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) {
      return text;
    }
  }

  return "";
}

function getNestedValue(source, path) {
  return path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return current[key];
  }, source);
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeApiHost(value) {
  const normalized = String(value || defaultApiHost)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/g, "");

  return normalized || defaultApiHost;
}

function normalizeMultilineList(value) {
  const placeholderValues = new Set([
    "META1",
    "META2",
    "GTM1",
    "ID DO PIXEL / TAG",
  ]);

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
      .filter((entry) => !placeholderValues.has(entry.toUpperCase()));
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((entry) => normalizeText(entry))
    .filter(Boolean)
    .filter((entry) => !placeholderValues.has(entry.toUpperCase()));
}

function createDefaultConfig() {
  return {
    activeGateway: "titanshub",
    apiHost: normalizeApiHost(defaultApiHost),
    publicKey: "",
    secretKey: "",
    primecash: {
      apiHost: normalizeApiHost(defaultPrimeCashApiHost),
      secretKey: "",
    },
    pixels: {
      metaPixelId: [],
      googleTagManagerId: [],
      googleAdsId: [],
      googleProductHtmlSwapEnabled: false,
      tiktokPixelId: [],
      utmifyPixelId: [],
      headTag: "",
      bodyTag: "",
    },
    pushcut: {
      items: [],
    },
    updatedAt: null,
  };
}

function normalizePersistedConfig(input, fallback = createDefaultConfig()) {
  const source = ensurePlainObject(input);
  const base = fallback && typeof fallback === "object" ? fallback : createDefaultConfig();

  return {
    activeGateway:
      normalizeText(source.activeGateway).toLowerCase() === "primecash"
        ? "primecash"
        : base.activeGateway || "titanshub",
    apiHost: normalizeApiHost(source.apiHost || base.apiHost),
    publicKey:
      typeof source.publicKey === "string" ? source.publicKey.trim() : base.publicKey,
    secretKey:
      typeof source.secretKey === "string" ? source.secretKey.trim() : base.secretKey,
    primecash: {
      apiHost: normalizeApiHost(
        source?.primecash?.apiHost || base?.primecash?.apiHost || defaultPrimeCashApiHost,
      ),
      secretKey:
        typeof source?.primecash?.secretKey === "string"
          ? source.primecash.secretKey.trim()
          : base?.primecash?.secretKey || "",
    },
    pixels: {
      metaPixelId:
        "metaPixelId" in ensurePlainObject(source.pixels)
          ? normalizeMultilineList(source?.pixels?.metaPixelId)
          : normalizeMultilineList(base?.pixels?.metaPixelId),
      googleTagManagerId:
        "googleTagManagerId" in ensurePlainObject(source.pixels)
          ? normalizeMultilineList(source?.pixels?.googleTagManagerId)
          : normalizeMultilineList(base?.pixels?.googleTagManagerId),
      googleAdsId:
        "googleAdsId" in ensurePlainObject(source.pixels)
          ? normalizeMultilineList(source?.pixels?.googleAdsId)
          : normalizeMultilineList(base?.pixels?.googleAdsId),
      googleProductHtmlSwapEnabled:
        "googleProductHtmlSwapEnabled" in ensurePlainObject(source.pixels)
          ? source?.pixels?.googleProductHtmlSwapEnabled === true ||
            source?.pixels?.googleProductHtmlSwapEnabled === 1 ||
            normalizeText(source?.pixels?.googleProductHtmlSwapEnabled).toLowerCase() === "true" ||
            normalizeText(source?.pixels?.googleProductHtmlSwapEnabled) === "1" ||
            normalizeText(source?.pixels?.googleProductHtmlSwapEnabled).toLowerCase() === "on"
          : Boolean(base?.pixels?.googleProductHtmlSwapEnabled),
      tiktokPixelId:
        "tiktokPixelId" in ensurePlainObject(source.pixels)
          ? normalizeMultilineList(source?.pixels?.tiktokPixelId)
          : normalizeMultilineList(base?.pixels?.tiktokPixelId),
      utmifyPixelId:
        "utmifyPixelId" in ensurePlainObject(source.pixels)
          ? normalizeMultilineList(source?.pixels?.utmifyPixelId)
          : normalizeMultilineList(base?.pixels?.utmifyPixelId),
      headTag:
        typeof source?.pixels?.headTag === "string"
          ? source.pixels.headTag
          : base?.pixels?.headTag || "",
      bodyTag:
        typeof source?.pixels?.bodyTag === "string"
          ? source.pixels.bodyTag
          : base?.pixels?.bodyTag || "",
    },
    pushcut: {
      items:
        "pushcut" in source
          ? normalizePushcutItems(
              source?.pushcut?.items || source?.pushcut?.urls || source?.pushcutUrls || [],
            )
          : normalizePushcutItems(
              base?.pushcut?.items || base?.pushcut?.urls || base?.pushcutUrls || [],
            ),
    },
    updatedAt: source.updatedAt || base.updatedAt || null,
  };
}

function applyRuntimeConfigOverrides(config) {
  const base = normalizePersistedConfig(config);

  return normalizePersistedConfig(
    {
      ...base,
      apiHost: runtimeConfigApiHost || base.apiHost,
      publicKey: runtimeConfigPublicKey || base.publicKey,
      secretKey: runtimeConfigSecretKey || base.secretKey,
      primecash: {
        ...(base.primecash || {}),
        apiHost: runtimePrimeCashApiHost || base?.primecash?.apiHost || defaultPrimeCashApiHost,
        secretKey: runtimePrimeCashSecretKey || base?.primecash?.secretKey || "",
      },
    },
    base,
  );
}

async function readLocalConfigFile() {
  if (isServerlessRuntime) {
    return null;
  }

  try {
    const raw = await fs.readFile(localConfigPath, "utf8");
    const parsed = JSON.parse(raw);
    return normalizePersistedConfig(parsed);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      console.error("readLocalConfigFile error:", error);
    }
    return null;
  }
}

async function writeLocalConfigFile(config) {
  if (isServerlessRuntime) {
    return false;
  }

  try {
    await fs.mkdir(path.dirname(localConfigPath), { recursive: true });
    await fs.writeFile(
      localConfigPath,
      JSON.stringify(normalizePersistedConfig(config), null, 2),
      "utf8",
    );
    return true;
  } catch (error) {
    console.error("writeLocalConfigFile error:", error);
    return false;
  }
}

function hasRuntimeTitansConfig() {
  return Boolean(runtimeConfigPublicKey && runtimeConfigSecretKey);
}

function hasRuntimePrimeCashConfig() {
  return Boolean(runtimePrimeCashSecretKey);
}

function normalizePushcutItem(value, index = 0) {
  const source =
    typeof value === "string"
      ? { webhook: value }
      : value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};

  const id = normalizeText(source.id) || `pushcut-${index + 1}`;
  const webhook = normalizeText(
    source.webhook || source.url || source.webhookUrl,
  );
  const name =
    normalizeText(source.name || source.owner || source.label) ||
    (webhook ? `Dispositivo ${index + 1}` : "");

  if (!name && !webhook) {
    return null;
  }

  return {
    id,
    name,
    webhook,
    active: source.active !== false,
  };
}

function normalizePushcutItems(value) {
  let sourceItems = [];

  if (Array.isArray(value)) {
    sourceItems = value;
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Array.isArray(value.items)) {
      sourceItems = value.items;
    } else if (Array.isArray(value.urls)) {
      sourceItems = value.urls.map((webhook, index) => ({
        id: `pushcut-${index + 1}`,
        name: `Dispositivo ${index + 1}`,
        webhook,
        active: true,
      }));
    }
  } else {
    sourceItems = normalizeMultilineList(value).map((webhook, index) => ({
      id: `pushcut-${index + 1}`,
      name: `Dispositivo ${index + 1}`,
      webhook,
      active: true,
    }));
  }

  return sourceItems
    .map((item, index) => normalizePushcutItem(item, index))
    .filter(Boolean);
}

function validatePushcutItemsInput(items) {
  if (!Array.isArray(items)) {
    return {
      ok: false,
      message: "Envie uma lista valida de dispositivos Pushcut.",
    };
  }

  if (!items.length) {
    return {
      ok: false,
      message: "Cadastre pelo menos um dispositivo Pushcut valido.",
    };
  }

  const normalized = [];

  for (let index = 0; index < items.length; index += 1) {
    const raw =
      items[index] && typeof items[index] === "object" && !Array.isArray(items[index])
        ? items[index]
        : {};
    const name = normalizeText(raw.name);
    const webhook = normalizeText(raw.webhook || raw.url || raw.webhookUrl);

    if (!name) {
      return {
        ok: false,
        message: `Informe o nome do dispositivo no item ${index + 1}.`,
      };
    }

    if (!webhook) {
      return {
        ok: false,
        message: `Informe o Webhook URL no item ${index + 1}.`,
      };
    }

    if (!isValidHttpUrl(webhook)) {
      return {
        ok: false,
        message: `O Webhook URL do item ${index + 1} precisa ser uma URL http(s) valida.`,
      };
    }

    normalized.push({
      id: normalizeText(raw.id) || `pushcut-${index + 1}`,
      name,
      webhook,
      active: raw.active !== false,
    });
  }

  return { ok: true, items: normalized };
}

function getCookie(req, name) {
  const cookieHeader = Array.isArray(req.headers.cookie)
    ? req.headers.cookie.join("; ")
    : req.headers.cookie || "";
  const parts = cookieHeader.split("; ");

  for (const part of parts) {
    const separatorIndex = part.indexOf("=");
    const key = separatorIndex >= 0 ? part.slice(0, separatorIndex) : part;
    const value = separatorIndex >= 0 ? part.slice(separatorIndex + 1) : "";
    if (key === name) {
      return value;
    }
  }

  return null;
}

function signToken(payload) {
  if (!hasAdminAuthConfig) {
    throw new Error("ADMIN_AUTH_NOT_CONFIGURED");
  }

  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64");
  return `${data}.${signature}`;
}

function verifyToken(token) {
  if (!hasAdminAuthConfig || !JWT_SECRET) {
    return null;
  }

  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) {
      return null;
    }

    const expected = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(data)
      .digest("base64");

    if (signature !== expected) {
      return null;
    }

    return JSON.parse(Buffer.from(data, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function isAuthenticated(req) {
  if (!hasAdminAuthConfig) {
    return true;
  }

  const token = getCookie(req, AUTH_COOKIE_NAME);
  if (!token) {
    return false;
  }

  const payload = verifyToken(token);
  return Boolean(payload && payload.email === ADMIN_EMAIL);
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return {};
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { rawBody: raw };
  }
}

function amountToCents(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return 0;
    }

    if (Number.isInteger(value) && Math.abs(value) >= 1000) {
      return Math.round(value);
    }

    return Math.round(value * 100);
  }

  const text = String(value).trim();
  if (!text) {
    return 0;
  }

  if (/^-?\d+$/.test(text)) {
    const numeric = Number(text);
    if (Math.abs(numeric) >= 1000) {
      return numeric;
    }

    return Math.round(numeric * 100);
  }

  const normalized = text
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100);
}

function centsToCurrencyValue(cents) {
  return (Number(cents || 0) || 0) / 100;
}

function splitCents(cents) {
  const safeCents = Math.max(0, Math.round(Number(cents || 0) || 0));
  const whole = Math.floor(safeCents / 100);
  const fraction = safeCents % 100;
  return {
    whole: String(whole),
    fraction: String(fraction).padStart(2, "0"),
  };
}

function formatMoney(cents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centsToCurrencyValue(cents));
}

function isPaidStatus(status) {
  return PAID_STATUSES.has(String(status || "").toLowerCase());
}

function isRefundStatus(status) {
  return REFUND_STATUSES.has(String(status || "").toLowerCase());
}

function normalizeTouch(touch) {
  if (!touch || typeof touch !== "object") {
    return null;
  }

  const trackingParams = ensurePlainObject(touch.trackingParams);
  const meta = ensurePlainObject(touch.meta);
  const capturedAt = normalizeIsoTimestamp(touch.capturedAt, new Date().toISOString());

  return {
    capturedAt,
    pageId: normalizeText(touch.pageId),
    pageUrl: normalizeText(touch.pageUrl),
    path: normalizeText(touch.path),
    referrer: normalizeText(touch.referrer),
    trackingParams,
    meta,
    geo: normalizeGeoPoint(touch.geo || touch.location || touch.coords),
    accessControl: normalizeAccessControl(touch.accessControl || touch.access_control),
    device: normalizeDeviceInfo(touch.device || touch.deviceInfo || touch.device_info),
    isMeta:
      Boolean(touch.isMeta) ||
      Boolean(
        trackingParams.fbclid ||
          meta.campaignName ||
          meta.adsetName ||
          meta.adName ||
          meta.creativeName ||
          meta.campaignId ||
          meta.adsetId ||
          meta.adId ||
          meta.creativeId,
      ),
  };
}

function hasTrackingData(touch) {
  return Boolean(touch && Object.keys(ensurePlainObject(touch.trackingParams)).length);
}

function hasGeoSignal(touch) {
  return Boolean(touch && normalizeGeoPoint(touch.geo));
}

function hasMetaSignals(touch) {
  return Boolean(
    touch &&
      (touch.isMeta ||
        ensurePlainObject(touch.trackingParams).fbclid ||
        ensurePlainObject(touch.meta).campaignName ||
        ensurePlainObject(touch.meta).adsetName ||
        ensurePlainObject(touch.meta).adName ||
        ensurePlainObject(touch.meta).creativeName),
  );
}

function selectAttributionTouch(source) {
  const firstTouch = normalizeTouch(source?.first_touch || source?.firstTouch);
  const lastTouch = normalizeTouch(source?.last_touch || source?.lastTouch);

  if (hasMetaSignals(lastTouch)) {
    return { ...lastTouch, touchModel: "last_touch" };
  }

  if (hasMetaSignals(firstTouch)) {
    return { ...firstTouch, touchModel: "first_touch" };
  }

  if (hasTrackingData(lastTouch)) {
    return { ...lastTouch, touchModel: "last_touch" };
  }

  if (hasTrackingData(firstTouch)) {
    return { ...firstTouch, touchModel: "first_touch" };
  }

  return null;
}

function selectLiveAccessOriginTouch(session) {
  const attributedTouch = selectAttributionTouch(session);
  if (attributedTouch) {
    return attributedTouch;
  }

  return (
    normalizeTouch(session?.first_touch || session?.firstTouch) ||
    normalizeTouch(session?.last_touch || session?.lastTouch) ||
    null
  );
}

function getDomainLabel(urlValue) {
  const text = normalizeText(urlValue);
  if (!text) {
    return "";
  }

  try {
    return new URL(text).hostname.replace(/^www\./, "");
  } catch (error) {
    return text.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}

function resolveLiveAccessTrafficSource(touch) {
  const normalizedTouch = normalizeTouch(touch);
  const trackingParams = ensurePlainObject(normalizedTouch?.trackingParams);
  const referrer = normalizeText(normalizedTouch?.referrer);
  const source = normalizeText(trackingParams.utm_source).toLowerCase();
  const medium = normalizeText(trackingParams.utm_medium).toLowerCase();
  const campaign = normalizeText(
    trackingParams.utm_campaign ||
      trackingParams.campaign_name ||
      ensurePlainObject(normalizedTouch?.meta).campaignName,
  );

  if (
    normalizedTouch?.isMeta ||
    trackingParams.fbclid ||
    source.includes("meta") ||
    source.includes("facebook") ||
    source.includes("instagram")
  ) {
    return {
      type: "ad",
      label: campaign ? `Anuncio Meta: ${campaign}` : "Anuncio Meta",
    };
  }

  if (
    source ||
    medium ||
    campaign ||
    trackingParams.gclid ||
    trackingParams.msclkid
  ) {
    const isPaid =
      medium.includes("cpc") ||
      medium.includes("paid") ||
      medium.includes("ads") ||
      Boolean(trackingParams.gclid || trackingParams.msclkid);

    return {
      type: isPaid ? "ad" : "campaign",
      label: `${isPaid ? "Anuncio" : "Campanha"}: ${source || campaign || "UTM"}`,
    };
  }

  const referrerDomain = getDomainLabel(referrer);
  if (!referrerDomain) {
    return {
      type: "direct",
      label: "Pesquisa direta",
    };
  }

  if (/(^|\.)google\.|bing\.|duckduckgo\.|yahoo\./i.test(referrerDomain)) {
    return {
      type: "organic",
      label: `Pesquisa organica: ${referrerDomain}`,
    };
  }

  return {
    type: "referral",
    label: `Referencia: ${referrerDomain}`,
  };
}

function isShopeeLiveAccessSession(session, input = {}) {
  const pageId = normalizeText(input.pageId || session?.page_id).toLowerCase();
  const currentPage = normalizeText(input.currentPage || session?.current_page).toLowerCase();
  const entryPage = normalizeText(session?.entry_page).toLowerCase();

  return (
    pageId === "shopee_bigode" ||
    pageId === "shopee_max" ||
    pageId === "shopee_checkout" ||
    currentPage.includes("shopeebigode.html") ||
    currentPage.includes("shopeemax.html") ||
    currentPage.includes("shopeecheckout.html") ||
    entryPage.includes("shopeebigode.html") ||
    entryPage.includes("shopeemax.html") ||
    entryPage.includes("shopeecheckout.html")
  );
}

function shouldBypassShopeeDefaultDesktopBlock(session, input = {}) {
  if (!isShopeeLiveAccessSession(session, input)) {
    return false;
  }

  const originTouch = selectLiveAccessOriginTouch(session);
  if (!originTouch) {
    return false;
  }

  const trafficSource = resolveLiveAccessTrafficSource(originTouch);
  return trafficSource?.type === "ad" || trafficSource?.type === "campaign";
}

function getSessionAccessControl(session) {
  const lastTouch = normalizeTouch(session?.last_touch || session?.lastTouch);
  const firstTouch = normalizeTouch(session?.first_touch || session?.firstTouch);
  return lastTouch?.accessControl || firstTouch?.accessControl || null;
}

function getSessionDeviceInfo(session) {
  const lastTouch = normalizeTouch(session?.last_touch || session?.lastTouch);
  const firstTouch = normalizeTouch(session?.first_touch || session?.firstTouch);
  return lastTouch?.device || firstTouch?.device || { type: "desktop", label: "Desktop" };
}

function resolveStoredOrDefaultAccessControl(input = {}) {
  const session = input.session || null;
  const attributionId = normalizeText(input.attributionId || input.attribution_id);
  const sessionId = normalizeText(input.sessionId || input.session_id);
  const device =
    normalizeDeviceInfo(input.device || {
      type: input.deviceType || input.device_type,
      userAgent: input.userAgent || input.user_agent,
      viewportWidth: input.viewportWidth || input.viewport_width,
    }) || getSessionDeviceInfo(session);
  const persistedState = getSessionAccessControl(session);
  const memoryState =
    memoryStore.liveAccessBlocks.get(buildLiveAccessBlockKey({ attributionId, sessionId })) ||
    (session
      ? memoryStore.liveAccessBlocks.get(
          buildLiveAccessBlockKey({
            attributionId: session.attribution_id,
            sessionId: session.session_id,
          }),
        )
      : null);

  if (persistedState || memoryState) {
    return {
      ...(persistedState || memoryState),
      device,
      defaultBlocked: false,
    };
  }

  const bypassShopeeDesktopDefault =
    device.type === "desktop" && shouldBypassShopeeDefaultDesktopBlock(session, input);

  return {
    blocked: bypassShopeeDesktopDefault ? false : device.type === "desktop",
    defaultBlocked: bypassShopeeDesktopDefault ? false : device.type === "desktop",
    updatedAt: "",
    returnTo: "",
    device,
  };
}

async function resolveLiveAccessBlockState(input = {}) {
  const attributionId = normalizeText(input.attributionId || input.attribution_id);
  const sessionId = normalizeText(input.sessionId || input.session_id);
  const session =
    (attributionId && (await loadAttributionSessionByAttributionId(attributionId))) ||
    (sessionId && (await loadAttributionSessionBySessionId(sessionId))) ||
    null;

  return resolveStoredOrDefaultAccessControl({
    ...input,
    session,
    attributionId,
    sessionId,
  });
}

async function setLiveAccessBlockState(payload = {}) {
  const attributionId = normalizeText(payload.attributionId || payload.attribution_id);
  const sessionId = normalizeText(payload.sessionId || payload.session_id);
  const blocked =
    payload.blocked === true ||
    payload.blocked === 1 ||
    normalizeText(payload.blocked).toLowerCase() === "true" ||
    normalizeText(payload.blocked) === "1";

  if (!attributionId && !sessionId) {
    return null;
  }

  const current =
    (attributionId && (await loadAttributionSessionByAttributionId(attributionId))) ||
    (sessionId && (await loadAttributionSessionBySessionId(sessionId))) ||
    null;
  const now = new Date().toISOString();
  const state = {
    blocked,
    updatedAt: now,
    returnTo: normalizeText(payload.returnTo || payload.currentPage),
    changedBy: "admin",
  };
  const baseTouch =
    normalizeTouch(current?.last_touch) ||
    normalizeTouch(current?.first_touch) || {
      capturedAt: now,
      pageId: normalizeText(payload.pageId),
      pageUrl: normalizeText(payload.currentPage),
      path: "",
      referrer: "",
      trackingParams: {},
      meta: {},
      geo: null,
      isMeta: false,
    };
  const nextLastTouch = {
    ...baseTouch,
    capturedAt: now,
    accessControl: state,
  };
  const next = {
    attribution_id:
      normalizeText(current?.attribution_id) ||
      attributionId ||
      `manual_${sessionId}`,
    session_id: normalizeText(current?.session_id) || sessionId || attributionId,
    page_id: normalizeText(current?.page_id || payload.pageId),
    entry_page: normalizeText(current?.entry_page),
    current_page: normalizeText(current?.current_page || payload.currentPage),
    first_touch: current?.first_touch || nextLastTouch,
    last_touch: nextLastTouch,
    created_at: current?.created_at || now,
    updated_at: now,
  };

  memoryStore.liveAccessBlocks.set(
    buildLiveAccessBlockKey({
      attributionId: next.attribution_id,
      sessionId: next.session_id,
    }),
    state,
  );
  await saveAttributionSessionRow(next);
  return state;
}

function normalizeCheckoutSnapshot(input) {
  const source = ensurePlainObject(input);
  const amountCents = amountToCents(
    source.amountCents ?? source.amount_cents ?? source.totalAmount ?? source.amount,
  );

  const name = pickFirstFilled(source.name, source.nome);
  const fullAddress = pickFirstFilled(
    source.fullAddress,
    source.full_address,
    source.user_full_address,
  );
  const phone = normalizeDigits(pickFirstFilled(source.phone, source.telefone));
  const zipCode = normalizeDigits(pickFirstFilled(source.zipCode, source.cep));
  const city = pickFirstFilled(source.city, source.cidade);
  const state = pickFirstFilled(source.state, source.estado);

  const snapshot = {
    name,
    nome: name,
    email: normalizeText(source.email),
    cpf: normalizeDigits(source.cpf),
    phone,
    telefone: phone,
    zipCode,
    cep: zipCode,
    street: pickFirstFilled(source.street, source.rua),
    rua: pickFirstFilled(source.rua, source.street),
    number: pickFirstFilled(source.number, source.numero),
    numero: pickFirstFilled(source.numero, source.number),
    complement: pickFirstFilled(source.complement, source.complemento),
    complemento: pickFirstFilled(source.complemento, source.complement),
    neighborhood: pickFirstFilled(source.neighborhood, source.bairro),
    bairro: pickFirstFilled(source.bairro, source.neighborhood),
    city,
    cidade: city,
    state,
    estado: state,
    fullAddress,
    full_address: fullAddress,
    productName: pickFirstFilled(source.productName, source.product_name),
    productPrice: pickFirstFilled(source.productPrice, source.product_price),
    shippingMethod: pickFirstFilled(source.shippingMethod, source.shipping_method),
    shippingDeliveryWindow: pickFirstFilled(
      source.shippingDeliveryWindow,
      source.shipping_delivery_window,
    ),
    shippingPrice: centsToCurrencyValue(
      amountToCents(source.shippingPrice ?? source.shipping_price),
    ),
    upsellStorageCaseSelected: Boolean(
      source.upsellStorageCaseSelected || source.upsell_storage_case_selected,
    ),
    upsellStorageCasePrice: centsToCurrencyValue(
      amountToCents(source.upsellStorageCasePrice ?? source.upsell_storage_case_price),
    ),
    orderItems: Array.isArray(source.orderItems)
      ? source.orderItems
      : Array.isArray(source.order_items)
        ? source.order_items
        : [],
    order_items: Array.isArray(source.order_items)
      ? source.order_items
      : Array.isArray(source.orderItems)
        ? source.orderItems
        : [],
    trackingCode: pickFirstFilled(source.trackingCode, source.tracking_code),
    tracking_code: pickFirstFilled(source.tracking_code, source.trackingCode),
    trackingUrl: pickFirstFilled(source.trackingUrl, source.tracking_url),
    tracking_url: pickFirstFilled(source.tracking_url, source.trackingUrl),
    trackingStatus: pickFirstFilled(source.trackingStatus, source.tracking_status),
    tracking_status: pickFirstFilled(source.tracking_status, source.trackingStatus),
    trackingProvider: pickFirstFilled(source.trackingProvider, source.tracking_provider),
    tracking_provider: pickFirstFilled(source.tracking_provider, source.trackingProvider),
    trackingCreatedAt: pickFirstFilled(source.trackingCreatedAt, source.tracking_created_at),
    tracking_created_at: pickFirstFilled(source.tracking_created_at, source.trackingCreatedAt),
    trackingShipmentId: pickFirstFilled(source.trackingShipmentId, source.tracking_shipment_id),
    tracking_shipment_id: pickFirstFilled(source.tracking_shipment_id, source.trackingShipmentId),
    trackingError: pickFirstFilled(source.trackingError, source.tracking_error),
    tracking_error: pickFirstFilled(source.tracking_error, source.trackingError),
    gatewayDeliveryStatus: pickFirstFilled(
      source.gatewayDeliveryStatus,
      source.gateway_delivery_status,
    ),
    gateway_delivery_status: pickFirstFilled(
      source.gateway_delivery_status,
      source.gatewayDeliveryStatus,
    ),
    gatewayDeliverySyncedAt: pickFirstFilled(
      source.gatewayDeliverySyncedAt,
      source.gateway_delivery_synced_at,
    ),
    gateway_delivery_synced_at: pickFirstFilled(
      source.gateway_delivery_synced_at,
      source.gatewayDeliverySyncedAt,
    ),
    gatewayDeliveryError: pickFirstFilled(
      source.gatewayDeliveryError,
      source.gateway_delivery_error,
    ),
    gateway_delivery_error: pickFirstFilled(
      source.gateway_delivery_error,
      source.gatewayDeliveryError,
    ),
    metodo_pagamento: pickFirstFilled(source.metodo_pagamento, source.paymentMethod),
    paymentMethod: pickFirstFilled(source.paymentMethod, source.metodo_pagamento),
    amountCents,
    amount: centsToCurrencyValue(amountCents),
    totalAmount: centsToCurrencyValue(amountCents),
  };

  if (!snapshot.fullAddress) {
    const pieces = [
      snapshot.rua,
      snapshot.numero,
      snapshot.complemento ? `- ${snapshot.complemento}` : "",
      snapshot.bairro,
      snapshot.cidade ? `${snapshot.cidade}${snapshot.estado ? ` - ${snapshot.estado}` : ""}` : "",
      snapshot.cep,
    ].filter(Boolean);

    snapshot.fullAddress = pieces.join(", ");
    snapshot.full_address = snapshot.fullAddress;
  }

  if (!snapshot.productPrice && amountCents > 0) {
    const { whole, fraction } = splitCents(amountCents);
    snapshot.productPrice = `${whole},${fraction}`;
  }

  return snapshot;
}

function mergeCheckoutSnapshots(...inputs) {
  const merged = {};
  let resolvedAmountCents = 0;

  inputs.forEach((input) => {
    const snapshot = normalizeCheckoutSnapshot(input);

    Object.entries(snapshot).forEach(([key, value]) => {
      if (key === "buyer") {
        return;
      }

      if (typeof value === "string") {
        if (normalizeText(value)) {
          merged[key] = value;
        }
        return;
      }

      if (typeof value === "number") {
        if (Number.isFinite(value) && value > 0) {
          merged[key] = value;
        }
        return;
      }

      if (value !== undefined && value !== null) {
        merged[key] = value;
      }
    });

    const snapshotAmountCents = amountToCents(
      snapshot.amountCents ?? snapshot.amount ?? snapshot.totalAmount,
    );
    if (snapshotAmountCents > 0) {
      resolvedAmountCents = snapshotAmountCents;
    }
  });

  if (resolvedAmountCents > 0) {
    merged.amountCents = resolvedAmountCents;
    merged.amount = centsToCurrencyValue(resolvedAmountCents);
    merged.totalAmount = centsToCurrencyValue(resolvedAmountCents);
  }

  return normalizeCheckoutSnapshot(merged);
}

const BRAZILIAN_STATE_CODES = new Map(
  [
    ["AC", "AC"],
    ["ACRE", "AC"],
    ["AL", "AL"],
    ["ALAGOAS", "AL"],
    ["AP", "AP"],
    ["AMAPA", "AP"],
    ["AMAPÁ", "AP"],
    ["AM", "AM"],
    ["AMAZONAS", "AM"],
    ["BA", "BA"],
    ["BAHIA", "BA"],
    ["CE", "CE"],
    ["CEARA", "CE"],
    ["CEARÁ", "CE"],
    ["DF", "DF"],
    ["DISTRITOFEDERAL", "DF"],
    ["ES", "ES"],
    ["ESPIRITOSANTO", "ES"],
    ["ESPÍRITOSANTO", "ES"],
    ["GO", "GO"],
    ["GOIAS", "GO"],
    ["GOIÁS", "GO"],
    ["MA", "MA"],
    ["MARANHAO", "MA"],
    ["MARANHÃO", "MA"],
    ["MT", "MT"],
    ["MATOGROSSO", "MT"],
    ["MS", "MS"],
    ["MATOGROSSODOSUL", "MS"],
    ["MG", "MG"],
    ["MINASGERAIS", "MG"],
    ["PA", "PA"],
    ["PARA", "PA"],
    ["PARÁ", "PA"],
    ["PB", "PB"],
    ["PARAIBA", "PB"],
    ["PARAÍBA", "PB"],
    ["PR", "PR"],
    ["PARANA", "PR"],
    ["PARANÁ", "PR"],
    ["PE", "PE"],
    ["PERNAMBUCO", "PE"],
    ["PI", "PI"],
    ["PIAUI", "PI"],
    ["PIAUÍ", "PI"],
    ["RJ", "RJ"],
    ["RIODEJANEIRO", "RJ"],
    ["RN", "RN"],
    ["RIOGRANDEDONORTE", "RN"],
    ["RS", "RS"],
    ["RIOGRANDEDOSUL", "RS"],
    ["RO", "RO"],
    ["RONDONIA", "RO"],
    ["RONDÔNIA", "RO"],
    ["RR", "RR"],
    ["RORAIMA", "RR"],
    ["SC", "SC"],
    ["SANTACATARINA", "SC"],
    ["SP", "SP"],
    ["SAOPAULO", "SP"],
    ["SÃOPAULO", "SP"],
    ["SE", "SE"],
    ["SERGIPE", "SE"],
    ["TO", "TO"],
    ["TOCANTINS", "TO"],
  ].map(([label, code]) => [
    label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ""),
    code,
  ]),
);

function normalizeBrazilStateCode(value) {
  const text = normalizeText(value).toUpperCase();
  if (!text) {
    return "";
  }

  const normalizedKey = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

  if (BRAZILIAN_STATE_CODES.has(normalizedKey)) {
    return BRAZILIAN_STATE_CODES.get(normalizedKey);
  }

  return text.length === 2 ? text : text.slice(0, 2);
}

function buildTitansCustomerPayload(buyer) {
  const safeBuyer = normalizeCheckoutSnapshot(buyer);
  const emailSeed =
    normalizeDigits(safeBuyer.cpf) ||
    normalizeDigits(safeBuyer.phone) ||
    randomUUID().replace(/-/g, "");

  return {
    name: safeBuyer.name,
    email: normalizeText(safeBuyer.email) || `${emailSeed}@checkout.amaterasu.app`,
    document: {
      number: safeBuyer.cpf,
      type: "cpf",
    },
    ...(safeBuyer.phone ? { phone: safeBuyer.phone } : {}),
  };
}

function buildPrimeCashCustomerPayload(buyer) {
  const safeBuyer = normalizeCheckoutSnapshot(buyer);
  const emailSeed =
    normalizeDigits(safeBuyer.cpf) ||
    normalizeDigits(safeBuyer.phone) ||
    randomUUID().replace(/-/g, "");
  const address = buildTitansShippingPayload([{ tangible: true }], safeBuyer)?.address;

  return {
    name: safeBuyer.name,
    email: normalizeText(safeBuyer.email) || `${emailSeed}@checkout.amaterasu.app`,
    document: {
      number: safeBuyer.cpf,
      type: "cpf",
    },
    ...(safeBuyer.phone ? { phone: safeBuyer.phone } : {}),
    ...(address ? { address } : {}),
  };
}

function buildTitansShippingPayload(items, buyer) {
  const hasTangibleItem = (items || []).some((item) => item && item.tangible !== false);
  if (!hasTangibleItem) {
    return null;
  }

  const safeBuyer = normalizeCheckoutSnapshot(buyer);
  const address = {
    street: normalizeText(safeBuyer.street || safeBuyer.rua),
    streetNumber: normalizeText(safeBuyer.number || safeBuyer.numero),
    neighborhood: normalizeText(safeBuyer.neighborhood || safeBuyer.bairro),
    city: normalizeText(safeBuyer.city || safeBuyer.cidade),
    state: normalizeBrazilStateCode(safeBuyer.state || safeBuyer.estado),
    zipCode: normalizeDigits(safeBuyer.zipCode || safeBuyer.cep),
    country: "BR",
    complement: normalizeText(safeBuyer.complement || safeBuyer.complemento),
  };

  if (
    !address.street ||
    !address.streetNumber ||
    !address.neighborhood ||
    !address.city ||
    !address.state ||
    !address.zipCode
  ) {
    return null;
  }

  if (!address.complement) {
    delete address.complement;
  }

  return {
    fee: 0,
    address,
  };
}

function getPosVendaConfig() {
  return {
    webhookUrl: normalizeText(runtimePosVendaWebhookUrl),
    token: normalizeText(runtimePosVendaToken),
    platform: normalizeText(runtimePosVendaPlatform) || defaultPosVendaPlatform,
    trackingBaseUrl:
      normalizeText(runtimePosVendaTrackingBaseUrl) || defaultPosVendaTrackingBaseUrl,
  };
}

function buildPosVendaWebhookUrl(posVendaConfig) {
  const config = posVendaConfig || getPosVendaConfig();
  const explicitUrl = normalizeText(config.webhookUrl);

  if (explicitUrl) {
    try {
      const url = new URL(explicitUrl);
      if (config.token && !url.searchParams.has("token")) {
        url.searchParams.set("token", config.token);
      }
      if (config.platform && !url.searchParams.has("platform")) {
        url.searchParams.set("platform", config.platform);
      }
      return url.toString();
    } catch {
      return "";
    }
  }

  if (!config.token) {
    return "";
  }

  const url = new URL(defaultPosVendaWebhookBaseUrl);
  url.searchParams.set("token", config.token);
  url.searchParams.set("platform", config.platform || defaultPosVendaPlatform);
  return url.toString();
}

function buildTrackingUrl(code, trackingBaseUrl = defaultPosVendaTrackingBaseUrl) {
  const trackingCode = normalizeText(code);
  const base = normalizeText(trackingBaseUrl) || defaultPosVendaTrackingBaseUrl;

  if (!trackingCode) {
    return "";
  }

  return `${base.replace(/\/+$/, "")}/${encodeURIComponent(trackingCode)}`;
}

function extractPosVendaProducts(intent, eventRecord, transaction) {
  const buyer = normalizeCheckoutSnapshot(intent?.buyer);
  const candidates = [
    getNestedValue(eventRecord, "raw.items"),
    getNestedValue(eventRecord, "raw.data.items"),
    getNestedValue(eventRecord, "raw.products"),
    getNestedValue(transaction, "items"),
    getNestedValue(transaction, "raw.items"),
    buyer.orderItems,
    buyer.order_items,
  ];

  const rawItems = candidates.find((items) => Array.isArray(items) && items.length) || [];
  const products = rawItems
    .map((item) => {
      const title = pickFirstFilled(item?.title, item?.name, item?.productName);
      const quantity = Math.max(1, Number(item?.quantity || item?.qty || 1) || 1);
      const priceInCents = amountToCents(
        item?.priceInCents ??
          item?.price_in_cents ??
          item?.unitPrice ??
          item?.unit_price ??
          item?.price,
      );

      if (!title) {
        return null;
      }

      return {
        name: title,
        quantity,
        priceInCents:
          priceInCents || Math.max(1, Math.round(amountToCents(intent?.amount || buyer.amountCents) / quantity)),
      };
    })
    .filter(Boolean);

  if (products.length) {
    return products;
  }

  return [
    {
      name: buyer.productName || "Produto",
      quantity: 1,
      priceInCents: amountToCents(intent?.amount || buyer.amountCents),
    },
  ];
}

function buildPosVendaPayload(intent, eventRecord = null, transaction = null) {
  const buyer = normalizeCheckoutSnapshot(intent?.buyer);
  const shippingPayload = buildTitansShippingPayload(
    extractPosVendaProducts(intent, eventRecord, transaction).map((item) => ({
      title: item.name,
      quantity: item.quantity,
      unitPrice: item.priceInCents,
      tangible: true,
    })),
    buyer,
  );
  const address = shippingPayload?.address || {};

  return {
    orderId: pickFirstFilled(
      eventRecord?.object_id,
      eventRecord?.external_ref,
      transaction?.id,
      intent?.matched_event_object_id,
      intent?.id,
    ),
    customer: {
      name: buyer.name,
      email: buyer.email,
      document: buyer.cpf,
      phone: buyer.phone,
    },
    address: {
      street: address.street || buyer.street || buyer.rua,
      number: address.streetNumber || buyer.number || buyer.numero,
      complement: address.complement || buyer.complement || buyer.complemento,
      neighborhood: address.neighborhood || buyer.neighborhood || buyer.bairro,
      city: address.city || buyer.city || buyer.cidade,
      state: address.state || normalizeBrazilStateCode(buyer.state || buyer.estado),
      zipcode: address.zipCode || buyer.zipCode || buyer.cep,
    },
    products: extractPosVendaProducts(intent, eventRecord, transaction),
    status: "paid",
    paymentMethod: "pix",
  };
}

function mergeTrackingIntoIntent(intent, trackingData) {
  const now = new Date().toISOString();
  const buyer = normalizeCheckoutSnapshot(intent?.buyer || {});
  const trackingCode = normalizeText(trackingData?.trackingCode);
  const trackingUrl = normalizeText(trackingData?.trackingUrl);
  const trackingStatus = normalizeText(trackingData?.trackingStatus);

  return {
    ...intent,
    buyer: {
      ...buyer,
      trackingCode,
      tracking_code: trackingCode,
      trackingUrl,
      tracking_url: trackingUrl,
      trackingStatus,
      tracking_status: trackingStatus,
      trackingProvider: normalizeText(trackingData?.trackingProvider) || buyer.trackingProvider,
      tracking_provider: normalizeText(trackingData?.trackingProvider) || buyer.tracking_provider,
      trackingCreatedAt: normalizeText(trackingData?.trackingCreatedAt) || buyer.trackingCreatedAt || now,
      tracking_created_at:
        normalizeText(trackingData?.trackingCreatedAt) || buyer.tracking_created_at || now,
      trackingShipmentId: normalizeText(trackingData?.trackingShipmentId) || buyer.trackingShipmentId,
      tracking_shipment_id:
        normalizeText(trackingData?.trackingShipmentId) || buyer.tracking_shipment_id,
      trackingError: normalizeText(trackingData?.trackingError),
      tracking_error: normalizeText(trackingData?.trackingError),
      gatewayDeliveryStatus:
        normalizeText(trackingData?.gatewayDeliveryStatus) || buyer.gatewayDeliveryStatus,
      gateway_delivery_status:
        normalizeText(trackingData?.gatewayDeliveryStatus) || buyer.gateway_delivery_status,
      gatewayDeliverySyncedAt:
        normalizeText(trackingData?.gatewayDeliverySyncedAt) || buyer.gatewayDeliverySyncedAt,
      gateway_delivery_synced_at:
        normalizeText(trackingData?.gatewayDeliverySyncedAt) || buyer.gateway_delivery_synced_at,
      gatewayDeliveryError: normalizeText(trackingData?.gatewayDeliveryError),
      gateway_delivery_error: normalizeText(trackingData?.gatewayDeliveryError),
    },
    updated_at: now,
  };
}

async function syncPrimeCashDeliveryTracking(gatewayConfig, transactionId, trackingCode) {
  if (
    normalizeGatewayProvider(gatewayConfig?.provider) !== "primecash" ||
    !normalizeText(transactionId) ||
    !normalizeText(trackingCode)
  ) {
    return { skipped: true };
  }

  return callTitansApi(
    gatewayConfig,
    `/v1/transactions/${encodeURIComponent(transactionId)}/delivery`,
    {
      method: "PUT",
      body: {
        status: "in_transit",
        trackingCode,
      },
    },
  );
}

async function ensureTrackingForPaidIntent(intent, options = {}) {
  if (!intent || !isPaidStatus(options.status || intent.stage)) {
    return intent;
  }

  const buyer = normalizeCheckoutSnapshot(intent.buyer);
  if (buyer.trackingCode || buyer.tracking_code) {
    return intent;
  }

  const posVendaConfig = getPosVendaConfig();
  const webhookUrl = buildPosVendaWebhookUrl(posVendaConfig);

  if (!webhookUrl) {
    const disabledIntent = mergeTrackingIntoIntent(intent, {
      trackingStatus: "posvenda_not_configured",
      trackingProvider: "posvenda_pro",
      trackingError:
        "Configure POSVENDA_PRO_WEBHOOK_URL ou POSVENDA_PRO_TOKEN nas variaveis de ambiente.",
    });
    await saveConversionIntentRow(disabledIntent);
    return disabledIntent;
  }

  const payload = buildPosVendaPayload(intent, options.eventRecord, options.transaction);
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(pushcutTimeoutMs)
      : undefined;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message =
        typeof data === "string"
          ? data
          : data?.message || `PósVenda Pro respondeu com status ${response.status}.`;
      throw new Error(message);
    }

    const trackingCode = pickFirstFilled(
      data?.tracking_code,
      data?.trackingCode,
      data?.code,
    );
    const trackingUrl = trackingCode
      ? buildTrackingUrl(trackingCode, posVendaConfig.trackingBaseUrl)
      : "";
    let nextIntent = mergeTrackingIntoIntent(intent, {
      trackingCode,
      trackingUrl,
      trackingStatus: trackingCode
        ? "created"
        : data?.duplicate
          ? "duplicate"
          : data?.auto_processed === false
            ? "pending_balance"
            : "pending",
      trackingProvider: "posvenda_pro",
      trackingShipmentId: pickFirstFilled(data?.shipment_id, data?.shipmentId),
    });

    if (trackingCode) {
      try {
        await syncPrimeCashDeliveryTracking(
          options.gatewayConfig,
          pickFirstFilled(
            options.transaction?.id,
            options.eventRecord?.object_id,
            intent.matched_event_object_id,
          ),
          trackingCode,
        );
        nextIntent = mergeTrackingIntoIntent(nextIntent, {
          ...nextIntent.buyer,
          gatewayDeliveryStatus: "synced",
          gatewayDeliverySyncedAt: new Date().toISOString(),
          gatewayDeliveryError: "",
        });
      } catch (syncError) {
        nextIntent = mergeTrackingIntoIntent(nextIntent, {
          ...nextIntent.buyer,
          gatewayDeliveryStatus: "error",
          gatewayDeliveryError: syncError.message,
        });
      }
    }

    await saveConversionIntentRow(nextIntent);
    return nextIntent;
  } catch (error) {
    const failedIntent = mergeTrackingIntoIntent(intent, {
      trackingStatus: "error",
      trackingProvider: "posvenda_pro",
      trackingError: error.message,
    });
    await saveConversionIntentRow(failedIntent);
    return failedIntent;
  }
}

function buildCheckoutState(intent, fallbackAttributionId = "", fallbackSessionId = "") {
  const source = ensurePlainObject(intent);
  const buyer = normalizeCheckoutSnapshot(source.buyer);
  const amountCents = amountToCents(source.amount || buyer.amountCents);
  const { whole, fraction } = splitCents(amountCents);

  return {
    ...buyer,
    buyer,
    amount: centsToCurrencyValue(amountCents),
    amountCents,
    totalAmount: centsToCurrencyValue(amountCents),
    checkout_price_whole: whole,
    checkout_price_fraction: fraction,
    productPrice: buyer.productPrice || `${whole},${fraction}`,
    stage: normalizeText(source.stage),
    attribution_id: normalizeText(source.attribution_id) || fallbackAttributionId,
    session_id: normalizeText(source.session_id) || fallbackSessionId,
    matched_event_id: normalizeText(source.matched_event_id),
    matched_event_object_id: pickFirstFilled(
      source.matched_event_object_id,
      source.order_id,
    ),
    order_id: pickFirstFilled(source.matched_event_object_id, source.order_id),
    landing_page: normalizeText(source.landing_page),
    page_url: normalizeText(source.page_url),
  };
}

function normalizeGatewayProvider(value) {
  return normalizeText(value).toLowerCase() === "primecash"
    ? "primecash"
    : "titanshub";
}

function normalizeGatewayProviderOrEmpty(value) {
  const text = normalizeText(value).toLowerCase();
  if (text === "primecash") {
    return "primecash";
  }
  if (text === "titanshub" || text === "titans" || text === "shield") {
    return "titanshub";
  }
  return "";
}

function getTitansGatewayConfig(config) {
  return {
    provider: "titanshub",
    label: "TitansHub",
    apiHost: normalizeApiHost(config?.apiHost || defaultApiHost),
    publicKey: normalizeText(config?.publicKey),
    secretKey: normalizeText(config?.secretKey),
  };
}

function getPrimeCashGatewayConfig(config) {
  return {
    provider: "primecash",
    label: "PrimeCash",
    apiHost: normalizeApiHost(
      config?.primecash?.apiHost || defaultPrimeCashApiHost,
    ),
    publicKey: "",
    secretKey: normalizeText(config?.primecash?.secretKey),
  };
}

function getActiveGatewayConfig(config) {
  const provider = normalizeGatewayProvider(config?.activeGateway);
  return provider === "primecash"
    ? getPrimeCashGatewayConfig(config)
    : getTitansGatewayConfig(config);
}

function isGatewayConfigured(config) {
  const provider = normalizeGatewayProvider(config?.provider || config?.activeGateway);
  if (provider === "primecash") {
    return Boolean(normalizeText(config?.secretKey));
  }

  return Boolean(normalizeText(config?.publicKey) && normalizeText(config?.secretKey));
}

function buildGatewayClientConfig(config, req, provider) {
  const gateway =
    provider === "primecash"
      ? getPrimeCashGatewayConfig(config)
      : getTitansGatewayConfig(config);

  return {
    provider: gateway.provider,
    label: gateway.label,
    apiHost: gateway.apiHost,
    publicKey: gateway.publicKey,
    hasSecretKey: Boolean(gateway.secretKey),
    secretKeyMasked: gateway.secretKey ? "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" : "",
    isConfigured: isGatewayConfigured(gateway),
    webhookUrl: getWebhookUrl(req, gateway.provider),
  };
}

function getWebhookUrl(req, provider = "titanshub") {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  const normalizedProvider = normalizeGatewayProvider(provider);
  const webhookPath =
    normalizedProvider === "primecash" ? "/api/primecash/webhook" : "/api/titans/webhook";
  return `${protocol}://${host}${webhookPath}`;
}

async function loadConfig() {
  if (!supabase) {
    const fileConfig = await readLocalConfigFile();
    if (fileConfig) {
      memoryStore.config = fileConfig;
      return applyRuntimeConfigOverrides(fileConfig);
    }

    return applyRuntimeConfigOverrides(ensureMemoryConfig());
  }

  try {
    const { data, error } = await supabase
      .from("config")
      .select("data")
      .eq("id", "default")
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    const config = normalizePersistedConfig(data?.data || {});
    memoryStore.config = config;
    return applyRuntimeConfigOverrides(config);
  } catch (error) {
    console.error("loadConfig error:", error);
    const fileConfig = await readLocalConfigFile();
    if (fileConfig) {
      memoryStore.config = fileConfig;
      return applyRuntimeConfigOverrides(fileConfig);
    }

    return applyRuntimeConfigOverrides(ensureMemoryConfig());
  }
}

async function saveConfig(input) {
  const current = await loadConfig();
  const nextPixelsInput =
    input && typeof input.pixels === "object" && input.pixels ? input.pixels : {};
  const nextPushcutInput =
    input && typeof input.pushcut === "object" && input.pushcut ? input.pushcut : {};
  const nextPrimeCashInput =
    input && typeof input.primecash === "object" && input.primecash ? input.primecash : {};

  const next = {
    activeGateway:
      "activeGateway" in ensurePlainObject(input)
        ? normalizeGatewayProvider(input?.activeGateway)
        : current.activeGateway,
    apiHost: normalizeApiHost(input?.apiHost || current.apiHost),
    publicKey:
      typeof input?.publicKey === "string" ? input.publicKey.trim() : current.publicKey,
    secretKey:
      typeof input?.secretKey === "string" && input.secretKey.trim()
        ? input.secretKey.trim()
        : current.secretKey,
    primecash: {
      apiHost:
        typeof nextPrimeCashInput.apiHost === "string" && nextPrimeCashInput.apiHost.trim()
          ? normalizeApiHost(nextPrimeCashInput.apiHost)
          : current.primecash.apiHost,
      secretKey:
        typeof nextPrimeCashInput.secretKey === "string" && nextPrimeCashInput.secretKey.trim()
          ? nextPrimeCashInput.secretKey.trim()
          : current.primecash.secretKey,
    },
    pixels: {
      metaPixelId:
        "metaPixelId" in nextPixelsInput
          ? normalizeMultilineList(nextPixelsInput.metaPixelId)
          : current.pixels.metaPixelId,
      googleTagManagerId:
        "googleTagManagerId" in nextPixelsInput
          ? normalizeMultilineList(nextPixelsInput.googleTagManagerId)
          : current.pixels.googleTagManagerId,
      googleAdsId:
        "googleAdsId" in nextPixelsInput
          ? normalizeMultilineList(nextPixelsInput.googleAdsId)
          : current.pixels.googleAdsId,
      googleProductHtmlSwapEnabled:
        "googleProductHtmlSwapEnabled" in nextPixelsInput
          ? nextPixelsInput.googleProductHtmlSwapEnabled === true ||
            nextPixelsInput.googleProductHtmlSwapEnabled === 1 ||
            normalizeText(nextPixelsInput.googleProductHtmlSwapEnabled).toLowerCase() === "true" ||
            normalizeText(nextPixelsInput.googleProductHtmlSwapEnabled) === "1" ||
            normalizeText(nextPixelsInput.googleProductHtmlSwapEnabled).toLowerCase() === "on"
          : Boolean(current.pixels.googleProductHtmlSwapEnabled),
      tiktokPixelId:
        "tiktokPixelId" in nextPixelsInput
          ? normalizeMultilineList(nextPixelsInput.tiktokPixelId)
          : current.pixels.tiktokPixelId,
      utmifyPixelId:
        "utmifyPixelId" in nextPixelsInput
          ? normalizeMultilineList(nextPixelsInput.utmifyPixelId)
          : current.pixels.utmifyPixelId,
      headTag:
        typeof nextPixelsInput.headTag === "string"
          ? nextPixelsInput.headTag
          : current.pixels.headTag,
      bodyTag:
        typeof nextPixelsInput.bodyTag === "string"
          ? nextPixelsInput.bodyTag
          : current.pixels.bodyTag,
    },
    pushcut: {
      items:
        "items" in nextPushcutInput || "urls" in nextPushcutInput
          ? normalizePushcutItems(nextPushcutInput.items ?? nextPushcutInput.urls)
          : current.pushcut.items,
    },
    updatedAt: new Date().toISOString(),
  };

  if (!supabase) {
    memoryStore.config = next;
    const persisted = await writeLocalConfigFile(next);
    if (
      !persisted &&
      isServerlessRuntime &&
      !hasRuntimeTitansConfig() &&
      !hasRuntimePrimeCashConfig()
    ) {
      const error = new Error(
        "Nao foi possivel persistir a configuracao das gateways neste deploy. Configure o Supabase ou use as variaveis de ambiente da gateway desejada na Vercel.",
      );
      error.status = 500;
      throw error;
    }
    return applyRuntimeConfigOverrides(next);
  }

  try {
    const { error } = await supabase.from("config").upsert({
      id: "default",
      data: next,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("saveConfig error:", error);
    memoryStore.config = next;
    const persisted = await writeLocalConfigFile(next);
    if (
      !persisted &&
      isServerlessRuntime &&
      !hasRuntimeTitansConfig() &&
      !hasRuntimePrimeCashConfig()
    ) {
      const storageError = new Error(
        "Nao foi possivel persistir a configuracao das gateways neste deploy. Configure o Supabase ou use as variaveis de ambiente da gateway desejada na Vercel.",
      );
      storageError.status = 500;
      throw storageError;
    }
  }

  return applyRuntimeConfigOverrides(next);
}

function serializeConfigForClient(config, req) {
  const pushcutItems = Array.isArray(config.pushcut?.items)
    ? config.pushcut.items
    : [];
  const activeGateway = getActiveGatewayConfig(config);
  const titansGateway = buildGatewayClientConfig(config, req, "titanshub");
  const primecashGateway = buildGatewayClientConfig(config, req, "primecash");

  return {
    activeGateway: activeGateway.provider,
    activeGatewayLabel: activeGateway.label,
    apiHost: activeGateway.apiHost,
    publicKey: activeGateway.publicKey,
    hasSecretKey: Boolean(activeGateway.secretKey),
    secretKeyMasked: activeGateway.secretKey ? "••••••••••••" : "",
    isConfigured: isGatewayConfigured(activeGateway),
    titans: titansGateway,
    primecash: primecashGateway,
    pixels: config.pixels,
    pushcut: {
      items: pushcutItems,
      count: pushcutItems.length,
      activeCount: pushcutItems.filter((item) => item.active !== false).length,
    },
    updatedAt: config.updatedAt,
    webhookUrl: getWebhookUrl(req, activeGateway.provider),
  };
}

function serializePublicConfig(config) {
  return {
    pixels: {
      metaPixelId: config.pixels?.metaPixelId || [],
      googleTagManagerId: config.pixels?.googleTagManagerId || [],
      googleAdsId: config.pixels?.googleAdsId || [],
      googleProductHtmlSwapEnabled: Boolean(config.pixels?.googleProductHtmlSwapEnabled),
      tiktokPixelId: config.pixels?.tiktokPixelId || [],
      utmifyPixelId: config.pixels?.utmifyPixelId || [],
      headTag: config.pixels?.headTag || "",
      bodyTag: config.pixels?.bodyTag || "",
    },
  };
}

async function loadWebhookEvents(limit = maxStoredWebhookEvents) {
  if (!supabase) {
    return Array.from(memoryStore.webhookEvents.values())
      .sort((a, b) => new Date(b.received_at) - new Date(a.received_at))
      .slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from("webhook_events")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("loadWebhookEvents error:", error);
    return Array.from(memoryStore.webhookEvents.values())
      .sort((a, b) => new Date(b.received_at) - new Date(a.received_at))
      .slice(0, limit);
  }
}

async function saveWebhookEvent(event) {
  if (!event) {
    return;
  }

  if (!supabase) {
    memoryStore.webhookEvents.set(event.id, event);
    return;
  }

  try {
    const { error } = await supabase.from("webhook_events").insert(event);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("saveWebhookEvent error:", error);
    memoryStore.webhookEvents.set(event.id, event);
  }
}

async function loadConversionIntents(limit = maxStoredConversionIntents) {
  if (!supabase) {
    return Array.from(memoryStore.conversionIntents.values())
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from("conversion_intents")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("loadConversionIntents error:", error);
    return Array.from(memoryStore.conversionIntents.values())
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, limit);
  }
}

async function loadLatestConversionIntentByAttributionId(attributionId) {
  const normalizedId = normalizeText(attributionId);
  if (!normalizedId) {
    return null;
  }

  if (!supabase) {
    return Array.from(memoryStore.conversionIntents.values())
      .filter((intent) => intent.attribution_id === normalizedId)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null;
  }

  try {
    const { data, error } = await supabase
      .from("conversion_intents")
      .select("*")
      .eq("attribution_id", normalizedId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error("loadLatestConversionIntentByAttributionId error:", error);
    return null;
  }
}

async function saveConversionIntentRow(row) {
  if (!row) {
    return null;
  }

  if (!supabase) {
    memoryStore.conversionIntents.set(row.id, row);
    return row;
  }

  try {
    const { error } = await supabase.from("conversion_intents").upsert(row);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("saveConversionIntentRow error:", error);
    memoryStore.conversionIntents.set(row.id, row);
  }

  return row;
}

async function loadAttributionSessionByAttributionId(attributionId) {
  const normalizedId = normalizeText(attributionId);
  if (!normalizedId) {
    return null;
  }

  if (!supabase) {
    return memoryStore.attributionSessions.get(normalizedId) || null;
  }

  try {
    const { data, error } = await supabase
      .from("attribution_sessions")
      .select("*")
      .eq("attribution_id", normalizedId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error("loadAttributionSessionByAttributionId error:", error);
    return memoryStore.attributionSessions.get(normalizedId) || null;
  }
}

async function loadAttributionSessionBySessionId(sessionId) {
  const normalizedId = normalizeText(sessionId);
  if (!normalizedId) {
    return null;
  }

  if (!supabase) {
    return (
      Array.from(memoryStore.attributionSessions.values())
        .filter((session) => session.session_id === normalizedId)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null
    );
  }

  try {
    const { data, error } = await supabase
      .from("attribution_sessions")
      .select("*")
      .eq("session_id", normalizedId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error("loadAttributionSessionBySessionId error:", error);
    return (
      Array.from(memoryStore.attributionSessions.values())
        .filter((session) => session.session_id === normalizedId)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null
    );
  }
}

async function loadAttributionSessions(limit = 500) {
  if (!supabase) {
    return Array.from(memoryStore.attributionSessions.values())
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from("attribution_sessions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("loadAttributionSessions error:", error);
    return Array.from(memoryStore.attributionSessions.values())
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, limit);
  }
}

async function saveAttributionSessionRow(row) {
  if (!row) {
    return null;
  }

  if (!supabase) {
    memoryStore.attributionSessions.set(row.attribution_id, row);
    return row;
  }

  try {
    const { error } = await supabase.from("attribution_sessions").upsert(row);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("saveAttributionSessionRow error:", error);
    memoryStore.attributionSessions.set(row.attribution_id, row);
  }

  return row;
}

async function loadViewStats() {
  if (!supabase) {
    return Array.from(memoryStore.viewStats.values());
  }

  try {
    const { data, error } = await supabase.from("view_stats").select("*");
    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("loadViewStats error:", error);
    return Array.from(memoryStore.viewStats.values());
  }
}

async function incrementViewStat(pageId) {
  const normalizedPageId = normalizeText(pageId);
  if (!normalizedPageId) {
    return null;
  }

  if (!supabase) {
    const current =
      memoryStore.viewStats.get(normalizedPageId) || {
        page_id: normalizedPageId,
        cumulative_views: 0,
        active_sessions: 0,
        updated_at: new Date().toISOString(),
      };
    const next = {
      ...current,
      cumulative_views: Number(current.cumulative_views || 0) + 1,
      updated_at: new Date().toISOString(),
    };
    memoryStore.viewStats.set(normalizedPageId, next);
    return next;
  }

  try {
    const { data: existing } = await supabase
      .from("view_stats")
      .select("*")
      .eq("page_id", normalizedPageId)
      .single();

    const next = {
      page_id: normalizedPageId,
      cumulative_views: Number(existing?.cumulative_views || 0) + 1,
      active_sessions: Number(existing?.active_sessions || 0),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("view_stats").upsert(next);
    if (error) {
      throw error;
    }

    return next;
  } catch (error) {
    console.error("incrementViewStat error:", error);
    return null;
  }
}

function buildPresenceViewStatId(pageId, presenceId) {
  const normalizedPageId = normalizeText(pageId);
  const normalizedPresenceId = normalizeText(presenceId);

  if (!normalizedPageId || !normalizedPresenceId) {
    return "";
  }

  return `${normalizedPageId}::${normalizedPresenceId}`;
}

function parseViewStatPageId(rawPageId) {
  const normalized = normalizeText(rawPageId);
  const markerIndex = normalized.indexOf("::");

  if (markerIndex === -1) {
    return {
      pageId: normalized,
      presenceId: "",
      isPresence: false,
    };
  }

  return {
    pageId: normalized.slice(0, markerIndex),
    presenceId: normalized.slice(markerIndex + 2),
    isPresence: true,
  };
}

async function touchPagePresence(pageId, presenceId) {
  const statId = buildPresenceViewStatId(pageId, presenceId);
  if (!statId) {
    return null;
  }

  const now = new Date().toISOString();

  if (!supabase) {
    const current =
      memoryStore.viewStats.get(statId) || {
        page_id: statId,
        cumulative_views: 0,
        active_sessions: 1,
        updated_at: now,
      };

    const next = {
      ...current,
      active_sessions: 1,
      updated_at: now,
    };

    memoryStore.viewStats.set(statId, next);
    return next;
  }

  try {
    const next = {
      page_id: statId,
      cumulative_views: 0,
      active_sessions: 1,
      updated_at: now,
    };

    const { error } = await supabase.from("view_stats").upsert(next);
    if (error) {
      throw error;
    }

    return next;
  } catch (error) {
    console.error("touchPagePresence error:", error);
    const fallback = {
      page_id: statId,
      cumulative_views: 0,
      active_sessions: 1,
      updated_at: now,
    };
    memoryStore.viewStats.set(statId, fallback);
    return fallback;
  }
}

async function touchSessionPresence(payload) {
  const attributionId = normalizeText(payload?.attributionId);
  const sessionId = normalizeText(payload?.sessionId);
  const pageId = normalizeText(payload?.pageId);
  const stageId = normalizeText(payload?.stageId);
  const presenceId = normalizeText(payload?.presenceId);
  const currentPage = normalizeText(payload?.currentPage);
  const trackedPageId = stageId || pageId;
  const geo = normalizeGeoPoint(payload?.geo);
  const trafficTouch = normalizeTouch(payload?.trafficTouch || payload?.traffic || payload?.touch);
  const device = normalizeDeviceInfo(payload?.device || payload?.deviceInfo || payload?.device_info);
  const now = new Date().toISOString();

  if (!sessionId || !pageId) {
    return null;
  }

  await touchPagePresence(trackedPageId, presenceId);

  const current =
    (attributionId && (await loadAttributionSessionByAttributionId(attributionId))) ||
    (await loadAttributionSessionBySessionId(sessionId));

  if (!current && !attributionId) {
    return null;
  }

  const next = {
    attribution_id: current?.attribution_id || attributionId,
    session_id: sessionId,
    page_id: pageId || current?.page_id || "",
    entry_page: current?.entry_page || "",
    current_page: currentPage || current?.current_page || "",
    first_touch: current?.first_touch || null,
    last_touch: current?.last_touch || null,
    created_at: current?.created_at || now,
    updated_at: now,
  };

  if (trafficTouch && hasTouchOriginSignal(trafficTouch)) {
    const currentFirstTouch = normalizeTouch(next.first_touch);
    const currentLastTouch = normalizeTouch(next.last_touch);
    const mergedTrafficTouch = {
      ...(currentLastTouch || currentFirstTouch || {}),
      ...trafficTouch,
      capturedAt: now,
      pageId: trackedPageId || trafficTouch.pageId || pageId,
      pageUrl: currentPage || trafficTouch.pageUrl || "",
      geo: trafficTouch.geo || currentLastTouch?.geo || currentFirstTouch?.geo || null,
      accessControl: currentLastTouch?.accessControl || currentFirstTouch?.accessControl || null,
      device: device || trafficTouch.device || currentLastTouch?.device || currentFirstTouch?.device,
    };

    if (!next.first_touch) {
      next.first_touch = mergedTrafficTouch;
    }

    next.last_touch = mergedTrafficTouch;
  }

  if (geo) {
    const baseTouch =
      normalizeTouch(next.last_touch) ||
      normalizeTouch(current?.last_touch) ||
      normalizeTouch(current?.first_touch) || {
        capturedAt: now,
        pageId: trackedPageId || pageId,
        pageUrl: currentPage || "",
        path: "",
        referrer: "",
        trackingParams: {},
        meta: {},
        isMeta: false,
      };

    const geoTouch = {
      ...baseTouch,
      capturedAt: now,
      pageId: trackedPageId || baseTouch.pageId || pageId,
      pageUrl: currentPage || baseTouch.pageUrl || "",
      geo,
      accessControl: baseTouch.accessControl || null,
      device: device || baseTouch.device,
    };

    next.last_touch = geoTouch;
    if (!next.first_touch) {
      next.first_touch = geoTouch;
    }
  }

  await saveAttributionSessionRow(next);
  return next;
}

async function upsertAttributionSession(payload) {
  const attributionId = normalizeText(payload?.attributionId);
  const sessionId = normalizeText(payload?.sessionId);

  if (!attributionId || !sessionId) {
    return null;
  }

  const current =
    (await loadAttributionSessionByAttributionId(attributionId)) ||
    (await loadAttributionSessionBySessionId(sessionId));
  const firstTouch = normalizeTouch(payload?.firstTouch);
  const lastTouch = normalizeTouch(payload?.lastTouch);
  const pageId = normalizeText(payload?.pageId);
  const now = new Date().toISOString();

  const next = {
    attribution_id: attributionId,
    session_id: sessionId,
    created_at: current?.created_at || now,
    updated_at: now,
    page_id: pageId || current?.page_id || "",
    entry_page:
      normalizeText(payload?.entryPage) ||
      current?.entry_page ||
      firstTouch?.pageUrl ||
      lastTouch?.pageUrl ||
      "",
    current_page: normalizeText(payload?.currentPage) || current?.current_page || "",
    first_touch: current?.first_touch || null,
    last_touch: current?.last_touch || null,
  };

  if (
    firstTouch &&
    (hasTrackingData(firstTouch) || hasGeoSignal(firstTouch)) &&
    !next.first_touch
  ) {
    next.first_touch = firstTouch;
  }

  if (lastTouch && (hasTrackingData(lastTouch) || hasGeoSignal(lastTouch))) {
    next.last_touch = lastTouch;
  }

  if (!current?.page_id && next.page_id) {
    await incrementViewStat(next.page_id);
  } else if (current?.page_id && next.page_id && current.page_id !== next.page_id) {
    await incrementViewStat(next.page_id);
  }

  await saveAttributionSessionRow(next);
  return next;
}

async function upsertConversionIntent(payload) {
  const attributionId = normalizeText(payload?.attributionId);
  const sessionId = normalizeText(payload?.sessionId);
  const resetMatchedEvent = payload?.resetMatchedEvent === true;

  if (!attributionId || !sessionId) {
    return null;
  }

  const intents = await loadConversionIntents();
  const current =
    intents.find(
      (intent) =>
        intent.attribution_id === attributionId &&
        (!intent.matched_event_id || intent.stage !== "paid"),
    ) ||
    intents.find((intent) => intent.attribution_id === attributionId) ||
    null;
  const now = new Date().toISOString();
  const buyer = normalizeCheckoutSnapshot(payload?.buyer || current?.buyer || {});
  const amount = amountToCents(payload?.amount ?? current?.amount ?? buyer.amountCents);

  const next = {
    id: current?.id || randomUUID(),
    attribution_id: attributionId,
    session_id: sessionId,
    page_id: normalizeText(payload?.pageId) || current?.page_id || "",
    stage: normalizeText(payload?.stage) || current?.stage || "conversion_intent",
    amount,
    buyer,
    landing_page:
      normalizeText(payload?.landingPage) || current?.landing_page || "",
    first_touch: normalizeTouch(payload?.firstTouch) || current?.first_touch || null,
    last_touch: normalizeTouch(payload?.lastTouch) || current?.last_touch || null,
    page_url: normalizeText(payload?.pageUrl) || current?.page_url || "",
    created_at: current?.created_at || now,
    captured_at: normalizeIsoTimestamp(payload?.capturedAt, current?.captured_at || now),
    updated_at: now,
    matched_event_id: resetMatchedEvent ? null : current?.matched_event_id || null,
    matched_event_object_id: resetMatchedEvent
      ? null
      : current?.matched_event_object_id || null,
    matched_at: resetMatchedEvent ? null : current?.matched_at || null,
    match_method: resetMatchedEvent ? null : current?.match_method || null,
    match_score: resetMatchedEvent ? null : current?.match_score || null,
  };

  await saveConversionIntentRow(next);
  await upsertAttributionSession(payload);
  return next;
}

function extractCustomerFromPayload(payload, data) {
  return {
    name: pickFirstFilled(
      getNestedValue(data, "customer.name"),
      getNestedValue(payload, "customer.name"),
      getNestedValue(data, "client.name"),
      getNestedValue(payload, "client.name"),
      getNestedValue(data, "payer.name"),
      getNestedValue(payload, "payer.name"),
      getNestedValue(data, "buyer.name"),
      getNestedValue(payload, "buyer.name"),
    ),
    document: normalizeDigits(
      pickFirstFilled(
        getNestedValue(data, "customer.document.number"),
        getNestedValue(payload, "customer.document.number"),
        getNestedValue(data, "customer.document"),
        getNestedValue(payload, "customer.document"),
        getNestedValue(data, "customer.cpf"),
        getNestedValue(payload, "customer.cpf"),
        getNestedValue(data, "client.document"),
        getNestedValue(payload, "client.document"),
        getNestedValue(data, "payer.document"),
        getNestedValue(payload, "payer.document"),
      ),
    ),
    email: pickFirstFilled(
      getNestedValue(data, "customer.email"),
      getNestedValue(payload, "customer.email"),
      getNestedValue(data, "client.email"),
      getNestedValue(payload, "client.email"),
    ),
    phone: normalizeDigits(
      pickFirstFilled(
        getNestedValue(data, "customer.phone"),
        getNestedValue(payload, "customer.phone"),
        getNestedValue(data, "client.phone"),
        getNestedValue(payload, "client.phone"),
      ),
    ),
  };
}

function summarizeWebhookPayload(payload, rawBody = "") {
  const safePayload = ensurePlainObject(payload);
  const data = ensurePlainObject(safePayload.data);
  const customer = extractCustomerFromPayload(safePayload, data);
  const status = pickFirstFilled(
    data.status,
    safePayload.status,
    safePayload.eventStatus,
  );

  const amount = amountToCents(
    data.amount ??
      safePayload.amount ??
      data.totalAmount ??
      safePayload.totalAmount,
  );
  const paidAmount = amountToCents(
    data.paidAmount ??
      safePayload.paidAmount ??
      (isPaidStatus(status) ? amount : 0),
  );
  const refundedAmount = amountToCents(
    data.refundedAmount ??
      safePayload.refundedAmount ??
      (isRefundStatus(status) ? amount : 0),
  );

  return {
    id: randomUUID(),
    received_at: new Date().toISOString(),
    type: pickFirstFilled(safePayload.type, safePayload.event) || "transaction",
    object_id: pickFirstFilled(
      safePayload.objectId,
      safePayload.object_id,
      data.id,
      data.transactionId,
      safePayload.id,
    ),
    status,
    payment_method: pickFirstFilled(
      data.paymentMethod,
      safePayload.paymentMethod,
      data.method,
      safePayload.method,
      "pix",
    ),
    amount,
    paid_amount: paidAmount,
    refunded_amount: refundedAmount,
    external_ref: pickFirstFilled(
      data.externalRef,
      safePayload.externalRef,
      data.external_ref,
      safePayload.external_ref,
    ),
    secure_id: pickFirstFilled(data.secureId, safePayload.secureId),
    customer,
    url: pickFirstFilled(data.url, safePayload.url),
    raw: Object.keys(safePayload).length ? safePayload : { rawBody },
    pushcut_dispatches: [],
    meta_attribution: null,
  };
}

function normalizeTransactionRecord(record) {
  const source = ensurePlainObject(record);
  const status = normalizeText(source.status || source.event_status || "unknown");
  const grossAmount = amountToCents(
    source.amount ?? source.totalAmount ?? source.total_amount ?? 0,
  );
  const paidAmount = amountToCents(
    source.paidAmount ??
      source.paid_amount ??
      (isPaidStatus(status) ? grossAmount : 0),
  );
  const refundedAmount = amountToCents(
    source.refundedAmount ??
      source.refunded_amount ??
      (isRefundStatus(status) ? grossAmount : 0),
  );

  return {
    id: pickFirstFilled(
      source.id,
      source.object_id,
      source.secure_id,
      source.external_ref,
    ),
    objectId: pickFirstFilled(source.object_id, source.id),
    createdAt:
      normalizeIsoTimestamp(
        source.createdAt ||
          source.created_at ||
          source.updatedAt ||
          source.updated_at ||
          source.received_at,
      ) || new Date().toISOString(),
    status,
    amount: grossAmount,
    paidAmount,
    refundedAmount,
    paymentMethod: pickFirstFilled(
      source.paymentMethod,
      source.payment_method,
      getNestedValue(source, "paymentMethodData.type"),
      "pix",
    ),
    externalRef: pickFirstFilled(source.externalRef, source.external_ref),
    raw: source,
  };
}

function normalizeOrderProductTitle(value) {
  return normalizeText(value).toLowerCase();
}

function extractOrderItemTitles(record) {
  const source = ensurePlainObject(record);
  const rawItems = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.raw?.items)
      ? source.raw.items
      : [];

  const titles = rawItems
    .map((item) => normalizeText(item?.title || item?.name || item?.productName))
    .filter(Boolean);

  if (titles.length) {
    return titles;
  }

  const fallbackTitle = pickFirstFilled(
    source.product,
    source.productName,
    source.product_name,
    getNestedValue(source, "raw.productName"),
    getNestedValue(source, "raw.product_name"),
  );

  return fallbackTitle ? [fallbackTitle] : [];
}

function resolveOrderOriginFromTitles(titles, fallbackOrigin = "") {
  const normalizedTitles = (Array.isArray(titles) ? titles : [])
    .map((title) => normalizeOrderProductTitle(title))
    .filter(Boolean);

  if (normalizedTitles.some((title) => AMAZON_ORDER_PRODUCT_TITLES.has(title))) {
    return "amazon_drone";
  }

  if (normalizedTitles.some((title) => SHOPEE_ORDER_PRODUCT_TITLES.has(title))) {
    return "shopee";
  }

  const fallback = normalizeText(fallbackOrigin);
  if (fallback === "amazon_drone" || fallback === "shopee") {
    return fallback;
  }

  return "other";
}

function extractTransactionsTotalCount(payload, fallbackCount = 0) {
  const safe = ensurePlainObject(payload);
  const candidates = [
    safe.total,
    safe.totalCount,
    safe.count,
    getNestedValue(safe, "pagination.total"),
    getNestedValue(safe, "pagination.totalCount"),
    getNestedValue(safe, "meta.total"),
    getNestedValue(safe, "meta.totalCount"),
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return fallbackCount;
}

function findConversionIntentForTransaction(record, intents = []) {
  const normalized = normalizeTransactionRecord(record);
  const metadata = parseTransactionMetadata(record);
  const candidates = [
    normalized.id,
    normalized.objectId,
    normalized.externalRef,
    metadata.externalRef,
    metadata.external_ref,
    metadata.intentId,
    metadata.intent_id,
    metadata.conversionIntentId,
    metadata.conversion_intent_id,
    getNestedValue(record, "externalRef"),
    getNestedValue(record, "external_ref"),
    getNestedValue(record, "raw.externalRef"),
    getNestedValue(record, "raw.external_ref"),
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  return (
    (Array.isArray(intents) ? intents : []).find((intent) => {
      const intentCandidates = [
        intent?.id,
        intent?.matched_event_object_id,
        intent?.matched_event_id,
      ]
        .map((value) => normalizeText(value))
        .filter(Boolean);

      return intentCandidates.some((value) => candidates.includes(value));
    }) || null
  );
}

function buildDetailedOrderRow(record, fallbackOrigin = "", matchedIntent = null) {
  const normalized = normalizeTransactionRecord(record);
  const titles = extractOrderItemTitles(record);
  const productTitle =
    pickFirstFilled(titles[0], getNestedValue(normalized, "raw.items.0.title")) || "Venda Externa";
  const matchedBuyer = normalizeCheckoutSnapshot(matchedIntent?.buyer || {});
  const rawCustomer = ensurePlainObject(record?.customer || normalized.raw?.customer);
  const rawAddress = ensurePlainObject(rawCustomer?.address || normalized.raw?.customer?.address);
  const customerDocument = pickFirstFilled(
    rawCustomer?.document?.number,
    rawCustomer?.document,
    normalized.raw?.customer?.document?.number,
    normalized.raw?.customer?.document,
    matchedBuyer.cpf,
  );
  const pixData = ensurePlainObject(normalized.raw?.pix);
  const metadataRaw = getNestedValue(normalized.raw, "metadata");
  const metadata =
    typeof metadataRaw === "string"
      ? (() => {
          try {
            return JSON.parse(metadataRaw);
          } catch {
            return { raw: metadataRaw };
          }
        })()
      : ensurePlainObject(metadataRaw);
  const normalizeNavigableUrl = (value) => {
    const text = normalizeText(value);
    if (!text) {
      return "";
    }
    if (/^https?:\/\//i.test(text)) {
      return text;
    }
    if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(text)) {
      return `https://${text}`;
    }
    return "";
  };
  const metadataCheckoutUrl = pickFirstFilled(
    normalizeNavigableUrl(metadata?.checkout_url),
    normalizeNavigableUrl(metadata?.checkoutUrl),
  );
  const rawItems = Array.isArray(record?.items)
    ? record.items
    : Array.isArray(normalized.raw?.items)
      ? normalized.raw.items
      : Array.isArray(matchedBuyer.orderItems)
        ? matchedBuyer.orderItems
        : [];
  const items = rawItems
    .map((item) => ({
      title: normalizeText(item?.title || item?.name || item?.productName) || "Item",
      quantity: Math.max(1, Number(item?.quantity || 1) || 1),
      unitPrice: amountToCents(item?.unitPrice || item?.unit_price || 0),
      tangible: item?.tangible !== false,
    }));
  const gatewayReceiptUrl = pickFirstFilled(
    normalizeNavigableUrl(getNestedValue(normalized.raw, "pix.receiptUrl")),
    normalizeNavigableUrl(getNestedValue(normalized.raw, "pix.receipt_url")),
    normalizeNavigableUrl(getNestedValue(normalized.raw, "receiptUrl")),
    normalizeNavigableUrl(getNestedValue(normalized.raw, "receipt_url")),
  );
  const gatewaySecureUrl = pickFirstFilled(
    normalizeNavigableUrl(getNestedValue(normalized.raw, "secureUrl")),
    normalizeNavigableUrl(getNestedValue(normalized.raw, "secure_url")),
    metadataCheckoutUrl,
  );
  const tracking = {
    code: pickFirstFilled(
      matchedBuyer.trackingCode,
      matchedBuyer.tracking_code,
      getNestedValue(normalized.raw, "trackingCode"),
      getNestedValue(normalized.raw, "tracking_code"),
    ),
    url: pickFirstFilled(
      normalizeNavigableUrl(matchedBuyer.trackingUrl),
      normalizeNavigableUrl(matchedBuyer.tracking_url),
      normalizeNavigableUrl(getNestedValue(normalized.raw, "trackingUrl")),
      normalizeNavigableUrl(getNestedValue(normalized.raw, "tracking_url")),
    ),
    status: pickFirstFilled(matchedBuyer.trackingStatus, matchedBuyer.tracking_status),
    provider: pickFirstFilled(matchedBuyer.trackingProvider, matchedBuyer.tracking_provider),
    createdAt: pickFirstFilled(matchedBuyer.trackingCreatedAt, matchedBuyer.tracking_created_at),
    gatewayDeliveryStatus: pickFirstFilled(
      matchedBuyer.gatewayDeliveryStatus,
      matchedBuyer.gateway_delivery_status,
    ),
    gatewayDeliverySyncedAt: pickFirstFilled(
      matchedBuyer.gatewayDeliverySyncedAt,
      matchedBuyer.gateway_delivery_synced_at,
    ),
    gatewayDeliveryError: pickFirstFilled(
      matchedBuyer.gatewayDeliveryError,
      matchedBuyer.gateway_delivery_error,
    ),
  };

  return {
    id: pickFirstFilled(
      normalized.id,
      normalized.objectId,
      normalized.externalRef,
      getNestedValue(normalized.raw, "secureId"),
    ),
    date: normalized.createdAt,
    customer: {
      name: pickFirstFilled(rawCustomer?.name, matchedBuyer.name),
      email: pickFirstFilled(rawCustomer?.email, matchedBuyer.email),
      phone: pickFirstFilled(rawCustomer?.phone, matchedBuyer.phone),
      document: normalizeDigits(customerDocument),
    },
    amount: normalized.amount,
    status: normalized.status,
    origin: resolveOrderOriginFromTitles(titles, fallbackOrigin),
    product: productTitle,
    receipt_url: gatewayReceiptUrl,
    tracking_code: tracking.code,
    tracking_url: tracking.url,
    details: {
      transactionId: normalized.id,
      objectId: normalized.objectId,
      externalRef: normalized.externalRef,
      secureId: pickFirstFilled(
        getNestedValue(normalized.raw, "secureId"),
        getNestedValue(normalized.raw, "secure_id"),
      ),
      secureUrl: pickFirstFilled(
        gatewaySecureUrl,
      ),
      createdAt: normalized.createdAt,
      updatedAt: normalizeIsoTimestamp(
        getNestedValue(normalized.raw, "updatedAt") || getNestedValue(normalized.raw, "updated_at"),
      ),
      paidAt: normalizeIsoTimestamp(
        getNestedValue(normalized.raw, "paidAt") || getNestedValue(normalized.raw, "paid_at"),
      ),
      paymentMethod: normalized.paymentMethod,
      paidAmount: normalized.paidAmount,
      refundedAmount: normalized.refundedAmount,
      receiptUrl: gatewayReceiptUrl,
      pix: {
        qrcode: pickFirstFilled(
          getNestedValue(pixData, "qrcode"),
          getNestedValue(pixData, "qrCode"),
        ),
        receiptUrl: gatewayReceiptUrl,
        end2EndId: pickFirstFilled(
          getNestedValue(pixData, "end2EndId"),
          getNestedValue(pixData, "endToEndId"),
        ),
        expirationDate: pickFirstFilled(
          getNestedValue(pixData, "expirationDate"),
          getNestedValue(pixData, "expiration_date"),
        ),
      },
      tracking,
      customer: {
        name: pickFirstFilled(rawCustomer?.name, matchedBuyer.name),
        email: pickFirstFilled(rawCustomer?.email, matchedBuyer.email),
        phone: pickFirstFilled(rawCustomer?.phone, matchedBuyer.phone),
        document: normalizeDigits(customerDocument),
        address: {
          street: pickFirstFilled(rawAddress?.street, matchedBuyer.street, matchedBuyer.rua),
          streetNumber: pickFirstFilled(
            rawAddress?.streetNumber || rawAddress?.street_number,
            matchedBuyer.number,
            matchedBuyer.numero,
          ),
          complement: pickFirstFilled(
            rawAddress?.complement,
            matchedBuyer.complement,
            matchedBuyer.complemento,
          ),
          neighborhood: pickFirstFilled(
            rawAddress?.neighborhood,
            matchedBuyer.neighborhood,
            matchedBuyer.bairro,
          ),
          city: pickFirstFilled(rawAddress?.city, matchedBuyer.city, matchedBuyer.cidade),
          state: pickFirstFilled(rawAddress?.state, matchedBuyer.state, matchedBuyer.estado),
          zipCode: normalizeDigits(
            pickFirstFilled(rawAddress?.zipCode || rawAddress?.zip_code, matchedBuyer.zipCode, matchedBuyer.cep),
          ),
          country: normalizeText(rawAddress?.country),
        },
      },
      items,
      metadata,
      raw: normalized.raw,
    },
  };
}

function countProductStats(records, exactTitle) {
  const normalizedTitle = normalizeOrderProductTitle(exactTitle);
  const list = Array.isArray(records) ? records : [];

  return list.reduce(
    (accumulator, record) => {
      const titles = extractOrderItemTitles(record).map((title) =>
        normalizeOrderProductTitle(title),
      );

      if (!titles.includes(normalizedTitle)) {
        return accumulator;
      }

      accumulator.pixGeneratedCount += 1;

      const normalized = normalizeTransactionRecord(record);
      if (isPaidStatus(normalized.status)) {
        accumulator.paidCount += 1;
      }

      return accumulator;
    },
    {
      paidCount: 0,
      pixGeneratedCount: 0,
    },
  );
}

function parseTransactionMetadata(record) {
  const raw = ensurePlainObject(record?.raw || record);
  const metadataRaw = getNestedValue(raw, "metadata");

  if (typeof metadataRaw === "string") {
    try {
      return ensurePlainObject(JSON.parse(metadataRaw));
    } catch {
      return {};
    }
  }

  return ensurePlainObject(metadataRaw);
}

function parsePlainObjectValue(value) {
  if (typeof value === "string") {
    try {
      return ensurePlainObject(JSON.parse(value));
    } catch {
      return {};
    }
  }

  return ensurePlainObject(value);
}

function resolveWebhookEventProvider(event) {
  const raw = parsePlainObjectValue(event?.raw);
  const metadata = parsePlainObjectValue(raw.metadata);
  return normalizeGatewayProviderOrEmpty(
    pickFirstFilled(
      event?.gateway_provider,
      event?.gatewayProvider,
      event?.provider,
      raw.gateway_provider,
      raw.gatewayProvider,
      raw.provider,
      metadata.gateway_provider,
      metadata.gatewayProvider,
      metadata.provider,
    ),
  );
}

function filterWebhookEventsForGateway(events, provider) {
  const normalizedProvider = normalizeGatewayProvider(provider);
  return (Array.isArray(events) ? events : []).filter((event) => {
    const eventProvider = resolveWebhookEventProvider(event);
    return !eventProvider || eventProvider === normalizedProvider;
  });
}

function buildEventRecordFromTransaction(record, gatewayConfig, metaAttribution = null) {
  const normalized = normalizeTransactionRecord(record);
  const metadata = parseTransactionMetadata(record);
  const raw = ensurePlainObject(record?.raw || record);

  return {
    id: pickFirstFilled(normalized.id, normalized.objectId, normalized.externalRef) || randomUUID(),
    received_at: normalized.createdAt,
    type: "transaction",
    object_id: pickFirstFilled(normalized.objectId, normalized.id),
    status: normalized.status,
    payment_method: normalized.paymentMethod,
    amount: normalized.amount,
    paid_amount: normalized.paidAmount,
    refunded_amount: normalized.refundedAmount,
    external_ref: normalized.externalRef,
    secure_id: pickFirstFilled(raw.secureId, raw.secure_id),
    customer: raw.customer || null,
    url: pickFirstFilled(raw.url, raw.secureUrl, raw.secure_url),
    raw: {
      ...raw,
      metadata,
      gateway_provider: normalizeGatewayProvider(gatewayConfig?.provider),
      gateway_label: gatewayConfig?.label || "Gateway",
    },
    pushcut_dispatches: [],
    meta_attribution: metaAttribution,
  };
}

async function buildGatewayTransactionEvents(transactions, gatewayConfig) {
  const records = Array.isArray(transactions) ? transactions : [];
  if (!records.length) {
    return [];
  }

  const intents = await loadConversionIntents();
  const sessionCache = new Map();
  const events = [];

  for (const record of records) {
    const baseEvent = buildEventRecordFromTransaction(record, gatewayConfig);
    const existingMeta = ensurePlainObject(
      record?.meta_attribution ||
        record?.metaAttribution ||
        getNestedValue(record, "raw.meta_attribution") ||
        getNestedValue(record, "raw.metaAttribution"),
    );

    if (Object.keys(existingMeta).length) {
      baseEvent.meta_attribution = existingMeta;
      events.push(baseEvent);
      continue;
    }

    const matchInfo = await findMatchingConversionIntent(baseEvent, intents);
    const matchedIntent = matchInfo?.intent || null;
    let attributionSession = null;

    if (matchedIntent?.attribution_id) {
      if (!sessionCache.has(matchedIntent.attribution_id)) {
        sessionCache.set(
          matchedIntent.attribution_id,
          await loadAttributionSessionByAttributionId(matchedIntent.attribution_id),
        );
      }
      attributionSession = sessionCache.get(matchedIntent.attribution_id);
    }

    baseEvent.meta_attribution = buildMetaAttribution(
      matchedIntent,
      attributionSession,
      baseEvent,
      matchInfo,
    );
    events.push(baseEvent);
  }

  return events.sort((a, b) => new Date(b.received_at || 0) - new Date(a.received_at || 0));
}

function resolveTransactionOrigin(record, fallbackOrigin = "") {
  const metadata = parseTransactionMetadata(record);
  return resolveOrderOriginFromTitles(
    extractOrderItemTitles(record),
    pickFirstFilled(fallbackOrigin, metadata.origin, metadata.product_origin),
  );
}

function resolveTransactionProduct(record) {
  const titles = extractOrderItemTitles(record);
  return pickFirstFilled(
    titles[0],
    getNestedValue(record, "raw.items.0.title"),
    getNestedValue(record, "items.0.title"),
    getNestedValue(record, "product"),
    getNestedValue(record, "productName"),
  ) || "Venda Externa";
}

function normalizeDashboardDate(value, mode = "start") {
  const text = normalizeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const suffix =
    mode === "end" ? "T23:59:59.999-03:00" : "T00:00:00.000-03:00";
  const parsed = new Date(`${text}${suffix}`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeMetricsFilters(searchParams) {
  const origin = normalizeText(searchParams.get("origin"));

  return {
    origin:
      origin === "amazon_drone" || origin === "shopee" || origin === "other"
        ? origin
        : "all",
    dateFrom: normalizeMetricsDateValue(searchParams.get("dateFrom")),
    dateTo: normalizeMetricsDateValue(searchParams.get("dateTo")),
    startAt: normalizeDashboardDate(searchParams.get("dateFrom"), "start"),
    endAt: normalizeDashboardDate(searchParams.get("dateTo"), "end"),
  };
}

function normalizeMetricsDateValue(value) {
  const text = normalizeText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function resolveTransactionReferenceDate(record, mode = "created") {
  const normalized = normalizeTransactionRecord(record);
  const raw = ensurePlainObject(normalized.raw);

  if (mode === "paid" && isPaidStatus(normalized.status)) {
    return (
      normalizeIsoTimestamp(
        raw.paidAt || raw.paid_at || getNestedValue(raw, "payment.paidAt"),
      ) || normalized.createdAt
    );
  }

  return normalized.createdAt;
}

function matchesMetricsFilters(record, filters, mode = "created") {
  const safeFilters = filters || {};
  const origin = resolveTransactionOrigin(record);
  if (safeFilters.origin && safeFilters.origin !== "all" && origin !== safeFilters.origin) {
    return false;
  }

  const referenceDate = resolveTransactionReferenceDate(record, mode);
  const timestamp = new Date(referenceDate || 0).getTime();
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  if (safeFilters.startAt) {
    const startTime = new Date(safeFilters.startAt).getTime();
    if (Number.isFinite(startTime) && timestamp < startTime) {
      return false;
    }
  }

  if (safeFilters.endAt) {
    const endTime = new Date(safeFilters.endAt).getTime();
    if (Number.isFinite(endTime) && timestamp > endTime) {
      return false;
    }
  }

  return true;
}

function buildPendingPixStats(transactions, filters) {
  const pending = (Array.isArray(transactions) ? transactions : [])
    .filter((record) => matchesMetricsFilters(record, filters, "created"))
    .map((record) => {
      const normalized = normalizeTransactionRecord(record);
      return {
        id: normalized.id || normalized.objectId || randomUUID(),
        date: normalized.createdAt,
        amount: normalized.amount,
        status: normalized.status,
        origin: resolveTransactionOrigin(record),
        product: resolveTransactionProduct(record),
        paymentMethod: normalized.paymentMethod,
      };
    })
    .filter(
      (record) =>
        record.paymentMethod === "pix" &&
        !isPaidStatus(record.status) &&
        !isRefundStatus(record.status),
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    count: pending.length,
    totalAmount: pending.reduce((sum, item) => sum + item.amount, 0),
    items: pending.slice(0, 8),
  };
}

function buildCloneAlertStats(events) {
  const grouped = new Map();

  (Array.isArray(events) ? events : [])
    .filter((event) => normalizeText(event?.type) === cloneAlertType)
    .forEach((event) => {
      let raw = {};
      try {
        raw = ensurePlainObject(
          typeof event.raw === "string" ? JSON.parse(event.raw) : event.raw,
        );
      } catch {
        raw = {};
      }
      const domain = normalizeText(raw.domain || event.object_id);
      const href = pickFirstFilled(raw.href, raw.url, event.url);
      if (!domain) {
        return;
      }

      const current = grouped.get(domain) || {
        domain,
        href: href || `https://${domain}`,
        count: 0,
        lastSeen: event.received_at || new Date().toISOString(),
        reason: normalizeText(event.status),
      };

      current.count += 1;
      if (new Date(event.received_at || 0) > new Date(current.lastSeen || 0)) {
        current.lastSeen = event.received_at || current.lastSeen;
        current.href = href || current.href;
        current.reason = normalizeText(event.status) || current.reason;
      }

      grouped.set(domain, current);
    });

  const rows = Array.from(grouped.values()).sort(
    (a, b) => new Date(b.lastSeen) - new Date(a.lastSeen),
  );

  return {
    totalDomains: rows.length,
    rows: rows.slice(0, 10),
  };
}

function buildCloneAlertEvent(payload = {}, req) {
  const domain = normalizeText(payload.domain || payload.hostname).toLowerCase();
  const href = normalizeText(payload.href || payload.url);
  const reason = normalizeText(payload.reason) || "clone_detected";
  const userAgent = normalizeText(
    payload.userAgent || req.headers["user-agent"] || "",
  );

  return {
    id: randomUUID(),
    received_at: new Date().toISOString(),
    type: cloneAlertType,
    object_id: domain || "unknown-domain",
    status: reason,
    payment_method: "",
    amount: 0,
    paid_amount: 0,
    refunded_amount: 0,
    external_ref: normalizeText(payload.path || ""),
    secure_id: "",
    customer: null,
    url: href,
    raw: {
      domain,
      href,
      path: normalizeText(payload.path || ""),
      referrer: normalizeText(payload.referrer || req.headers.referer || ""),
      userAgent,
      canonicalOrigin: normalizeText(payload.canonicalOrigin),
      canonicalCheckoutUrl: normalizeText(payload.canonicalCheckoutUrl),
      productName: normalizeText(payload.productName),
      totalAmount: normalizeText(payload.totalAmount),
      reason,
    },
    pushcut_dispatches: [],
    meta_attribution: null,
  };
}

async function findMatchingConversionIntent(eventRecord, candidateIntents = null) {
  const intents = Array.isArray(candidateIntents)
    ? candidateIntents
    : await loadConversionIntents();
  if (!intents.length) {
    return null;
  }

  const eventTime = new Date(eventRecord.received_at).getTime();
  const eventAmount = amountToCents(eventRecord.paid_amount || eventRecord.amount);
  const eventDocument = normalizeDigits(eventRecord.customer?.document);
  const eventName = normalizeName(eventRecord.customer?.name);

  for (const intent of intents) {
    if (eventRecord.external_ref && intent.id === eventRecord.external_ref) {
      return { intent, method: "external_ref", score: 100 };
    }
  }

  for (const intent of intents) {
    if (
      eventRecord.object_id &&
      intent.matched_event_object_id &&
      String(intent.matched_event_object_id) === String(eventRecord.object_id)
    ) {
      return { intent, method: "transaction_id", score: 95 };
    }
  }

  const candidates = intents
    .map((intent) => {
      const buyer = normalizeCheckoutSnapshot(intent.buyer);
      const buyerDocument = normalizeDigits(buyer.cpf);
      const buyerName = normalizeName(buyer.name || buyer.nome);
      const amount = amountToCents(intent.amount);
      const capturedTime = new Date(intent.updated_at || intent.created_at || 0).getTime();
      const withinWindow = Number.isFinite(eventTime) &&
        Number.isFinite(capturedTime) &&
        Math.abs(eventTime - capturedTime) <= conversionMatchWindowMs;

      let score = 0;
      let method = "";

      if (eventAmount && amount && eventAmount === amount) {
        score += 45;
        method = "amount";
      }

      if (eventDocument && buyerDocument && eventDocument === buyerDocument) {
        score += 40;
        method = method ? `${method}+document` : "document";
      }

      if (eventName && buyerName && eventName === buyerName) {
        score += 25;
        method = method ? `${method}+name` : "name";
      }

      if (withinWindow) {
        score += 15;
        method = method ? `${method}+time` : "time";
      }

      return { intent, score, method, withinWindow };
    })
    .filter((item) => item.score >= 60)
    .sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

function buildMetaAttribution(intent, session, eventRecord, matchInfo) {
  const source = session || intent || {};
  const touch = selectAttributionTouch(source);
  const trackingParams = ensurePlainObject(touch?.trackingParams);
  const meta = ensurePlainObject(touch?.meta);
  const sourceValue = String(trackingParams.utm_source || "").toLowerCase();
  const mediumValue = String(trackingParams.utm_medium || "").toLowerCase();

  const isMeta =
    Boolean(touch?.isMeta) ||
    Boolean(trackingParams.fbclid) ||
    sourceValue.includes("meta") ||
    sourceValue.includes("facebook") ||
    sourceValue.includes("instagram") ||
    mediumValue.includes("paid_social") ||
    mediumValue.includes("meta");

  const campaignName = pickFirstFilled(meta.campaignName, trackingParams.utm_campaign);
  const adsetName = pickFirstFilled(meta.adsetName, trackingParams.adset_name, trackingParams.adset);
  const adName = pickFirstFilled(meta.adName, trackingParams.ad_name, trackingParams.ad);
  const creativeName = pickFirstFilled(meta.creativeName, trackingParams.creative_name, trackingParams.creative);
  const hasTrackingParams = Object.keys(trackingParams).length > 0;
  const hasMetaDetails = Boolean(campaignName || adsetName || adName || creativeName);

  let statusLabel = "Sem parâmetros capturados";
  if (isMeta && hasMetaDetails) {
    statusLabel = "Atribuída";
  } else if (isMeta || hasTrackingParams) {
    statusLabel = "Atribuição incompleta";
  } else if (touch) {
    statusLabel = "Origem não identificada";
  }

  return {
    status_label: statusLabel,
    source_is_meta: isMeta,
    has_tracking_params: hasTrackingParams,
    touch_found: Boolean(touch),
    campaign_id: normalizeText(meta.campaignId),
    campaign_name: campaignName,
    adset_id: normalizeText(meta.adsetId),
    adset_name: adsetName,
    ad_id: normalizeText(meta.adId),
    ad_name: adName,
    creative_id: normalizeText(meta.creativeId),
    creative_name: creativeName,
    utm_source: normalizeText(trackingParams.utm_source),
    utm_medium: normalizeText(trackingParams.utm_medium),
    utm_campaign: normalizeText(trackingParams.utm_campaign),
    utm_content: normalizeText(trackingParams.utm_content),
    utm_term: normalizeText(trackingParams.utm_term),
    fbclid: normalizeText(trackingParams.fbclid),
    touch_model: normalizeText(touch?.touchModel),
    captured_at: normalizeText(touch?.capturedAt),
    landing_page: normalizeText(
      intent?.landing_page || session?.entry_page || touch?.pageUrl,
    ),
    page_url: normalizeText(intent?.page_url || touch?.pageUrl),
    match_method: normalizeText(matchInfo?.method),
    match_score: Number(matchInfo?.score || 0) || 0,
    order_id: pickFirstFilled(eventRecord.object_id, eventRecord.external_ref, eventRecord.id),
  };
}

async function markConversionIntentMatched(intent, eventRecord, matchInfo) {
  if (!intent) {
    return null;
  }

  const next = {
    ...intent,
    matched_event_id: eventRecord.id,
    matched_event_object_id: eventRecord.object_id || intent.matched_event_object_id || null,
    matched_at: new Date().toISOString(),
    match_method: normalizeText(matchInfo?.method),
    match_score: Number(matchInfo?.score || 0) || intent.match_score || 0,
    stage: isPaidStatus(eventRecord.status)
      ? "paid"
      : isRefundStatus(eventRecord.status)
        ? "refunded"
        : "payment_pending",
    updated_at: new Date().toISOString(),
  };

  await saveConversionIntentRow(next);
  return next;
}

async function dispatchPushcutLink(pushcutItem, payload) {
  const webhook = pushcutItem.webhook;
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(pushcutTimeoutMs)
      : undefined;

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      deviceName: pushcutItem.name,
      webhook: pushcutItem.webhook,
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      deviceName: pushcutItem.name,
      webhook: pushcutItem.webhook,
    };
  }
}

function buildPushcutPayload(eventRecord, intent = null) {
  const orderId = pickFirstFilled(
    eventRecord.object_id,
    eventRecord.external_ref,
    intent?.id,
    eventRecord.id,
  );
  const amount = eventRecord.paid_amount || eventRecord.amount;
  const when = new Date(eventRecord.received_at).toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  const title = isPaidStatus(eventRecord.status)
    ? "Nova venda aprovada"
    : "Atualização de venda";
  const body = `Pedido #${orderId || "SEM-ID"} aprovado no valor de ${formatMoney(amount)}`;
  const detail = `Horário: ${when} | Status: ${String(eventRecord.status || "pendente").toUpperCase()}`;

  return {
    title,
    body,
    text: body,
    message: detail,
    notification: {
      title,
      body,
    },
    event: {
      id: eventRecord.id,
      orderId,
      status: eventRecord.status,
      amount,
      receivedAt: eventRecord.received_at,
    },
  };
}

async function notifyPushcutLinks(config, eventRecord, intent = null) {
  if (!isPaidStatus(eventRecord.status)) {
    return [];
  }

  const activeItems = (Array.isArray(config.pushcut?.items)
    ? config.pushcut.items
    : []
  ).filter((item) => item.active && item.webhook && isValidHttpUrl(item.webhook));

  if (!activeItems.length) {
    return [];
  }

  const payload = buildPushcutPayload(eventRecord, intent);
  return Promise.all(activeItems.map((item) => dispatchPushcutLink(item, payload)));
}

function buildTestPushcutPayload(item) {
  const receivedAt = new Date().toISOString();
  const orderId = `PUSHCUT-${Date.now().toString(36).toUpperCase()}`;
  const title = "Notificacao Pushcut";
  const body = `Teste enviado para ${item.name || "dispositivo"}.`;
  const detail = `Gerado em ${receivedAt}`;

  return {
    title,
    body,
    text: body,
    message: detail,
    notification: {
      title,
      body,
    },
    event: {
      test: true,
      device: item.name,
      orderId,
      status: "approved",
      amount: 0,
      receivedAt,
    },
  };
}

function buildSalesStats(transactions, filters = null) {
  const filteredTransactions = (Array.isArray(transactions) ? transactions : []).filter((record) =>
    matchesMetricsFilters(record, filters, "created"),
  );
  const normalized = filteredTransactions.map((record) => normalizeTransactionRecord(record));

  return {
    totalRecords: normalized.length,
    totalAmount: normalized.reduce((sum, item) => sum + item.amount, 0),
    totalPaidAmount: filteredTransactions.reduce((sum, record) => {
      const item = normalizeTransactionRecord(record);
      if (!isPaidStatus(item.status)) {
        return sum;
      }
      if (!matchesMetricsFilters(record, filters, "paid")) {
        return sum;
      }
      return sum + (item.paidAmount || item.amount);
    }, 0),
    totalRefundedAmount: normalized.reduce(
      (sum, item) => sum + (item.refundedAmount || 0),
      0,
    ),
    statusBreakdown: normalized.reduce((accumulator, item) => {
      const key = item.status || "unknown";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {}),
    paymentMethodBreakdown: normalized.reduce((accumulator, item) => {
      const key = item.paymentMethod || "pix";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {}),
    recentTransactions: normalized
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20),
  };
}

async function buildAnalyticsStats() {
  const pageIds = TRAFFIC_ANALYTICS_PAGE_IDS;
  const cumulative = Object.fromEntries(pageIds.map((pageId) => [pageId, 0]));
  const active = Object.fromEntries(pageIds.map((pageId) => [pageId, 0]));
  const presenceTotals = Object.fromEntries(pageIds.map((pageId) => [pageId, 0]));
  const uniqueActivePresenceIds = new Set();

  const viewStats = await loadViewStats();
  viewStats.forEach((row) => {
    const parsed = parseViewStatPageId(row.page_id);
    if (!parsed.pageId || !Object.prototype.hasOwnProperty.call(cumulative, parsed.pageId)) {
      return;
    }

    if (!parsed.isPresence) {
      cumulative[parsed.pageId] = Number(row.cumulative_views || 0);
    }
  });

  const cutoffTime = Date.now() - activeSessionWindowMs;
  viewStats.forEach((row) => {
    const parsed = parseViewStatPageId(row.page_id);
    if (!parsed.isPresence || !Object.prototype.hasOwnProperty.call(active, parsed.pageId)) {
      return;
    }

    presenceTotals[parsed.pageId] = (presenceTotals[parsed.pageId] || 0) + 1;

    const updatedAt = new Date(row.updated_at || 0).getTime();
    if (Number.isFinite(updatedAt) && updatedAt >= cutoffTime) {
      active[parsed.pageId] = (active[parsed.pageId] || 0) + 1;
      if (parsed.presenceId) {
        uniqueActivePresenceIds.add(parsed.presenceId);
      }
    }
  });

  pageIds.forEach((pageId) => {
    if ((presenceTotals[pageId] || 0) > (cumulative[pageId] || 0)) {
      cumulative[pageId] = presenceTotals[pageId];
    }
  });

  return {
    totalActive: uniqueActivePresenceIds.size,
    active,
    cumulative,
  };
}

function resolveLiveAccessPageLabel(session, touch) {
  const pageId = normalizeText(session?.page_id || touch?.pageId);
  const currentPage = normalizeText(session?.current_page || touch?.pageUrl).toLowerCase();
  const entryPage = normalizeText(session?.entry_page).toLowerCase();

  if (
    pageId === "landing" ||
    currentPage === "/" ||
    currentPage.endsWith("/landpagedrone.html") ||
    entryPage.endsWith("/landpagedrone.html")
  ) {
    return "Página do produto";
  }

  if (
    pageId === "shopee_bigode" ||
    currentPage.includes("shopeebigode.html")
  ) {
    return "Shopee Bigode";
  }

  if (
    pageId === "shopee_max" ||
    currentPage.includes("shopeemax.html")
  ) {
    return "Shopee Max";
  }

  if (
    pageId === "shopee_checkout" ||
    currentPage.includes("shopeecheckout.html")
  ) {
    return "Shopee Checkout";
  }

  if (pageId === "checkout_unified" || currentPage.includes("/checkout")) {
    return "Checkout";
  }

  if (pageId.startsWith("checkout_")) {
    return "Checkout";
  }

  return "Acesso rastreado";
}

function resolveLiveAccessStageLabel(session, touch) {
  const pageId = normalizeText(session?.page_id || touch?.pageId);
  const stageLabels = {
    landing: "Produto",
    checkout_unified: "Checkout aberto",
    checkout_name: "Nome preenchido",
    checkout_cpf: "CPF preenchido",
    checkout_email: "E-mail preenchido",
    checkout_phone: "Celular preenchido",
    checkout_cep: "CEP preenchido",
    checkout_street: "Endereço preenchido",
    checkout_number: "Número preenchido",
    checkout_complement: "Complemento",
    checkout_neighborhood: "Bairro preenchido",
    checkout_city: "Cidade preenchida",
    checkout_state: "Estado selecionado",
    checkout_pix_generated: "PIX gerado",
  };

  return stageLabels[pageId] || resolveLiveAccessPageLabel(session, touch);
}

async function buildLiveAccessStats() {
  const cutoffTime = Date.now() - activeSessionWindowMs;
  const sessions = await loadAttributionSessions(500);
  const latestBySession = new Map();

  sessions.forEach((session) => {
    const sessionId = normalizeText(session?.session_id);
    if (!sessionId) {
      return;
    }

    const updatedAt = new Date(session.updated_at || 0).getTime();
    if (!Number.isFinite(updatedAt) || updatedAt < cutoffTime) {
      return;
    }

    const current = latestBySession.get(sessionId);
    if (!current || new Date(current.updated_at || 0).getTime() < updatedAt) {
      latestBySession.set(sessionId, session);
    }
  });

  const rows = Array.from(latestBySession.values())
    .map((session) => {
      const lastTouch = normalizeTouch(session?.last_touch);
      const firstTouch = normalizeTouch(session?.first_touch);
      const touchWithGeo =
        (lastTouch && lastTouch.geo && lastTouch) ||
        (firstTouch && firstTouch.geo && firstTouch) ||
        null;
      const trafficTouch = selectLiveAccessOriginTouch(session);
      const trafficSource = resolveLiveAccessTrafficSource(trafficTouch);
      const accessControl = resolveStoredOrDefaultAccessControl({
        session,
        attributionId: session.attribution_id,
        sessionId: session.session_id,
      });
      const device = accessControl.device || getSessionDeviceInfo(session);

      return {
        sessionId: normalizeText(session.session_id),
        attributionId: normalizeText(session.attribution_id),
        updatedAt: session.updated_at || touchWithGeo?.capturedAt || "",
        pageLabel: resolveLiveAccessPageLabel(session, touchWithGeo),
        stageLabel: resolveLiveAccessStageLabel(session, touchWithGeo),
        currentPage: normalizeText(session.current_page || touchWithGeo?.pageUrl),
        trafficSource,
        accessControl,
        device,
        geo: touchWithGeo?.geo || null,
      };
    })
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  const mappedRows = rows
    .filter((row) => row.geo)
    .map((row) => ({
      sessionId: row.sessionId,
      attributionId: row.attributionId,
      updatedAt: row.updatedAt,
      pageLabel: row.pageLabel,
      stageLabel: row.stageLabel,
      currentPage: row.currentPage,
      trafficSource: row.trafficSource,
      accessControl: row.accessControl,
      blocked: Boolean(row.accessControl?.blocked),
      device: row.device,
      deviceType: row.device?.type || "",
      deviceLabel: row.device?.label || "",
      lat: row.geo.lat,
      lng: row.geo.lng,
      accuracy: row.geo.accuracy,
      source: row.geo.source,
      city: row.geo.city,
      region: row.geo.region,
      country: row.geo.country,
    }));

  return {
    totalActive: rows.length,
    mappedActive: mappedRows.length,
    missingLocation: Math.max(rows.length - mappedRows.length, 0),
    rows: mappedRows,
  };
}

function buildMetaAttributionStats(events) {
  const rows = (Array.isArray(events) ? events : [])
    .filter((event) => event && (isPaidStatus(event.status) || event.meta_attribution))
    .slice(0, 50)
    .map((event) => {
      const meta = ensurePlainObject(event.meta_attribution);
      const utmSummary = [
        meta.utm_source ? `source=${meta.utm_source}` : "",
        meta.utm_medium ? `medium=${meta.utm_medium}` : "",
        meta.utm_campaign ? `campaign=${meta.utm_campaign}` : "",
        meta.utm_content ? `content=${meta.utm_content}` : "",
        meta.utm_term ? `term=${meta.utm_term}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        orderId: pickFirstFilled(event.object_id, event.external_ref, event.id),
        campaign: pickFirstFilled(meta.campaign_name, meta.utm_campaign),
        adset: pickFirstFilled(meta.adset_name),
        creative: pickFirstFilled(meta.ad_name, meta.creative_name, meta.utm_content),
        utmSummary,
        fbclid: normalizeText(meta.fbclid),
        timestamp: normalizeIsoTimestamp(event.received_at, new Date().toISOString()),
        status: normalizeText(meta.status_label) || "Sem parâmetros capturados",
        matchMethod: normalizeText(meta.match_method),
        touchModel: normalizeText(meta.touch_model),
      };
    });

  return {
    rows,
    attributedCount: rows.filter((row) => row.status === "Atribuída").length,
    incompleteCount: rows.filter((row) => row.status === "Atribuição incompleta").length,
    missingCount: rows.filter((row) => row.status === "Sem parâmetros capturados").length,
    unknownCount: rows.filter((row) => row.status === "Origem não identificada").length,
  };
}

function serializeWebhookForClient(event) {
  const provider = resolveWebhookEventProvider(event);
  return {
    id: event.id,
    receivedAt: event.received_at,
    type: event.type,
    objectId: event.object_id,
    status: event.status,
    paymentMethod: event.payment_method,
    amount: event.amount,
    paidAmount: event.paid_amount,
    refundedAmount: event.refunded_amount,
    externalRef: event.external_ref,
    customer: event.customer,
    pushcutDispatches: event.pushcut_dispatches || [],
    metaAttribution: event.meta_attribution || null,
    provider,
  };
}

function createAuthHeader(config) {
  const provider = normalizeGatewayProvider(config?.provider || config?.activeGateway);

  if (provider === "primecash") {
    if (!config.secretKey) {
      const error = new Error(
        "Configure a secret key da PrimeCash no painel admin.",
      );
      error.status = 400;
      throw error;
    }

    return `Basic ${Buffer.from(`${config.secretKey}:x`).toString("base64")}`;
  }

  if (!config.publicKey || !config.secretKey) {
    const error = new Error(
      "Configure a public key e a secret key da TitansHub no painel admin.",
    );
    error.status = 400;
    throw error;
  }

  return `Basic ${Buffer.from(
    `${config.publicKey}:${config.secretKey}`,
  ).toString("base64")}`;
}

async function callTitansApi(config, pathname, options = {}) {
  const url = new URL(`https://${config.apiHost}${pathname}`);
  const searchParams = options.searchParams || {};

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      Authorization: createAuthHeader(config),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(
      typeof data === "string"
        ? data
        : data?.message ||
          `${config.label || "Gateway"} respondeu com status ${response.status}.`,
    );
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function fetchTransactionsPage(config, page = 1, pageSize = 20) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(maxPageSize, Math.max(1, Number(pageSize) || 20));

  return callTitansApi(config, "/v1/transactions", {
    method: "GET",
    searchParams: {
      page: safePage,
      pageSize: safePageSize,
    },
  });
}

function buildTransactionsCacheKey(config) {
  const host = normalizeApiHost(config?.apiHost || defaultApiHost);
  const provider = normalizeGatewayProvider(config?.provider || config?.activeGateway);
  const credential = normalizeText(config?.publicKey || config?.secretKey);
  return `${provider}:${host}:${credential}`;
}

async function fetchTransactionsForMetrics(config) {
  const cacheKey = buildTransactionsCacheKey(config);
  const cached = memoryStore.transactionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const allTransactions = [];
  let totalCount = 0;

  for (let page = 1; page <= maxMetricsPages; page += 1) {
    const salesData = await fetchTransactionsPage(config, page, maxPageSize);
    const batch = Array.isArray(salesData?.data)
      ? salesData.data
      : Array.isArray(salesData)
        ? salesData
        : [];

    if (!batch.length) {
      break;
    }

    allTransactions.push(...batch);

    totalCount = Math.max(totalCount, extractTransactionsTotalCount(salesData, allTransactions.length));

    if (batch.length < maxPageSize || (totalCount && allTransactions.length >= totalCount)) {
      break;
    }
  }

  memoryStore.transactionsCache.set(cacheKey, {
    expiresAt: Date.now() + metricsCacheTtlMs,
    data: allTransactions,
  });

  return allTransactions;
}

function unwrapTitansTransactionPayload(transaction) {
  const safe = ensurePlainObject(transaction);
  const nestedData = ensurePlainObject(safe.data);
  if (Object.keys(nestedData).length) {
    return nestedData;
  }

  const nestedTransaction = ensurePlainObject(safe.transaction);
  if (Object.keys(nestedTransaction).length) {
    return nestedTransaction;
  }

  const nestedSale = ensurePlainObject(safe.sale);
  if (Object.keys(nestedSale).length) {
    return nestedSale;
  }

  const nestedCharge = ensurePlainObject(safe.charge);
  if (Object.keys(nestedCharge).length) {
    return nestedCharge;
  }

  return safe;
}

function extractPixCode(transaction) {
  const source = unwrapTitansTransactionPayload(transaction);
  return pickFirstFilled(
    getNestedValue(source, "pix.qrcode"),
    getNestedValue(source, "pix.qrCode"),
    getNestedValue(source, "pix.copyPaste"),
    getNestedValue(source, "pix.code"),
    getNestedValue(source, "pix.payload"),
    getNestedValue(source, "pix.emv"),
    getNestedValue(source, "paymentMethodData.pix.qrcode"),
    getNestedValue(source, "paymentMethodData.pix.qrCode"),
    getNestedValue(source, "paymentMethodData.pix.copyPaste"),
    getNestedValue(source, "paymentMethodData.pix.code"),
    getNestedValue(source, "paymentMethodData.pix.payload"),
    getNestedValue(source, "paymentMethodData.pix.emv"),
    source.pix_code,
    source.pixCode,
    source.qrCode,
    source.qrcode,
    source.qr_code,
    source.copyPaste,
    source.payload,
    source.emv,
  );
}

function normalizePixTransaction(transaction) {
  const raw = ensurePlainObject(transaction);
  const safe = unwrapTitansTransactionPayload(raw);
  const id = pickFirstFilled(
    safe.id,
    safe.object_id,
    safe.secureId,
    safe.secure_id,
    raw.id,
    raw.object_id,
    raw.secureId,
    raw.secure_id,
  );

  return {
    ...raw,
    ...safe,
    id,
    status: normalizeText(pickFirstFilled(safe.status, raw.status)),
    amount: amountToCents(safe.amount ?? raw.amount),
    paymentMethod: pickFirstFilled(
      safe.paymentMethod,
      safe.payment_method,
      getNestedValue(safe, "paymentMethodData.type"),
      raw.paymentMethod,
      raw.payment_method,
      "pix",
    ),
    pix: ensurePlainObject(safe.pix),
    paymentMethodData: safe.paymentMethodData || safe.payment_method_data || {},
    pix_code: extractPixCode(safe),
  };
}

function setCookie(res, name, value, req) {
  const isSecure =
    String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";
  const flags = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=86400",
  ];

  if (isSecure) {
    flags.push("Secure");
  }

  res.setHeader("Set-Cookie", flags.join("; "));
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const body = await readRequestBody(req);

  try {
    if (req.method === "POST" && pathname === "/api/auth/login") {
      if (!hasAdminAuthConfig) {
        return res.status(200).json({
          ok: true,
          authDisabled: true,
          message:
            "Autenticacao do admin nao configurada neste ambiente. Acesse o painel diretamente.",
        });
      }

      const email = normalizeText(body.email);
      const password = normalizeText(body.password);

      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = signToken({ email, loginAt: new Date().toISOString() });
        setCookie(res, AUTH_COOKIE_NAME, token, req);
        return res.status(200).json({
          ok: true,
          message: "Login realizado com sucesso.",
        });
      }

      return res.status(401).json({
        message: "E-mail ou senha incorretos.",
      });
    }

    if (req.method === "GET" && pathname === "/api/public/config") {
      const config = await loadConfig();
      return res.status(200).json({
        ok: true,
        config: serializePublicConfig(config),
      });
    }

    if (
      req.method === "POST" &&
      (pathname === "/api/titans/webhook" || pathname === "/api/primecash/webhook")
    ) {
      const config = await loadConfig();
      const webhookProvider =
        pathname === "/api/primecash/webhook" ? "primecash" : "titanshub";
      const eventRecord = summarizeWebhookPayload(body, body?.rawBody || "");
      eventRecord.raw = {
        ...ensurePlainObject(eventRecord.raw),
        gateway_provider: webhookProvider,
      };
      const matchInfo = await findMatchingConversionIntent(eventRecord);
      const matchedIntent = matchInfo?.intent || null;
      const attributionSession =
        matchedIntent?.attribution_id
          ? await loadAttributionSessionByAttributionId(matchedIntent.attribution_id)
          : null;

      eventRecord.meta_attribution = buildMetaAttribution(
        matchedIntent,
        attributionSession,
        eventRecord,
        matchInfo,
      );

      let syncedIntent = matchedIntent;
      if (matchedIntent) {
        syncedIntent = await markConversionIntentMatched(matchedIntent, eventRecord, matchInfo);

        if (isPaidStatus(eventRecord.status)) {
          const webhookGatewayConfig =
            webhookProvider === "primecash"
              ? getPrimeCashGatewayConfig(config)
              : getTitansGatewayConfig(config);
          syncedIntent = await ensureTrackingForPaidIntent(syncedIntent, {
            status: eventRecord.status,
            eventRecord,
            gatewayConfig: webhookGatewayConfig,
          });
        }
      }

      const pushcutDispatches = await notifyPushcutLinks(
        config,
        eventRecord,
        syncedIntent,
      );
      eventRecord.pushcut_dispatches = pushcutDispatches;

      await saveWebhookEvent(eventRecord);
      return res.status(200).json({ ok: true, message: "Webhook recebido." });
    }

    if (req.method === "POST" && pathname === "/api/analytics/attribution") {
      const session = await upsertAttributionSession(body || {});
      return res.status(200).json({
        ok: true,
        attributionId: session?.attribution_id || null,
      });
    }

    if (req.method === "POST" && pathname === "/api/analytics/conversion") {
      const conversionIntent = await upsertConversionIntent(body || {});
      return res.status(200).json({
        ok: true,
        conversionIntentId: conversionIntent?.id || null,
      });
    }

    if (
      (req.method === "POST" || req.method === "GET") &&
      (pathname === "/api/analytics/ping" || pathname === "/api/analytics/ping.gif")
    ) {
      const pingPayload = readPingPayload(req, url, body);
      const touched = await touchSessionPresence(pingPayload);

      if (
        !normalizeText(pingPayload.pageId) ||
        !normalizeText(pingPayload.sessionId)
      ) {
        if (req.method === "GET" || pathname === "/api/analytics/ping.gif") {
          res.setHeader("Content-Type", "image/gif");
          res.setHeader("Cache-Control", "no-store, max-age=0");
          return res.status(400).end(trackingPixelBuffer);
        }

        return res.status(400).json({ message: "Parametros invalidos." });
      }

      if (req.method === "GET" || pathname === "/api/analytics/ping.gif") {
        res.setHeader("Content-Type", "image/gif");
        res.setHeader("Cache-Control", "no-store, max-age=0");
        return res.status(200).end(trackingPixelBuffer);
      }

      const accessControl = await resolveLiveAccessBlockState({
        attributionId: pingPayload.attributionId,
        sessionId: pingPayload.sessionId,
        device: pingPayload.device || pingPayload.deviceInfo || pingPayload.device_info,
      });

      return res.status(200).json({
        ok: true,
        touched: Boolean(touched),
        accessControl: {
          ...accessControl,
        },
      });
    }

    if (req.method === "GET" && pathname === "/api/analytics/geoip") {
      const geo = await lookupIpGeoPoint(req);
      return res.status(200).json({
        ok: true,
        geo: geo || null,
      });
    }

    if (req.method === "POST" && pathname === "/api/analytics/refine-geo") {
      const payload = ensurePlainObject(body);
      const geo = await geocodeCheckoutGeoPoint(payload, req);

      if (
        geo &&
        normalizeText(payload.sessionId) &&
        normalizeText(payload.pageId)
      ) {
        await touchSessionPresence({
          pageId: normalizeText(payload.pageId),
          stageId: normalizeText(payload.stageId),
          sessionId: normalizeText(payload.sessionId),
          presenceId: normalizeText(payload.presenceId),
          attributionId: normalizeText(payload.attributionId),
          currentPage:
            normalizeText(payload.currentPage) ||
            normalizeText(payload.pageUrl) ||
            normalizeText(payload.pageId),
          geo,
        });
      }

      return res.status(200).json({
        ok: true,
        geo: geo || null,
      });
    }

    if (req.method === "GET" && pathname === "/api/analytics/live-access") {
      const liveAccessStats = await buildLiveAccessStats();
      return res.status(200).json({
        ok: true,
        generatedAt: new Date().toISOString(),
        liveAccessStats,
      });
    }

    if (req.method === "GET" && pathname === "/api/analytics/live-access/block-status") {
      const accessControl = await resolveLiveAccessBlockState({
        attributionId: url.searchParams.get("attributionId"),
        sessionId: url.searchParams.get("sessionId"),
        deviceType: url.searchParams.get("deviceType"),
        userAgent: req.headers["user-agent"] || "",
        viewportWidth: url.searchParams.get("viewportWidth"),
      });

      return res.status(200).json({
        ok: true,
        accessControl,
      });
    }

    if (req.method === "POST" && pathname === "/api/analytics/live-access/block") {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ message: "Nao autorizado." });
      }

      const accessControl = await setLiveAccessBlockState(body || {});
      if (!accessControl) {
        return res.status(400).json({ message: "Sessao invalida." });
      }

      return res.status(200).json({
        ok: true,
        accessControl,
      });
    }

    if (
      (req.method === "GET" && pathname === "/api/clone-alert.gif") ||
      (req.method === "POST" && pathname === "/api/clone-alert")
    ) {
      const payload =
        req.method === "GET"
          ? {
              domain: url.searchParams.get("domain"),
              href: url.searchParams.get("href"),
              path: url.searchParams.get("path"),
              referrer: url.searchParams.get("referrer"),
              userAgent: req.headers["user-agent"] || "",
              canonicalOrigin: url.searchParams.get("canonicalOrigin"),
              canonicalCheckoutUrl: url.searchParams.get("canonicalCheckoutUrl"),
              productName: url.searchParams.get("productName"),
              totalAmount: url.searchParams.get("totalAmount"),
              reason: url.searchParams.get("reason"),
            }
          : body || {};

      const domain = normalizeText(payload.domain || payload.hostname);
      const href = normalizeText(payload.href || payload.url);

      if (domain || href) {
        await saveWebhookEvent(buildCloneAlertEvent(payload, req));
      }

      if (req.method === "GET") {
        res.setHeader("Content-Type", "image/gif");
        res.setHeader("Cache-Control", "no-store, max-age=0");
        return res.status(200).end(trackingPixelBuffer);
      }

      return res.status(200).json({ ok: true });
    }

    if (pathname === "/api/checkout/state") {
      const attributionId =
        url.searchParams.get("attributionId") || normalizeText(body.attributionId);
      const sessionId = normalizeText(body.sessionId);

      if (!attributionId) {
        return res.status(400).json({ message: "attributionId missing" });
      }

      if (req.method === "GET") {
        const intent = await loadLatestConversionIntentByAttributionId(attributionId);
        return res.status(200).json({
          ok: true,
          state: intent
            ? buildCheckoutState(intent, attributionId, sessionId)
            : null,
        });
      }

      if (req.method === "POST") {
        const intent = await upsertConversionIntent(body || {});
        return res.status(200).json({
          ok: true,
          intent,
          state: buildCheckoutState(intent, attributionId, sessionId),
        });
      }
    }

    if (req.method === "POST" && pathname === "/api/pix/create") {
      const config = await loadConfig();
      const gatewayConfig = getActiveGatewayConfig(config);
      const attributionId = normalizeText(body.attributionId);
      const existingIntent = attributionId
        ? await loadLatestConversionIntentByAttributionId(attributionId)
        : null;
      const sessionId =
        normalizeText(body.sessionId) ||
        normalizeText(body.session_id) ||
        normalizeText(existingIntent?.session_id);
      const buyer = mergeCheckoutSnapshots(existingIntent?.buyer || {}, body.buyer || {});
      const amount = amountToCents(
        body.amount ?? body.amountCents ?? existingIntent?.amount ?? buyer.amountCents,
      );

      if (!attributionId || !amount || !buyer.name || !buyer.cpf) {
        return res.status(400).json({
          message: "Dados incompletos para criar PIX.",
        });
      }

      const intent =
        (await upsertConversionIntent({
          attributionId,
          sessionId: sessionId || attributionId,
          pageId: normalizeText(body.pageId) || "checkout_5",
          stage: "pix_requested",
          amount,
          buyer,
          capturedAt: new Date().toISOString(),
          landingPage: normalizeText(body.landingPage),
          pageUrl: normalizeText(body.pageUrl),
        })) || {};

      const itemTitle = pickFirstFilled(
        getNestedValue(body, "items.0.title"),
        buyer.productName,
        existingIntent?.buyer?.productName,
        existingIntent?.buyer?.product_name,
        "Produto",
      );
      const itemPayload =
        Array.isArray(body.items) && body.items.length
          ? body.items.map((item) => ({
              title: normalizeText(item.title) || itemTitle,
              unitPrice: amountToCents(item.unitPrice || item.unit_price || amount),
              quantity: Math.max(1, Number(item.quantity || 1) || 1),
              tangible: item.tangible !== false,
            }))
          : [
              {
                title: itemTitle,
                unitPrice: amount,
                quantity: 1,
                tangible: true,
              },
            ];

      const shippingPayload = buildTitansShippingPayload(itemPayload, buyer);
      if (itemPayload.some((item) => item.tangible !== false) && !shippingPayload) {
        return res.status(400).json({
          message:
            gatewayConfig.provider === "primecash"
              ? "Endereco incompleto para gerar PIX da PrimeCash. Preencha rua, numero, bairro, cidade, estado e CEP no checkout."
              : "Endereco incompleto para gerar PIX da TitansHub. Preencha rua, numero, bairro, cidade, estado e CEP na fase 1.",
        });
      }

      const metadataPayload = {
        attributionId,
        sessionId: sessionId || attributionId,
        pageId: normalizeText(body.pageId) || "checkout_5",
        origin: normalizeText(body.origin) || "shopee",
      };

      const payload =
        gatewayConfig.provider === "primecash"
          ? {
              amount,
              paymentMethod: "pix",
              externalRef: intent.id,
              postbackUrl: getWebhookUrl(req, gatewayConfig.provider),
              items: itemPayload,
              customer: buildPrimeCashCustomerPayload(buyer),
              shipping: shippingPayload || undefined,
              metadata: metadataPayload,
            }
          : {
              amount,
              paymentMethod: "pix",
              externalRef: intent.id,
              postbackUrl: getWebhookUrl(req, gatewayConfig.provider),
              items: itemPayload,
              customer: buildTitansCustomerPayload(buyer),
              shipping: shippingPayload || undefined,
              metadata: JSON.stringify(metadataPayload),
            };

      const rawTransaction = await callTitansApi(gatewayConfig, "/v1/transactions", {
        method: "POST",
        body: payload,
      });
      const transaction = normalizePixTransaction(rawTransaction);

      const updatedIntent = {
        ...intent,
        buyer: {
          ...normalizeCheckoutSnapshot(intent.buyer || buyer),
          orderItems: itemPayload,
          order_items: itemPayload,
        },
        matched_event_object_id: transaction.id || intent.matched_event_object_id || null,
        stage: "payment_pending",
        updated_at: new Date().toISOString(),
      };

      await saveConversionIntentRow(updatedIntent);

      return res.status(200).json({
        ok: true,
        transaction,
        state: buildCheckoutState(updatedIntent, attributionId, sessionId || attributionId),
      });
    }

    if (req.method === "GET" && pathname.startsWith("/api/pix/status/")) {
      const config = await loadConfig();
      const gatewayConfig = getActiveGatewayConfig(config);
      const transactionId = pathname.split("/").pop();

      if (!transactionId) {
        return res.status(400).json({ message: "transactionId missing" });
      }

      const rawTransaction = await callTitansApi(
        gatewayConfig,
        `/v1/transactions/${transactionId}`,
        { method: "GET" },
      );
      const transaction = normalizePixTransaction(rawTransaction);

      if (transaction.id && isPaidStatus(transaction.status)) {
        const intents = await loadConversionIntents();
        const intent = intents.find(
          (item) => String(item.matched_event_object_id || "") === String(transaction.id),
        );

        if (intent) {
          const paidIntent = {
            ...intent,
            stage: "paid",
            matched_event_object_id: transaction.id,
            updated_at: new Date().toISOString(),
          };
          await saveConversionIntentRow(paidIntent);
          await ensureTrackingForPaidIntent(paidIntent, {
            status: transaction.status,
            transaction,
            gatewayConfig,
          });
        }
      }

      return res.status(200).json({
        ok: true,
        status: transaction.status,
        transaction,
      });
    }

    // --- NEW: Detailed Orders Route ---
    if (req.method === "GET" && pathname === "/api/admin/detailed-orders") {
      if (!isAuthenticated(req)) return res.status(401).json({ message: "Não autorizado." });

      const page = Math.max(1, parseInt(url.searchParams.get("page")) || 1);
      const limit = Math.max(1, parseInt(url.searchParams.get("limit")) || 50);
      const offset = (page - 1) * limit;
      const originFilter = normalizeText(url.searchParams.get("origin"));

      try {
        let orders = [];
        let totalCount = 0;
        const config = await loadConfig();
        const gatewayConfig = getActiveGatewayConfig(config);
        const conversionIntents = await loadConversionIntents();

        if (isGatewayConfigured(gatewayConfig)) {
          const salesData = await fetchTransactionsPage(gatewayConfig, page, limit);
          const transactions = Array.isArray(salesData?.data)
            ? salesData.data
            : Array.isArray(salesData)
              ? salesData
              : [];

          orders = transactions
            .map((transaction) =>
              buildDetailedOrderRow(
                transaction,
                "",
                findConversionIntentForTransaction(transaction, conversionIntents),
              ),
            )
            .filter((order) => !originFilter || order.origin === originFilter);

          totalCount = originFilter
            ? orders.length
            : extractTransactionsTotalCount(salesData, orders.length);
        } else {
          let events = [];

          if (supabase) {
            const { data, error } = await supabase
              .from("webhook_events")
              .select("*", { count: "exact" })
              .neq("type", cloneAlertType)
              .order("received_at", { ascending: false })
              .range(offset, offset + limit - 1);

            if (error) throw error;
            events = data || [];
          } else {
            events = Array.from(memoryStore.webhookEvents.values())
              .filter((event) => normalizeText(event?.type) !== cloneAlertType)
              .sort((a, b) => new Date(b.received_at) - new Date(a.received_at))
              .slice(offset, offset + limit);
          }

          orders = events
            .map((event) => {
              const raw =
                typeof event.raw === "string" ? JSON.parse(event.raw) : ensurePlainObject(event.raw);
              const metadata =
                typeof raw.metadata === "string"
                  ? JSON.parse(raw.metadata)
                  : ensurePlainObject(raw.metadata);

              const detailedRecord =
                {
                  id: event.id,
                  object_id: event.object_id,
                  external_ref: event.external_ref,
                  created_at: event.received_at,
                  status: event.status,
                  amount: event.amount,
                  paid_amount: event.paid_amount,
                  refunded_amount: event.refunded_amount,
                  payment_method: event.payment_method,
                  customer: event.customer,
                  items: raw.items,
                  pix: raw.pix,
                  receipt_url: raw.receipt_url || raw.data?.receipt_url || null,
                };

              return buildDetailedOrderRow(
                detailedRecord,
                metadata.origin,
                findConversionIntentForTransaction(detailedRecord, conversionIntents),
              );
            })
            .filter((order) => !originFilter || order.origin === originFilter);

          totalCount = orders.length;
        }

        return res.status(200).json({
          ok: true,
          orders,
          pagination: { page, limit, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)) }
        });
      } catch (error) {
        console.error("Detailed orders error:", error);
        return res.status(500).json({ message: "Erro ao carregar pedidos detalhados." });
      }
    }

    if (req.method === "GET" && pathname === "/api/admin/product-stats") {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ message: "Não autorizado." });
      }

      try {
        const config = await loadConfig();
        const gatewayConfig = getActiveGatewayConfig(config);
        let records = [];

        if (isGatewayConfigured(gatewayConfig)) {
          records = await fetchTransactionsForMetrics(gatewayConfig);
        } else {
          const events = await loadWebhookEvents(500);
          records = events
            .filter((event) => normalizeText(event?.type) !== cloneAlertType)
            .map((event) => {
              const raw = parsePlainObjectValue(event.raw);

              return {
                id: event.object_id || event.id,
                object_id: event.object_id,
                external_ref: event.external_ref,
                created_at: event.received_at,
                status: event.status,
                amount: event.amount,
                paid_amount: event.paid_amount,
                refunded_amount: event.refunded_amount,
                payment_method: event.payment_method,
                customer: event.customer,
                items: raw.items,
                raw,
              };
            });
        }

        return res.status(200).json({
          ok: true,
          products: {
            droneDjiMini3: {
              title: "Drone DJI Mini 3 Standard (Com tela) - DJI047",
              pageUrl: "/",
              ...countProductStats(
                records,
                "Drone DJI Mini 3 Standard (Com tela) - DJI047",
              ),
            },
            droneDjiMini4ShopeeBigode: {
              title: "Drone DJI Mini 4 Pro (Shopee Bigode)",
              pageUrl: "/ShopeeBigode.html",
              ...countProductStats(
                records,
                "Drone DJI Mini 4 Pro (Shopee Bigode)",
              ),
            },
            droneDjiMini4ShopeeMax: {
              title: "Drone DJI Mini 4 Pro (Shopee Max)",
              pageUrl: "/ShopeeMax.html",
              ...countProductStats(
                records,
                "Drone DJI Mini 4 Pro (Shopee Max)",
              ),
            },
          },
        });
      } catch (error) {
        console.error("Product stats error:", error);
        return res.status(500).json({ message: "Erro ao carregar as métricas do produto." });
      }
    }

    if (!isAuthenticated(req)) {
      return res.status(401).json({
        message: "Nao autorizado. Faca login primeiro.",
      });
    }

    if (req.method === "GET" && pathname === "/api/admin/config") {
      const config = await loadConfig();
      return res.status(200).json({
        config: serializeConfigForClient(config, req),
      });
    }

    if (req.method === "POST" && pathname === "/api/admin/config") {
      const nextConfig = await saveConfig(body || {});
      return res.status(200).json({
        config: serializeConfigForClient(nextConfig, req),
        message: "Configuracao salva.",
      });
    }

    if (req.method === "POST" && pathname === "/api/pushcut/test") {
      const item = normalizePushcutItem(body.item || {}, 0);
      const validation = validatePushcutItemsInput(item ? [item] : []);

      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const payload = buildTestPushcutPayload(validation.items[0]);
      const dispatch = await dispatchPushcutLink(validation.items[0], payload);

      if (!dispatch.ok) {
        return res.status(502).json({
          message: dispatch.error || "Falha ao enviar a notificacao de teste.",
          dispatch,
        });
      }

      return res.status(200).json({
        ok: true,
        message: `Teste enviado para ${validation.items[0].name}.`,
        dispatch,
      });
    }

    if (req.method === "GET" && pathname === "/api/titans/metrics") {
      const filters = normalizeMetricsFilters(url.searchParams);
      const config = await loadConfig();
      const gatewayConfig = getActiveGatewayConfig(config);
      const activeProvider = normalizeGatewayProvider(gatewayConfig.provider);
      const allWebhookEvents = await loadWebhookEvents(100);
      const cloneAlertEvents = allWebhookEvents.filter(
        (event) => normalizeText(event?.type) === cloneAlertType,
      );
      const webhookEvents = allWebhookEvents.filter(
        (event) => normalizeText(event?.type) !== cloneAlertType,
      );
      const gatewayWebhookEvents = filterWebhookEventsForGateway(webhookEvents, activeProvider);
      let transactions = [];
      let gatewayEvents = [];
      let remoteWarning = "";

      if (isGatewayConfigured(gatewayConfig)) {
        try {
          transactions = await fetchTransactionsForMetrics(gatewayConfig);
          gatewayEvents = await buildGatewayTransactionEvents(transactions, gatewayConfig);
        } catch (error) {
          console.error("fetchTransactionsPage error:", error);
          remoteWarning =
            error?.message ||
            "Nao foi possivel carregar as transacoes remotas agora.";
        }
      }

      if (!transactions.length) {
        transactions = gatewayWebhookEvents.map((event) => ({
          id: event.object_id || event.id,
          created_at: event.received_at,
          status: event.status,
          amount: event.amount,
          paid_amount: event.paid_amount,
          refunded_amount: event.refunded_amount,
          payment_method: event.payment_method,
          external_ref: event.external_ref,
          customer: event.customer,
          raw: event.raw,
        }));
        gatewayEvents = gatewayWebhookEvents;
      }

      const salesStats = buildSalesStats(transactions, filters);
      const pendingPixStats = buildPendingPixStats(transactions, filters);
      const analytics = await buildAnalyticsStats();
      const metricsEvents = gatewayEvents.length ? gatewayEvents : gatewayWebhookEvents;
      const filteredWebhookEvents = metricsEvents.filter((event) =>
        matchesMetricsFilters(event, filters, "created"),
      );
      const metaAttributionEvents = metricsEvents.filter((event) =>
        matchesMetricsFilters(event, filters, "created"),
      );
      const serializedWebhooks = filteredWebhookEvents.map(serializeWebhookForClient);
      const cloneAlerts = buildCloneAlertStats(cloneAlertEvents);

      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        config: serializeConfigForClient(config, req),
        filters,
        salesStats,
        pendingPixStats,
        webhookStats: {
          receivedCount: metricsEvents.length,
          recentEvents: serializedWebhooks,
          source: gatewayEvents.length ? "gateway_transactions" : "webhook_fallback",
          provider: activeProvider,
          label: gatewayConfig.label,
        },
        cloneAlerts,
        metaAttributionStats: buildMetaAttributionStats(metaAttributionEvents),
        analytics,
        transactions: salesStats.recentTransactions,
        webhooks: serializedWebhooks,
        warning: remoteWarning || null,
      });
    }

    return res.status(404).json({
      message: `Rota de API ${pathname} nao encontrada.`,
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Erro interno do servidor.",
      details: error.details || null,
    });
  }
}
