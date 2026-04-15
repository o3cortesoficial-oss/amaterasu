-- Create initial schema for Amaterasu Sales Funnel

-- Config table (singleton-ish)
CREATE TABLE IF NOT EXISTS config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attribution Sessions
CREATE TABLE IF NOT EXISTS attribution_sessions (
    attribution_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    page_id TEXT,
    entry_page TEXT,
    current_page TEXT,
    first_touch JSONB,
    last_touch JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversion Intents
CREATE TABLE IF NOT EXISTS conversion_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribution_id TEXT REFERENCES attribution_sessions(attribution_id) ON DELETE CASCADE,
    session_id TEXT,
    page_id TEXT,
    stage TEXT,
    amount NUMERIC,
    buyer JSONB,
    landing_page TEXT,
    first_touch JSONB,
    last_touch JSONB,
    page_url TEXT,
    captured_at TIMESTAMPTZ,
    matched_event_id TEXT,
    matched_event_object_id TEXT,
    matched_at TIMESTAMPTZ,
    match_method TEXT,
    match_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Events
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    received_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT,
    object_id TEXT,
    status TEXT,
    payment_method TEXT,
    amount NUMERIC,
    paid_amount NUMERIC,
    refunded_amount NUMERIC,
    external_ref TEXT,
    secure_id TEXT,
    customer JSONB,
    url TEXT,
    raw JSONB,
    pushcut_dispatches JSONB,
    meta_attribution JSONB
);

-- View Stats
CREATE TABLE IF NOT EXISTS view_stats (
    page_id TEXT PRIMARY KEY,
    cumulative_views BIGINT DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
