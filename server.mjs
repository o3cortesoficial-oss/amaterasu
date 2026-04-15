import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { extname, join, normalize, resolve } from "node:path";
import { URL } from "node:url";

const root = resolve(process.cwd());
const host = "127.0.0.1";
const port = 3000;
const rootPage = "Landpagedrone.html";
const adminPage = "admin.html";
const adminDataDir = join(root, ".admin-data");
const configFile = join(adminDataDir, "titans-config.json");
const eventsFile = join(adminDataDir, "titans-webhook-events.json");
const defaultApiHost = "api.shieldtecnologia.com";
const maxStoredWebhookEvents = 250;
const maxMetricsPages = 20;
const metricsPageSize = 50;
const maxPageSize = 50;
const pushcutTimeoutMs = 8000;
const sessionTimeoutMs = 45000; // 45 seconds to consider session inactive
const viewStatsFile = join(adminDataDir, "view-stats.json");
const attributionSessionsFile = join(adminDataDir, "meta-attribution-sessions.json");
const conversionIntentsFile = join(adminDataDir, "meta-conversion-intents.json");
const maxStoredConversionIntents = 500;
const conversionMatchWindowMs = 12 * 60 * 60 * 1000;

let activeSessions = new Map(); // sessionId -> { pageId, lastSeen }

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function ensureAdminDataDir() {
  if (!existsSync(adminDataDir)) {
    mkdirSync(adminDataDir, { recursive: true });
  }
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  ensureAdminDataDir();
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeApiHost(value) {
  const normalized = String(value || defaultApiHost)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/g, "");

  return normalized || defaultApiHost;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
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

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
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

  return {
    ok: true,
    items: normalized,
  };
}

function loadConfig() {
  const data = readJsonFile(configFile, {});

  return {
    apiHost: normalizeApiHost(data.apiHost),
    publicKey: String(data.publicKey || ""),
    secretKey: String(data.secretKey || ""),
    pixels: {
      metaPixelId: normalizeMultilineList(data?.pixels?.metaPixelId),
      googleTagManagerId: normalizeMultilineList(data?.pixels?.googleTagManagerId),
      googleAdsId: normalizeMultilineList(data?.pixels?.googleAdsId),
      tiktokPixelId: normalizeMultilineList(data?.pixels?.tiktokPixelId),
      headTag: typeof data?.pixels?.headTag === "string" ? data.pixels.headTag : "",
      bodyTag: typeof data?.pixels?.bodyTag === "string" ? data.pixels.bodyTag : "",
    },
    pushcut: {
      items: normalizePushcutItems(
        data?.pushcut?.items || data?.pushcut?.urls || data?.pushcutUrls || [],
      ),
    },
    updatedAt: data.updatedAt || null,
  };
}

