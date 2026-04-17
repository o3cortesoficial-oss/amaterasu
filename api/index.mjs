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
const maxStoredWebhookEvents = 250;
const maxStoredConversionIntents = 500;
const metricsPageSize = 50;
const maxPageSize = 50;
const pushcutTimeoutMs = 8000;
const conversionMatchWindowMs = 12 * 60 * 60 * 1000;
const activeSessionWindowMs = 2 * 60 * 1000;
const trackingPixelBuffer = Buffer.from(
  "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64",
);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "saidlabsglobal@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "530348Home10";
const AUTH_COOKIE_NAME = "amz_admin_session";
const JWT_SECRET =
  process.env.JWT_SECRET || "amazon-seller-central-secret-key-123";
const runtimeConfigApiHost = process.env.TITANSHUB_API_HOST || "";
const runtimeConfigPublicKey = process.env.TITANSHUB_PUBLIC_KEY || "";
const runtimeConfigSecretKey = process.env.TITANSHUB_SECRET_KEY || "";
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

const memoryStore = {
  config: null,
  attributionSessions: new Map(),
  conversionIntents: new Map(),
  webhookEvents: new Map(),
  viewStats: new Map(),
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
      sessionId: url.searchParams.get("sessionId") || "",
      presenceId: url.searchParams.get("presenceId") || "",
      attributionId: url.searchParams.get("attributionId") || "",
      currentPage: url.searchParams.get("currentPage") || "",
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
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

function createDefaultConfig() {
  return {
    apiHost: normalizeApiHost(defaultApiHost),
    publicKey: "",
    secretKey: "",
    pixels: {
      metaPixelId: [],
      googleTagManagerId: [],
      googleAdsId: [],
      tiktokPixelId: [],
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
    apiHost: normalizeApiHost(source.apiHost || base.apiHost),
    publicKey:
      typeof source.publicKey === "string" ? source.publicKey.trim() : base.publicKey,
    secretKey:
      typeof source.secretKey === "string" ? source.secretKey.trim() : base.secretKey,
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
      tiktokPixelId:
        "tiktokPixelId" in ensurePlainObject(source.pixels)
          ? normalizeMultilineList(source?.pixels?.tiktokPixelId)
          : normalizeMultilineList(base?.pixels?.tiktokPixelId),
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
    },
    base,
  );
}

async function readLocalConfigFile() {
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
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64");
  return `${data}.${signature}`;
}

function verifyToken(token) {
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

function getWebhookUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  return `${protocol}://${host}/api/titans/webhook`;
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

  const next = {
    apiHost: normalizeApiHost(input?.apiHost || current.apiHost),
    publicKey:
      typeof input?.publicKey === "string" ? input.publicKey.trim() : current.publicKey,
    secretKey:
      typeof input?.secretKey === "string" && input.secretKey.trim()
        ? input.secretKey.trim()
        : current.secretKey,
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
      tiktokPixelId:
        "tiktokPixelId" in nextPixelsInput
          ? normalizeMultilineList(nextPixelsInput.tiktokPixelId)
          : current.pixels.tiktokPixelId,
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
    if (!persisted && isServerlessRuntime && !hasRuntimeTitansConfig()) {
      const error = new Error(
        "Nao foi possivel persistir a configuracao da TitansHub neste deploy. Configure SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL com SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY, ou use TITANSHUB_PUBLIC_KEY + TITANSHUB_SECRET_KEY nas Environment Variables da Vercel.",
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
    if (!persisted && isServerlessRuntime && !hasRuntimeTitansConfig()) {
      const storageError = new Error(
        "Nao foi possivel persistir a configuracao da TitansHub neste deploy. Configure SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL com SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY, ou use TITANSHUB_PUBLIC_KEY + TITANSHUB_SECRET_KEY nas Environment Variables da Vercel.",
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

  return {
    apiHost: config.apiHost,
    publicKey: config.publicKey,
    hasSecretKey: Boolean(config.secretKey),
    secretKeyMasked: config.secretKey ? "••••••••••••" : "",
    isConfigured: Boolean(config.publicKey && config.secretKey),
    pixels: config.pixels,
    pushcut: {
      items: pushcutItems,
      count: pushcutItems.length,
      activeCount: pushcutItems.filter((item) => item.active !== false).length,
    },
    updatedAt: config.updatedAt,
    webhookUrl: getWebhookUrl(req),
  };
}

function serializePublicConfig(config) {
  return {
    pixels: {
      metaPixelId: config.pixels?.metaPixelId || [],
      googleTagManagerId: config.pixels?.googleTagManagerId || [],
      googleAdsId: config.pixels?.googleAdsId || [],
      tiktokPixelId: config.pixels?.tiktokPixelId || [],
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
  const presenceId = normalizeText(payload?.presenceId);
  const currentPage = normalizeText(payload?.currentPage);
  const now = new Date().toISOString();

  if (!sessionId || !pageId) {
    return null;
  }

  await touchPagePresence(pageId, presenceId);

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

  if (firstTouch && hasTrackingData(firstTouch) && !next.first_touch) {
    next.first_touch = firstTouch;
  }

  if (lastTouch && hasTrackingData(lastTouch)) {
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

async function findMatchingConversionIntent(eventRecord) {
  const intents = await loadConversionIntents();
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
  const title = "Nova venda recebida";
  const body = "Venda teste aprovada no valor de R$ 197,90";
  const detail = "Pedido #TESTE123 | Origem: Demo";

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
      orderId: "TESTE123",
      status: "approved",
      amount: 19790,
      receivedAt: new Date().toISOString(),
    },
  };
}

function buildSalesStats(transactions) {
  const normalized = transactions.map((record) => normalizeTransactionRecord(record));

  return {
    totalRecords: normalized.length,
    totalAmount: normalized.reduce((sum, item) => sum + item.amount, 0),
    totalPaidAmount: normalized.reduce(
      (sum, item) => sum + (isPaidStatus(item.status) ? item.paidAmount || item.amount : 0),
      0,
    ),
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
  const pageIds = [
    "landing",
    "checkout_1",
    "checkout_2",
    "checkout_3",
    "checkout_4",
    "checkout_5",
  ];

  const cumulative = Object.fromEntries(pageIds.map((pageId) => [pageId, 0]));
  const active = Object.fromEntries(pageIds.map((pageId) => [pageId, 0]));

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

    const updatedAt = new Date(row.updated_at || 0).getTime();
    if (Number.isFinite(updatedAt) && updatedAt >= cutoffTime) {
      active[parsed.pageId] = (active[parsed.pageId] || 0) + 1;
    }
  });

  return {
    totalActive: Object.values(active).reduce((sum, value) => sum + value, 0),
    active,
    cumulative,
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
  };
}

function createAuthHeader(config) {
  if (!config.publicKey || !config.secretKey) {
    const error = new Error(
      "Configure a public key e a secret key do TitansHub no painel admin.",
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
        : data?.message || `TitansHub respondeu com status ${response.status}.`,
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

    if (req.method === "POST" && pathname === "/api/titans/webhook") {
      const config = await loadConfig();
      const eventRecord = summarizeWebhookPayload(body, body?.rawBody || "");
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

      if (matchedIntent) {
        await markConversionIntentMatched(matchedIntent, eventRecord, matchInfo);
      }

      const pushcutDispatches = await notifyPushcutLinks(
        config,
        eventRecord,
        matchedIntent,
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

      return res.status(200).json({
        ok: true,
        touched: Boolean(touched),
      });
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
          state: buildCheckoutState(intent, attributionId, sessionId),
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
        "Drone Profissional 4K Amazon",
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
            "Endereco incompleto para gerar PIX da TitansHub. Preencha rua, numero, bairro, cidade, estado e CEP na fase 1.",
        });
      }

      const payload = {
        amount,
        paymentMethod: "pix",
        externalRef: intent.id,
        postbackUrl: getWebhookUrl(req),
        items: itemPayload,
        customer: buildTitansCustomerPayload(buyer),
        shipping: shippingPayload || undefined,
        metadata: JSON.stringify({
          attributionId,
          sessionId: sessionId || attributionId,
          pageId: normalizeText(body.pageId) || "checkout_5",
        }),
      };

      const rawTransaction = await callTitansApi(config, "/v1/transactions", {
        method: "POST",
        body: payload,
      });
      const transaction = normalizePixTransaction(rawTransaction);

      const updatedIntent = {
        ...intent,
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
      const transactionId = pathname.split("/").pop();

      if (!transactionId) {
        return res.status(400).json({ message: "transactionId missing" });
      }

      const rawTransaction = await callTitansApi(
        config,
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
          await saveConversionIntentRow({
            ...intent,
            stage: "paid",
            matched_event_object_id: transaction.id,
            updated_at: new Date().toISOString(),
          });
        }
      }

      return res.status(200).json({
        ok: true,
        status: transaction.status,
        transaction,
      });
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
      const config = await loadConfig();
      const webhookEvents = await loadWebhookEvents(50);
      let transactions = [];
      let remoteWarning = "";

      if (config.publicKey && config.secretKey) {
        try {
          const salesData = await fetchTransactionsPage(config, 1, metricsPageSize);
          const payload = Array.isArray(salesData?.data)
            ? salesData.data
            : Array.isArray(salesData)
              ? salesData
              : [];
          transactions = payload;
        } catch (error) {
          console.error("fetchTransactionsPage error:", error);
          remoteWarning =
            error?.message ||
            "Nao foi possivel carregar as transacoes remotas agora.";
        }
      }

      if (!transactions.length) {
        transactions = webhookEvents.map((event) => ({
          id: event.object_id || event.id,
          created_at: event.received_at,
          status: event.status,
          amount: event.amount,
          paid_amount: event.paid_amount,
          refunded_amount: event.refunded_amount,
          payment_method: event.payment_method,
          external_ref: event.external_ref,
        }));
      }

      const salesStats = buildSalesStats(transactions);
      const analytics = await buildAnalyticsStats();
      const serializedWebhooks = webhookEvents.map(serializeWebhookForClient);

      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        config: serializeConfigForClient(config, req),
        salesStats,
        webhookStats: {
          receivedCount: webhookEvents.length,
          recentEvents: serializedWebhooks,
        },
        metaAttributionStats: buildMetaAttributionStats(webhookEvents),
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
