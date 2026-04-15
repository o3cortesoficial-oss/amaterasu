import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nlawvbnenzyjknmsqlwa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYXd2Ym5lbnp5amtubXNxbHdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI2ODc1NywiZXhwIjoyMDkxODQ0NzU3fQ.EhpYOTo0h2WIgR1Qy4HSvXktgBh-cOqEJMgyl7rT0qk";

const supabase = createClient(supabaseUrl, supabaseKey);

const defaultApiHost = "api.shieldtecnologia.com";
const maxStoredWebhookEvents = 250;
const maxMetricsPages = 20;
const metricsPageSize = 50;
const maxPageSize = 50;
const pushcutTimeoutMs = 8000;
const maxStoredConversionIntents = 500;
const conversionMatchWindowMs = 12 * 60 * 60 * 1000;

let activeSessions = new Map(); // Note: Volatile in serverless, but kept for compatibility logic

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

async function loadConfig() {
  const { data, error } = await supabase
    .from("config")
    .select("data")
    .eq("id", "default")
    .single();

  const configData = data?.data || {};

  return {
    apiHost: normalizeApiHost(configData.apiHost),
    publicKey: String(configData.publicKey || ""),
    secretKey: String(configData.secretKey || ""),
    pixels: {
      metaPixelId: normalizeMultilineList(configData?.pixels?.metaPixelId),
      googleTagManagerId: normalizeMultilineList(configData?.pixels?.googleTagManagerId),
      googleAdsId: normalizeMultilineList(configData?.pixels?.googleAdsId),
      tiktokPixelId: normalizeMultilineList(configData?.pixels?.tiktokPixelId),
      headTag: typeof configData?.pixels?.headTag === "string" ? configData.pixels.headTag : "",
      bodyTag: typeof configData?.pixels?.bodyTag === "string" ? configData.pixels.bodyTag : "",
    },
    pushcut: {
      items: normalizePushcutItems(
        configData?.pushcut?.items || configData?.pushcut?.urls || configData?.pushcutUrls || [],
      ),
    },
    updatedAt: configData.updatedAt || null,
  };
}

async function saveConfig(input) {
  const current = await loadConfig();
  const nextPixelsInput =
    input && typeof input.pixels === "object" && input.pixels ? input.pixels : {};
  const nextPushcutInput =
    input && typeof input.pushcut === "object" && input.pushcut ? input.pushcut : {};
  const nextData = {
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

  await supabase.from("config").upsert({ id: "default", data: nextData });
  return nextData;
}

async function loadWebhookEvents(limit = maxStoredWebhookEvents) {
  const { data, error } = await supabase
    .from("webhook_events")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(limit);

  return data || [];
}

async function saveWebhookEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return;
  
  const event = events[0];
  const { error } = await supabase.from("webhook_events").upsert(event);
  if (error) console.error("Error saving webhook event:", error);
}

async function loadConversionIntents() {
  const { data, error } = await supabase
    .from("conversion_intents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(maxStoredConversionIntents);

  return data || [];
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

async function upsertAttributionSession(payload) {
  const attributionId = normalizeText(payload?.attributionId);
  const sessionId = normalizeText(payload?.sessionId);

  if (!attributionId || !sessionId) {
    return null;
  }

  const { data: currentRecord } = await supabase
    .from("attribution_sessions")
    .select("*")
    .eq("attribution_id", attributionId)
    .single();

  const current = ensurePlainObject(currentRecord);
  const firstTouch = normalizeTouch(payload?.firstTouch);
  const lastTouch = normalizeTouch(payload?.lastTouch);
  
  const next = {
    attribution_id: attributionId,
    session_id: sessionId,
    created_at: current.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    page_id: normalizeText(payload?.pageId) || current.page_id || "",
    entry_page:
      normalizeText(payload?.entryPage) ||
      current.entry_page ||
      firstTouch?.pageUrl ||
      lastTouch?.pageUrl ||
      "",
    current_page: normalizeText(payload?.currentPage) || current.current_page || "",
    first_touch: current.first_touch || null,
    last_touch: current.last_touch || null,
  };

  if (firstTouch && hasTrackingData(firstTouch) && !next.first_touch) {
    next.first_touch = firstTouch;
  }

  if (lastTouch && hasTrackingData(lastTouch)) {
    next.last_touch = lastTouch;
  }

  await supabase.from("attribution_sessions").upsert(next);
  return next;
}

async function upsertConversionIntent(payload) {
  const attributionId = normalizeText(payload?.attributionId);
  const sessionId = normalizeText(payload?.sessionId);

  if (!attributionId || !sessionId) {
    return null;
  }

  const intents = await loadConversionIntents();
  const existingIndex = intents.findIndex(
    (intent) => intent.attribution_id === attributionId && !intent.matched_event_id,
  );
  const current = existingIndex >= 0 ? intents[existingIndex] : {};
  const now = new Date().toISOString();
  const next = {
    id: current.id || randomUUID(),
    attribution_id: attributionId,
    session_id: sessionId,
    page_id: normalizeText(payload?.pageId) || current.page_id || "",
    stage: normalizeText(payload?.stage) || current.stage || "conversion_intent",
    amount: Number(payload?.amount || current.amount || 0) || 0,
    buyer: normalizeBuyerPayload(payload?.buyer || current.buyer),
    landing_page:
      normalizeText(payload?.landingPage) || current.landing_page || "",
    first_touch: normalizeTouch(payload?.firstTouch) || current.first_touch || null,
    last_touch: normalizeTouch(payload?.lastTouch) || current.last_touch || null,
    page_url: normalizeText(payload?.pageUrl) || current.page_url || "",
    created_at: current.created_at || now,
    captured_at: normalizeText(payload?.capturedAt) || current.captured_at || now,
    updated_at: now,
    matched_event_id: current.matched_event_id || null,
    matched_event_object_id: current.matched_event_object_id || null,
    matched_at: current.matched_at || null,
    match_method: current.match_method || null,
    match_score: current.match_score || null,
  };

  await supabase.from("conversion_intents").upsert(next);
  await upsertAttributionSession(payload);
  return next;
}

function getWebhookUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  return `${protocol}://${host}/api/titans/webhook`;
}

function serializeConfigForClient(config, req) {
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
    webhookUrl: getWebhookUrl(req),
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

async function fetchTransactionsPage(config, page = 1, pageSize = 20) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(
    maxPageSize,
    Math.max(1, Number(pageSize) || 20),
  );

  return callTitansApi(config, "/v1/transactions", {
    method: "GET",
    searchParams: {
      page: safePage,
      pageSize: safePageSize,
    },
  });
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
    raw: payload && typeof payload === "object" ? payload : { rawBody },
  };
}