function saveConfig(input) {
  const current = loadConfig();
  const nextPixelsInput =
    input && typeof input.pixels === "object" && input.pixels ? input.pixels : {};
  const nextPushcutInput =
    input && typeof input.pushcut === "object" && input.pushcut ? input.pushcut : {};
  const next = {
    apiHost: normalizeApiHost(input.apiHost || current.apiHost),
    publicKey:
      typeof input.publicKey === "string"
        ? input.publicKey.trim()
        : current.publicKey,
    secretKey:
      typeof input.secretKey === "string" && input.secretKey.trim()
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

  writeJsonFile(configFile, next);
  return next;
}

function loadWebhookEvents() {
  const data = readJsonFile(eventsFile, []);
  return Array.isArray(data) ? data : [];
}

function saveWebhookEvents(events) {
  writeJsonFile(eventsFile, events.slice(0, maxStoredWebhookEvents));
}

function loadAttributionSessions() {
  const data = readJsonFile(attributionSessionsFile, {});
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function saveAttributionSessions(sessions) {
  writeJsonFile(attributionSessionsFile, sessions);
}

function loadConversionIntents() {
  const data = readJsonFile(conversionIntentsFile, []);
  return Array.isArray(data) ? data : [];
}

function saveConversionIntents(intents) {
  writeJsonFile(conversionIntentsFile, intents.slice(0, maxStoredConversionIntents));
}

function ensurePlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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

function pickFirstFilled(...values) {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) {
      return normalized;
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

function normalizeTouch(touch) {
  if (!touch || typeof touch !== "object") {
    return null;
  }

  const trackingParams = ensurePlainObject(touch.trackingParams);
  const meta = ensurePlainObject(touch.meta);

  return {
    capturedAt: normalizeText(touch.capturedAt) || new Date().toISOString(),
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

function selectAttributionTouch(attribution) {
  const firstTouch = normalizeTouch(attribution?.firstTouch);
  const lastTouch = normalizeTouch(attribution?.lastTouch);

  // O modelo persistido guarda first touch e last touch; para exibicao da venda
  // priorizamos o last touch quando ha sinal de Meta e usamos first touch como fallback.
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

function normalizeBuyerPayload(buyer) {
  const payload = ensurePlainObject(buyer);

  return {
    name: normalizeText(payload.name),
    fullAddress: normalizeText(payload.fullAddress),
    cpf: normalizeDigits(payload.cpf),
    phone: normalizeDigits(payload.phone),
    zipCode: normalizeDigits(payload.zipCode),
    city: normalizeText(payload.city),
    state: normalizeText(payload.state),
  };
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

function upsertAttributionSession(payload) {
  const attributionId = normalizeText(payload?.attributionId);
  const sessionId = normalizeText(payload?.sessionId);

  if (!attributionId || !sessionId) {
    return null;
  }

  const sessions = loadAttributionSessions();
  const current = ensurePlainObject(sessions[attributionId]);
  const firstTouch = normalizeTouch(payload?.firstTouch);
  const lastTouch = normalizeTouch(payload?.lastTouch);
  const next = {
    attributionId,
    sessionId,
    createdAt: current.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pageId: normalizeText(payload?.pageId) || current.pageId || "",
    entryPage:
      normalizeText(payload?.entryPage) ||
      current.entryPage ||
      firstTouch?.pageUrl ||
      lastTouch?.pageUrl ||
      "",
    currentPage: normalizeText(payload?.currentPage) || current.currentPage || "",
    firstTouch: current.firstTouch || null,
    lastTouch: current.lastTouch || null,
  };

  if (firstTouch && hasTrackingData(firstTouch) && !next.firstTouch) {
    next.firstTouch = firstTouch;
  }

  if (lastTouch && hasTrackingData(lastTouch)) {
    next.lastTouch = lastTouch;
  }

  sessions[attributionId] = next;
  saveAttributionSessions(sessions);
  return next;
}

function upsertConversionIntent(payload) {
  const attributionId = normalizeText(payload?.attributionId);
  const sessionId = normalizeText(payload?.sessionId);

  if (!attributionId || !sessionId) {
    return null;
  }

  const intents = loadConversionIntents();
  const existingIndex = intents.findIndex(
    (intent) => intent.attributionId === attributionId && !intent.matchedEventId,
  );
  const current = existingIndex >= 0 ? intents[existingIndex] : {};
  const now = new Date().toISOString();
  const next = {
    id: current.id || randomUUID(),
    attributionId,
    sessionId,
    pageId: normalizeText(payload?.pageId) || current.pageId || "",
    stage: normalizeText(payload?.stage) || current.stage || "conversion_intent",
    amount: Number(payload?.amount || current.amount || 0) || 0,
    buyer: normalizeBuyerPayload(payload?.buyer || current.buyer),
    landingPage:
      normalizeText(payload?.landingPage) || current.landingPage || "",
    firstTouch: normalizeTouch(payload?.firstTouch) || current.firstTouch || null,
    lastTouch: normalizeTouch(payload?.lastTouch) || current.lastTouch || null,
    pageUrl: normalizeText(payload?.pageUrl) || current.pageUrl || "",
    createdAt: current.createdAt || now,
    capturedAt: normalizeText(payload?.capturedAt) || current.capturedAt || now,
    updatedAt: now,
    matchedEventId: current.matchedEventId || null,
    matchedEventObjectId: current.matchedEventObjectId || null,
    matchedAt: current.matchedAt || null,
    matchMethod: current.matchMethod || null,
    matchScore: current.matchScore || null,
  };

  if (existingIndex >= 0) {
    intents[existingIndex] = next;
  } else {
    intents.unshift(next);
  }

  saveConversionIntents(intents);
  upsertAttributionSession(payload);
  return next;
}

function getOrigin(request) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const protocol =
    typeof forwardedProto === "string" && forwardedProto.trim()
      ? forwardedProto.split(",")[0].trim()
      : "http";
  const requestHost = request.headers.host || `${host}:${port}`;
  return `${protocol}://${requestHost}`;
}

function getWebhookUrl(request) {
  return `${getOrigin(request)}/api/titans/webhook`;
}

function serializeConfigForClient(config, request) {
  const pushcutItems = Array.isArray(config.pushcut?.items)
    ? config.pushcut.items
    : [];

  return {
    apiHost: config.apiHost,
    publicKey: config.publicKey,
    hasSecretKey: Boolean(config.secretKey),
    isConfigured: Boolean(config.publicKey && config.secretKey),
    pixels: config.pixels,
    pushcut: {
      items: pushcutItems,
      count: pushcutItems.length,
      activeCount: pushcutItems.filter((item) => item.active !== false).length,
    },
    updatedAt: config.updatedAt,
    webhookUrl: getWebhookUrl(request),
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendFile(filePath, response) {
  const ext = extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[ext] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;

    request.on("data", (chunk) => {
      totalSize += chunk.length;

      if (totalSize > 1024 * 1024) {
        reject(new Error("Corpo da requisicao excedeu 1MB."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");

      if (!raw) {
        resolve({ raw: "", json: null });
        return;
      }

      try {
        resolve({ raw, json: JSON.parse(raw) });
      } catch {
        resolve({ raw, json: null });
      }
    });

    request.on("error", reject);
  });
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

async function callTitansApi(pathname, options = {}) {
  const config = loadConfig();
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
  let data;

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

async function fetchTransactionsPage(page = 1, pageSize = 20) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(
    maxPageSize,
    Math.max(1, Number(pageSize) || 20),
  );

  return callTitansApi("/v1/transactions", {
    method: "GET",
    searchParams: {
      page: safePage,
      pageSize: safePageSize,
    },
  });
}

async function fetchTransactionsForMetrics() {
  let currentPage = 1;
  let totalPages = 1;
  let pagination = null;
  const transactions = [];

  while (currentPage <= totalPages && currentPage <= maxMetricsPages) {
    const payload = await fetchTransactionsPage(currentPage, metricsPageSize);
    const pageTransactions = Array.isArray(payload?.data) ? payload.data : [];

    pagination = pagination || payload?.pagination || null;
    totalPages = Number(payload?.pagination?.totalPages || 1);
    transactions.push(...pageTransactions);
    currentPage += 1;
  }

  return {
    pagination,
    totalPages,
    truncated: totalPages > maxMetricsPages,
    transactions,
  };
}

function summarizeWebhookPayload(payload, rawBody) {
  const data =
    payload && typeof payload === "object" && payload.data && typeof payload.data === "object"
      ? payload.data
      : payload && typeof payload === "object"
        ? payload
        : {};
  const customer = extractCustomerFromPayload(payload, data);

  return {
    id: randomUUID(),
    receivedAt: new Date().toISOString(),
    type: payload?.type || payload?.event || "transaction",
    objectId: payload?.objectId || data.id || null,
    status: data.status || null,
    paymentMethod: data.paymentMethod || null,
    amount: Number(data.amount || 0) || 0,
    paidAmount: Number(data.paidAmount || 0) || 0,
    refundedAmount: Number(data.refundedAmount || 0) || 0,
    externalRef: data.externalRef || null,
    secureId: data.secureId || null,
    customer,
    url: payload?.url || data.postbackUrl || null,
    raw: payload && typeof payload === "object" ? payload : { rawBody },
  };
}

function formatAmountForMessage(cents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(cents) || 0) / 100);
}

function getEventOrderIdentifier(eventRecord) {
  return pickFirstFilled(
    eventRecord?.externalRef,
    eventRecord?.objectId,
    eventRecord?.secureId,
    eventRecord?.id,
  );
}

function formatPushcutStatus(status) {
  const normalized = normalizeText(status).toLowerCase();

  if (!normalized) {
    return "atualizada";
  }

  if (/(approved|paid|pago)/i.test(normalized)) {
    return "aprovada";
  }

  if (/(pending|waiting|aguardando|espera)/i.test(normalized)) {
    return "pendente";
  }

  if (/(cancel|canceled|cancelled)/i.test(normalized)) {
    return "cancelada";
  }

  if (/(refused|refusada|negada)/i.test(normalized)) {
    return "recusada";
  }

  if (/(refund|refunded|estornada)/i.test(normalized)) {
    return "estornada";
  }

  return normalized.replace(/[_-]+/g, " ");
}

function formatPushcutDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createPushcutPayload(eventRecord) {
  const orderId = getEventOrderIdentifier(eventRecord);
  const statusLabel = formatPushcutStatus(eventRecord.status);
  const amountLabel = formatAmountForMessage(
    eventRecord.amount || eventRecord.paidAmount || 0,
  );
  const occurredAt = formatPushcutDateTime(eventRecord.receivedAt);
  const mainMessage = [
    orderId ? `Pedido #${orderId} ${statusLabel}` : `Venda ${statusLabel}`,
    `no valor de ${amountLabel}`,
  ].join(" ");
  const details = [
    occurredAt ? `Data ${occurredAt}` : null,
    eventRecord.paymentMethod
      ? `Pagamento ${String(eventRecord.paymentMethod).toUpperCase()}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    title: statusLabel === "aprovada" ? "Nova venda aprovada" : "Atualizacao de venda",
    text: mainMessage,
    body: mainMessage,
    message: mainMessage,
    subtitle: details,
    details,
    event: {
      id: eventRecord.id,
      type: eventRecord.type,
      objectId: eventRecord.objectId,
      status: eventRecord.status,
      paymentMethod: eventRecord.paymentMethod,
      amount: eventRecord.amount,
      paidAmount: eventRecord.paidAmount,
      refundedAmount: eventRecord.refundedAmount,
      externalRef: eventRecord.externalRef,
      secureId: eventRecord.secureId,
      receivedAt: eventRecord.receivedAt,
    },
  };
}

function createPushcutTestPayload(pushcutItem) {
  const body = "Venda teste aprovada no valor de R$ 197,90";
  const details = "Pedido #TESTE123 | Origem: Demo";

  return {
    title: "Nova venda recebida",
    text: `${body} | ${details}`,
    body,
    message: body,
    subtitle: details,
    device: {
      id: pushcutItem.id,
      name: pushcutItem.name,
    },
    event: {
      id: "TESTE123",
      type: "pushcut_test",
      status: "approved",
      amount: 19790,
      externalRef: "TESTE123",
      receivedAt: new Date().toISOString(),
      origin: "Demo",
    },
  };
}

async function fetchWithTimeout(url, options) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(pushcutTimeoutMs),
  });
}

async function dispatchPushcutLink(pushcutItem, payload) {
  const webhook = pushcutItem.webhook;

  try {
    const postResponse = await fetchWithTimeout(webhook, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (postResponse.ok) {
      return {
        id: pushcutItem.id,
        name: pushcutItem.name,
        webhook,
        url: webhook,
        active: pushcutItem.active !== false,
        ok: true,
        method: "POST",
        status: postResponse.status,
      };
    }

    const getResponse = await fetchWithTimeout(webhook, { method: "GET" });

    return {
      id: pushcutItem.id,
      name: pushcutItem.name,
      webhook,
      url: webhook,
      active: pushcutItem.active !== false,
      ok: getResponse.ok,
      method: "GET",
      status: getResponse.status,
      fallbackFromPost: true,
    };
  } catch (error) {
    try {
      const getResponse = await fetchWithTimeout(webhook, { method: "GET" });

      return {
        id: pushcutItem.id,
        name: pushcutItem.name,
        webhook,
        url: webhook,
        active: pushcutItem.active !== false,
        ok: getResponse.ok,
        method: "GET",
        status: getResponse.status,
        fallbackAfterError: true,
      };
    } catch (fallbackError) {
      return {
        id: pushcutItem.id,
        name: pushcutItem.name,
        webhook,
        url: webhook,
        active: pushcutItem.active !== false,
        ok: false,
        method: "GET",
        status: null,
        error: fallbackError.message || error.message,
      };
    }
  }
}

async function notifyPushcutLinks(config, eventRecord) {
  const activeItems = (Array.isArray(config.pushcut?.items)
    ? config.pushcut.items
    : []
  ).filter(
    (item) => item.active !== false && item.webhook && isValidHttpUrl(item.webhook),
  );

  if (!activeItems.length) {
    return [];
  }

  const payload = createPushcutPayload(eventRecord);
  const results = await Promise.all(
    activeItems.map((item) => dispatchPushcutLink(item, payload)),
  );

  return results;
}

function createBreakdown(items, selector) {
  return items.reduce((accumulator, item) => {
    const key = selector(item) || "unknown";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function buildSalesStats(remoteData) {
  const transactions = remoteData?.transactions || [];

  return {
    totalRecords: Number(remoteData?.pagination?.totalRecords || transactions.length),
    loadedRecords: transactions.length,
    totalAmount: transactions.reduce(
      (sum, transaction) => sum + (Number(transaction.amount || 0) || 0),
      0,
    ),
    totalPaidAmount: transactions.reduce(
      (sum, transaction) => sum + (Number(transaction.paidAmount || 0) || 0),
      0,
    ),
    totalRefundedAmount: transactions.reduce(
      (sum, transaction) => sum + (Number(transaction.refundedAmount || 0) || 0),
      0,
    ),
    statusBreakdown: createBreakdown(transactions, (transaction) => transaction.status),
    paymentMethodBreakdown: createBreakdown(
      transactions,
      (transaction) => transaction.paymentMethod,
    ),
    truncated: Boolean(remoteData?.truncated),
    recentTransactions: [...transactions]
      .sort((left, right) => {
        const leftDate = new Date(left.updatedAt || left.createdAt || 0).getTime();
        const rightDate = new Date(right.updatedAt || right.createdAt || 0).getTime();
        return rightDate - leftDate;
      })
      .slice(0, 20),
  };
}

function buildWebhookStats(events) {
  const pushcutDispatches = events.flatMap((event) =>
    Array.isArray(event.pushcutDispatches) ? event.pushcutDispatches : [],
  );

  return {
    receivedCount: events.length,
    statusBreakdown: createBreakdown(events, (event) => event.status),
    paymentMethodBreakdown: createBreakdown(events, (event) => event.paymentMethod),
    pushcutSuccessCount: pushcutDispatches.filter((dispatch) => dispatch.ok).length,
    pushcutFailureCount: pushcutDispatches.filter((dispatch) => !dispatch.ok).length,
    recentEvents: events.slice(0, 25),
  };
}

function formatUtmSummary(touch) {
  const trackingParams = ensurePlainObject(touch?.trackingParams);
  const summary = [
    trackingParams.utm_source ? `source=${trackingParams.utm_source}` : null,
    trackingParams.utm_medium ? `medium=${trackingParams.utm_medium}` : null,
    trackingParams.utm_campaign ? `campaign=${trackingParams.utm_campaign}` : null,
    trackingParams.utm_content ? `content=${trackingParams.utm_content}` : null,
    trackingParams.utm_term ? `term=${trackingParams.utm_term}` : null,
    trackingParams.fbclid ? `fbclid=${trackingParams.fbclid}` : null,
  ].filter(Boolean);

  return summary.join(" | ");
}

function buildAttributionStatus(intent, selectedTouch) {
  if (!intent) {
    return "Sem parametros capturados";
  }

  if (!selectedTouch || !hasTrackingData(selectedTouch)) {
    return "Sem parametros capturados";
  }

  if (!hasMetaSignals(selectedTouch)) {
    return "Origem nao identificada";
  }

  const meta = ensurePlainObject(selectedTouch.meta);
  const campaign = meta.campaignName || selectedTouch.trackingParams?.utm_campaign;
  const adset = meta.adsetName || meta.adsetId;
  const creative =
    meta.adName ||
    meta.creativeName ||
    selectedTouch.trackingParams?.utm_content ||
    meta.adId;

  if (campaign && adset && creative) {
    return selectedTouch.touchModel === "last_touch"
      ? "Atribuida via last touch"
      : "Atribuida via first touch";
  }

  return "Atribuicao incompleta";
}

function buildMetaAttributionRecord(eventRecord, intent, matchInfo) {
  const selectedTouch = selectAttributionTouch(intent);
  const meta = ensurePlainObject(selectedTouch?.meta);
  const trackingParams = ensurePlainObject(selectedTouch?.trackingParams);

  return {
    attributionId: intent?.attributionId || null,
    intentId: intent?.id || null,
    touchModel: selectedTouch?.touchModel || null,
    matchMethod: matchInfo?.methods?.join(" + ") || null,
    matchScore: matchInfo?.score || null,
    status: buildAttributionStatus(intent, selectedTouch),
    campaign: meta.campaignName || trackingParams.utm_campaign || meta.campaignId || "",
    adset: meta.adsetName || meta.adsetId || "",
    creative:
      meta.adName ||
      meta.creativeName ||
      trackingParams.utm_content ||
      meta.adId ||
      meta.creativeId ||
      "",
    utmSummary: formatUtmSummary(selectedTouch),
    fbclid: trackingParams.fbclid || "",
    landingPage: intent?.landingPage || selectedTouch?.pageUrl || "",
    capturedAt: selectedTouch?.capturedAt || intent?.capturedAt || eventRecord.receivedAt,
    trackingParams,
  };
}

function calculateIntentMatch(eventRecord, intent) {
  let score = 0;
  const methods = [];
  const eventAmount = Number(eventRecord.paidAmount || eventRecord.amount || 0) || 0;
  const intentAmount = Number(intent.amount || 0) || 0;

  if (eventAmount && intentAmount && eventAmount === intentAmount) {
    score += 40;
    methods.push("amount_exact");
  } else if (eventAmount && intentAmount && Math.abs(eventAmount - intentAmount) <= 100) {
    score += 20;
    methods.push("amount_close");
  }

  const eventTime = new Date(eventRecord.receivedAt).getTime();
  const intentTime = new Date(intent.capturedAt || intent.updatedAt || intent.createdAt).getTime();
  const delta = eventTime - intentTime;

  if (Number.isFinite(delta) && delta >= 0 && delta <= conversionMatchWindowMs) {
    score += Math.max(8, 30 - Math.floor(delta / (30 * 60 * 1000)));
    methods.push("time_window");
  }

  const eventDocument = normalizeDigits(eventRecord.customer?.document);
  const intentDocument = normalizeDigits(intent.buyer?.cpf);
  if (eventDocument && intentDocument && eventDocument === intentDocument) {
    score += 60;
    methods.push("document");
  }

  const eventName = normalizeName(eventRecord.customer?.name);
  const intentName = normalizeName(intent.buyer?.name);
  if (eventName && intentName && eventName === intentName) {
    score += 25;
    methods.push("name_exact");
  } else if (
    eventName &&
    intentName &&
    (eventName.includes(intentName) || intentName.includes(eventName))
  ) {
    score += 10;
    methods.push("name_partial");
  }

  if (eventRecord.externalRef && intent.externalRef && eventRecord.externalRef === intent.externalRef) {
    score += 120;
    methods.push("external_ref");
  }

  return { score, methods };
}

function matchConversionIntentToEvent(eventRecord) {
  const intents = loadConversionIntents();
  const eventOrderKey = eventRecord.objectId || eventRecord.externalRef || eventRecord.secureId || null;
  const reusedIntent = intents.find(
    (intent) => eventOrderKey && intent.matchedEventObjectId === eventOrderKey,
  );

  if (reusedIntent) {
    return {
      intent: reusedIntent,
      score: reusedIntent.matchScore || 100,
      methods: reusedIntent.matchMethod
        ? reusedIntent.matchMethod.split(" + ")
        : ["existing_order_link"],
    };
  }

  const candidates = intents
    .filter((intent) => !intent.matchedEventId)
    .map((intent) => ({
      intent,
      ...calculateIntentMatch(eventRecord, intent),
    }))
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];
  if (!best || best.score < 45) {
    return null;
  }

  const updatedIntents = intents.map((intent) => {
    if (intent.id !== best.intent.id) {
      return intent;
    }

    return {
      ...intent,
      matchedEventId: eventRecord.id,
      matchedEventObjectId:
        eventOrderKey,
      matchedAt: new Date().toISOString(),
      matchMethod: best.methods.join(" + "),
      matchScore: best.score,
    };
  });

  saveConversionIntents(updatedIntents);
  return best;
}

function enrichWebhookEvent(eventRecord) {
  if (eventRecord.metaAttribution) {
    return eventRecord;
  }

  const match = matchConversionIntentToEvent(eventRecord);
  eventRecord.metaAttribution = buildMetaAttributionRecord(
    eventRecord,
    match?.intent || null,
    match || null,
  );
  return eventRecord;
}

function enrichWebhookEvents(events) {
  let changed = false;
  const enriched = events.map((event) => {
    if (event.metaAttribution) {
      return event;
    }

    changed = true;
    return enrichWebhookEvent(event);
  });

  if (changed) {
    saveWebhookEvents(enriched);
  }

  return enriched;
}

function buildMetaAttributionStats(events) {
  const latestByOrder = new Map();
  const sortedEvents = [...events].sort((left, right) => {
    return new Date(right.receivedAt || 0).getTime() - new Date(left.receivedAt || 0).getTime();
  });

  for (const event of sortedEvents) {
    const orderKey = event.objectId || event.externalRef || event.secureId || event.id;
    if (!latestByOrder.has(orderKey)) {
      latestByOrder.set(orderKey, event);
    }
  }

  const rows = Array.from(latestByOrder.values())
    .slice(0, 50)
    .map((event) => ({
      orderId: event.objectId || event.externalRef || event.secureId || event.id,
      campaign: event.metaAttribution?.campaign || "",
      adset: event.metaAttribution?.adset || "",
      creative: event.metaAttribution?.creative || "",
      utmSummary: event.metaAttribution?.utmSummary || "",
      timestamp: event.receivedAt,
      status: event.metaAttribution?.status || "Sem parametros capturados",
      touchModel: event.metaAttribution?.touchModel || null,
      matchMethod: event.metaAttribution?.matchMethod || null,
      fbclid: event.metaAttribution?.fbclid || "",
      paymentStatus: event.status || "",
    }));

  return {
    totalRows: rows.length,
    attributedCount: rows.filter((row) => row.status.includes("Atribuida")).length,
    incompleteCount: rows.filter((row) => row.status === "Atribuicao incompleta").length,
    missingCount: rows.filter((row) => row.status === "Sem parametros capturados").length,
    unknownCount: rows.filter((row) => row.status === "Origem nao identificada").length,
    rows,
  };
}

async function handleApiRequest(request, response, url) {
  const config = loadConfig();

  if (request.method === "GET" && url.pathname === "/api/admin/config") {
    sendJson(response, 200, {
      config: serializeConfigForClient(config, request),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/config") {
    const { json } = await parseRequestBody(request);
    const nextPayload =
      json && typeof json === "object" && !Array.isArray(json) ? { ...json } : {};

    if (
      nextPayload.pushcut &&
      typeof nextPayload.pushcut === "object" &&
      !Array.isArray(nextPayload.pushcut)
    ) {
      if (Array.isArray(nextPayload.pushcut.items)) {
        const validation = validatePushcutItemsInput(nextPayload.pushcut.items);

        if (!validation.ok) {
          sendJson(response, 400, {
            message: validation.message,
          });
          return;
        }

        nextPayload.pushcut = {
          items: validation.items,
        };
      } else if (Array.isArray(nextPayload.pushcut.urls)) {
        nextPayload.pushcut = {
          items: normalizePushcutItems(nextPayload.pushcut.urls),
        };
      }
    }

    const nextConfig = saveConfig(nextPayload);

    sendJson(response, 200, {
      config: serializeConfigForClient(nextConfig, request),
      message: "Configuracao salva com sucesso.",
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/pushcut/test") {
    const { json } = await parseRequestBody(request);
    const sourceItem =
      json && typeof json === "object" && !Array.isArray(json) && json.item
        ? json.item
        : json;
    const validation = validatePushcutItemsInput([sourceItem || {}]);

    if (!validation.ok) {
      sendJson(response, 400, {
        ok: false,
        message: validation.message,
      });
      return;
    }

    const [item] = validation.items;
    const payload = createPushcutTestPayload(item);
    const result = await dispatchPushcutLink(item, payload);

    sendJson(response, result.ok ? 200 : 502, {
      ok: result.ok,
      item,
      result,
      payloadPreview: {
        title: payload.title,
        text: payload.text,
        subtitle: payload.subtitle,
      },
      message: result.ok
        ? `Notificacao de teste enviada para ${item.name}.`
        : `Falha ao enviar notificacao de teste para ${item.name}.`,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/titans/health") {
    try {
      const payload = await fetchTransactionsPage(1, 1);

      sendJson(response, 200, {
        ok: true,
        message: "Conexao com o TitansHub validada com sucesso.",
        apiHost: config.apiHost,
        pagination: payload?.pagination || null,
      });
    } catch (error) {
      sendJson(response, error.status || 502, {
        ok: false,
        message: error.message,
        details: error.details || null,
      });
    }

    return;
  }

  if (request.method === "GET" && url.pathname === "/api/titans/transactions") {
    try {
      const payload = await fetchTransactionsPage(
        url.searchParams.get("page"),
        url.searchParams.get("pageSize"),
      );

      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, error.status || 502, {
        message: error.message,
        details: error.details || null,
      });
    }

    return;
  }

  if (request.method === "GET" && url.pathname === "/api/titans/webhooks") {
    const events = loadWebhookEvents();
    const limit = Math.max(1, Number(url.searchParams.get("limit")) || 25);

    sendJson(response, 200, {
      events: events.slice(0, limit),
      total: events.length,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/titans/webhook") {
    const { json, raw } = await parseRequestBody(request);
    const events = loadWebhookEvents();
    const eventRecord = enrichWebhookEvent(summarizeWebhookPayload(json, raw));
    const pushcutDispatches = await notifyPushcutLinks(config, eventRecord);

    eventRecord.pushcutDispatches = pushcutDispatches;

    saveWebhookEvents([eventRecord, ...events]);

    sendJson(response, 200, {
      ok: true,
      message: "Webhook recebido com sucesso.",
      eventId: eventRecord.id,
      pushcutDispatches,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/analytics/attribution") {
    const { json } = await parseRequestBody(request);
    const session = upsertAttributionSession(json || {});

    if (!session) {
      sendJson(response, 400, {
        message: "Parametros invalidos para atribuicao.",
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      attributionId: session.attributionId,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/analytics/conversion") {
    const { json } = await parseRequestBody(request);
    const conversionIntent = upsertConversionIntent(json || {});

    if (!conversionIntent) {
      sendJson(response, 400, {
        message: "Parametros invalidos para conversao.",
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      conversionIntentId: conversionIntent.id,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/titans/metrics") {
    const webhookEvents = enrichWebhookEvents(loadWebhookEvents());
    const webhookStats = buildWebhookStats(webhookEvents);
    const metaAttributionStats = buildMetaAttributionStats(webhookEvents);
    let salesStats = null;
    let upstreamError = null;

    if (config.publicKey && config.secretKey) {
      try {
        const remoteData = await fetchTransactionsForMetrics();
        salesStats = buildSalesStats(remoteData);
      } catch (error) {
        upstreamError = {
          message: error.message,
          status: error.status || 502,
          details: error.details || null,
        };
      }
    } else {
      upstreamError = {
        message:
          "Configure a public key e a secret key para consultar as metricas do TitansHub.",
        status: 400,
      };
    }

    sendJson(response, 200, {
      generatedAt: new Date().toISOString(),
      config: serializeConfigForClient(config, request),
      salesStats,
      webhookStats,
      metaAttributionStats,
      analytics: buildAnalyticsStats(),
      transactions: salesStats?.recentTransactions || [],
      webhooks: webhookStats?.recentEvents || [],
      upstreamError,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/analytics/ping") {
    const { json } = await parseRequestBody(request);
    const { pageId, sessionId } = json || {};
    
    if (pageId && sessionId) {
      activeSessions.set(sessionId, { pageId, lastSeen: Date.now() });
      incrementCumulativeView(pageId);
      sendJson(response, 200, { ok: true });
    } else {
      sendJson(response, 400, { message: "Parametros invalidos." });
    }
    return;
  }

  sendJson(response, 404, {
    message: "Rota de API nao encontrada.",
  });
}

function incrementCumulativeView(pageId) {
  const stats = readJsonFile(viewStatsFile, { cumulative: {} });
  if (!stats.cumulative) stats.cumulative = {};
  stats.cumulative[pageId] = (stats.cumulative[pageId] || 0) + 1;
  writeJsonFile(viewStatsFile, stats);
}

function buildAnalyticsStats() {
  const now = Date.now();
  const stats = readJsonFile(viewStatsFile, { cumulative: {} });
  
  // Clean up stale sessions
  for (const [sid, data] of activeSessions.entries()) {
    if (now - data.lastSeen > sessionTimeoutMs) {
      activeSessions.delete(sid);
    }
  }

  const activeByPage = {};
  for (const [sid, data] of activeSessions.entries()) {
    activeByPage[data.pageId] = (activeByPage[data.pageId] || 0) + 1;
  }

  return {
    active: activeByPage,
    cumulative: stats.cumulative || {},
    totalActive: activeSessions.size
  };
}

createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
    const requestPath = decodeURIComponent(requestUrl.pathname);

    if (requestPath === "/admin" || requestPath === "/admin/") {
      sendFile(join(root, adminPage), response);
      return;
    }

    if (requestPath.startsWith("/api/")) {
      await handleApiRequest(request, response, requestUrl);
      return;
    }

    const normalizedPath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(root, normalizedPath);

    if (requestPath === "/") {
      filePath = join(root, rootPage);
    }

    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, "index.html");
    }

    if (!existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    sendFile(filePath, response);
  } catch (error) {
    sendJson(response, error.status || 500, {
      message: error.message || "Erro interno do servidor.",
      details: error.details || null,
    });
  }
}).listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