async function dispatchPushcutLink(pushcutItem, payload) {
  const webhook = pushcutItem.webhook;

  try {
    const postResponse = await fetch(webhook, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(pushcutTimeoutMs),
    });

    return { ok: postResponse.ok, status: postResponse.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function notifyPushcutLinks(config, eventRecord) {
  const activeItems = (Array.isArray(config.pushcut?.items)
    ? config.pushcut.items
    : []
  ).filter(
    (item) => item.active && item.webhook && isValidHttpUrl(item.webhook),
  );

  if (!activeItems.length) return [];

  const payload = {
    title: "Nova venda recebida",
    body: `Venda no valor de R$ ${(eventRecord.amount / 100).toFixed(2)}`,
    event: eventRecord
  };

  return Promise.all(
    activeItems.map((item) => dispatchPushcutLink(item, payload)),
  );
}

function buildSalesStats(transactions) {
  return {
    loadedRecords: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + (Number(t.amount || 0)), 0),
    statusBreakdown: transactions.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {}),
    recentTransactions: transactions.slice(0, 20),
  };
}

async function buildAnalyticsStats() {
  const { data } = await supabase.from("view_stats").select("*");
  return { rows: data || [] };
}

function buildMetaAttributionStats(events) {
  return {
    rows: events.slice(0, 50).map(e => ({
      orderId: e.objectId || e.id,
      status: e.metaAttribution?.status || "Pendente",
      timestamp: e.receivedAt
    }))
  };
}

// Catch-all Handler for /api/*
export default async function handler(req, res) {
  const config = await loadConfig();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Set default response headers
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    // Analytics & Internal Tracking
    if (req.method === "POST" && pathname === "/api/analytics/attribution") {
      const session = await upsertAttributionSession(req.body || {});
      return res.status(200).json({ ok: true, attributionId: session?.attribution_id });
    }

    if (req.method === "POST" && pathname === "/api/analytics/conversion") {
      const conversionIntent = await upsertConversionIntent(req.body || {});
      return res.status(200).json({ ok: true, conversionIntentId: conversionIntent?.id });
    }

    if (req.method === "POST" && pathname === "/api/analytics/ping") {
      const { pageId, sessionId } = req.body || {};
      if (pageId && sessionId) {
        // Ping logic here (omitted memory Map for serverless, consider Supabase update if needed)
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ message: "Parametros invalidos." });
    }

    // Admin API
    if (req.method === "GET" && pathname === "/api/admin/config") {
      return res.status(200).json({ config: serializeConfigForClient(config, req) });
    }

    if (req.method === "POST" && pathname === "/api/admin/config") {
      const nextConfig = await saveConfig(req.body);
      return res.status(200).json({ config: serializeConfigForClient(nextConfig, req), message: "Configuracao salva." });
    }

    // TitansHub Webhook
    if (req.method === "POST" && pathname === "/api/titans/webhook") {
      const eventRecord = summarizeWebhookPayload(req.body, JSON.stringify(req.body));
      const pushcutDispatches = await notifyPushcutLinks(config, eventRecord);
      eventRecord.pushcutDispatches = pushcutDispatches;
      await saveWebhookEvents([eventRecord]);
      return res.status(200).json({ ok: true, message: "Webhook recebido." });
    }

    // Dashboard Metrics
    if (req.method === "GET" && pathname === "/api/titans/metrics") {
      const webhookEvents = await loadWebhookEvents(50);
      const salesData = await fetchTransactionsPage(config, 1, 50);
      const salesStats = buildSalesStats(salesData.data || []);
      
      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        config: serializeConfigForClient(config, req),
        salesStats,
        webhookStats: { recentEvents: webhookEvents },
        metaAttributionStats: buildMetaAttributionStats(webhookEvents),
        analytics: await buildAnalyticsStats(),
        transactions: salesStats.recentTransactions,
        webhooks: webhookEvents
      });
    }

    // 404 for other API routes
    return res.status(404).json({ message: `Rota de API ${pathname} nao encontrada.` });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Erro interno do servidor.",
      details: error.details || null
    });
  }
}
