import { v4 as uuidv4 } from "uuid";

import { analyticsEmitter } from "../lib/analyticsEmitter";
import { config } from "../lib/config";
import { DbAdapter } from "../lib/dbAdapter";
import { logger } from "../lib/logger";

let db: DbAdapter | null = null;
const getDb = (): DbAdapter => {
  if (!db) {
    db = new DbAdapter();
  }
  return db;
};

const EVENT_TABLE_INIT = `
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  type TEXT NOT NULL,
  event_type TEXT,
  event_category TEXT,
  event_label TEXT,
  event_value REAL,
  page TEXT,
  referrer TEXT,
  landing_page TEXT,
  metadata TEXT,
  details TEXT,
  is_owner INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL
);
`;

async function ensureAnalyticsTable(): Promise<void> {
  if (!config.analyticsEnabled) {
    logger.info("[Analytics] Skipping table init (ANALYTICS_ENABLED=false)");
    return;
  }

  try {
    // 1. Ensure table exists (basic structure)
    await getDb().exec(EVENT_TABLE_INIT);

    // 2. Robust migration: Try to add columns if they are missing (idempotent via catch)
    // This handles cases where the table was created with an older schema
    const migrations = [
      "ALTER TABLE analytics_events ADD COLUMN type TEXT",
      "ALTER TABLE analytics_events ADD COLUMN is_owner INTEGER DEFAULT 0",
      "ALTER TABLE analytics_events ADD COLUMN session_id TEXT",
      "ALTER TABLE analytics_events ADD COLUMN details TEXT",
      "ALTER TABLE analytics_events ADD COLUMN page TEXT",
      "ALTER TABLE analytics_events ADD COLUMN referrer TEXT",
      "ALTER TABLE analytics_events ADD COLUMN landing_page TEXT",
      "ALTER TABLE analytics_events ADD COLUMN event_type TEXT",
      "ALTER TABLE analytics_events ADD COLUMN event_category TEXT",
      "ALTER TABLE analytics_events ADD COLUMN event_label TEXT",
      "ALTER TABLE analytics_events ADD COLUMN event_value REAL",
      "ALTER TABLE analytics_events ADD COLUMN metadata TEXT"
    ];

    for (const sql of migrations) {
      try {
        await getDb().exec(sql);
      } catch (err) {
        // Ignore "duplicate column name" error (code varies by driver, checking message safe enough)
        // Libsql/SQLite usually throws "duplicate column name: ..."
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("duplicate column name")) {
          // Log only unexpected errors, but don't crash
          // logger.warn("Migration warning (safe to ignore if column exists):", err.message);
        }
      }
    }

    // 3. Create indices
    await getDb().exec("CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC)");
    await getDb().exec("CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(type)");
    await getDb().exec("CREATE INDEX IF NOT EXISTS idx_analytics_events_owner ON analytics_events(is_owner)");
    await getDb().exec("CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id)");
  } catch (err) {
    logger.error("Failed to ensure analytics schema", err);
    throw err;
  }
}

if (config.analyticsEnabled) {
  ensureAnalyticsTable().catch((err) => {
    logger.error("Analytics table initialization failure", err);
  });
} else {
  logger.info("[Analytics] Disabled; schema init not executed");
}

type AnalyticsEventType = "visit" | "pageview" | "event" | "session";

export interface AnalyticsSummary {
  totalVisits: number;
  totalEvents: number;
  totalSessions: number;
  totalOptimizations: number;
  uniqueUsers: number;
  ownerVisits: number;
  ownerEvents: number;
  topPages: Array<{ page: string; count: number }>;
  topEvents: Array<{ eventType: string; count: number }>;
  recentActivity: RecentActivity[];
}

export interface RecentActivity {
  type: "pageview" | "event" | "session";
  timestamp: string;
  details: string;
  isOwner: boolean;
}

interface AnalyticsEventPayload {
  type: AnalyticsEventType;
  sessionId?: string;
  userId?: string | null;
  eventType?: string | null;
  eventCategory?: string | null;
  eventLabel?: string | null;
  eventValue?: number | null;
  page?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  metadata?: Record<string, unknown> | null;
  details?: string | null;
  isOwner?: boolean | null;
  timestamp?: string;
}

interface InsertedEventInfo {
  id: string;
  timestamp: string;
  isOwner: boolean;
  page?: string | null;
  eventType?: string | null;
  eventCategory?: string | null;
  referrer?: string | null;
}

async function insertEvent(payload: AnalyticsEventPayload): Promise<InsertedEventInfo> {
  const id = uuidv4();
  const timestamp = payload.timestamp ?? new Date().toISOString();
  const metadataJson = payload.metadata ? JSON.stringify(payload.metadata) : null;
  const isOwnerValue = payload.isOwner ? 1 : 0;

  await getDb().run(
    `
    INSERT INTO analytics_events (
      id,
      session_id,
      user_id,
      type,
      event_type,
      event_category,
      event_label,
      event_value,
      page,
      referrer,
      landing_page,
      metadata,
      details,
      is_owner,
      timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      id,
      payload.sessionId ?? null,
      payload.userId ?? null,
      payload.type,
      payload.eventType ?? null,
      payload.eventCategory ?? null,
      payload.eventLabel ?? null,
      payload.eventValue ?? null,
      payload.page ?? null,
      payload.referrer ?? null,
      payload.landingPage ?? null,
      metadataJson,
      payload.details ?? null,
      isOwnerValue,
      timestamp
    ]
  );

  return {
    id,
    timestamp,
    isOwner: Boolean(payload.isOwner),
    page: payload.page ?? null,
    eventType: payload.eventType ?? null,
    eventCategory: payload.eventCategory ?? null,
    referrer: payload.referrer ?? null
  };
}

export async function recordVisit(params: {
  sessionId?: string;
  userId?: string;
  isOwner?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await insertEvent({
    type: "visit",
    sessionId: params.sessionId,
    userId: params.userId ?? null,
    metadata: params.metadata ?? null,
    details: "Visita registrada",
    isOwner: params.isOwner ?? false
  });
}

export async function logPageView(params: {
  sessionId?: string;
  userId?: string;
  page?: string;
  referrer?: string;
  landingPage?: string;
  metadata?: Record<string, unknown>;
  isOwner?: boolean;
  details?: string;
}): Promise<void> {
  const inserted = await insertEvent({
    type: "pageview",
    sessionId: params.sessionId,
    userId: params.userId ?? null,
    page: params.page ?? null,
    referrer: params.referrer ?? null,
    landingPage: params.landingPage ?? null,
    metadata: params.metadata ?? null,
    details: params.details ?? `Pageview: ${params.page ?? "unknown"}`,
    isOwner: params.isOwner ?? false
  });

  analyticsEmitter.sendToAll({
    type: "pageview",
    page: inserted.page ?? params.page ?? undefined,
    data: {
      timestamp: inserted.timestamp,
      page: inserted.page ?? params.page ?? undefined,
      referrer: inserted.referrer,
      sessionId: params.sessionId ?? null,
      userId: params.userId ?? null,
      is_owner: inserted.isOwner ? 1 : 0
    }
  });
}

export async function logEvent(params: {
  sessionId?: string;
  userId?: string;
  eventType: string;
  eventCategory?: string;
  eventLabel?: string;
  eventValue?: number;
  metadata?: Record<string, unknown>;
  isOwner?: boolean;
  details?: string;
}): Promise<void> {
  const inserted = await insertEvent({
    type: "event",
    sessionId: params.sessionId,
    userId: params.userId ?? null,
    eventType: params.eventType,
    eventCategory: params.eventCategory ?? null,
    eventLabel: params.eventLabel ?? null,
    eventValue: params.eventValue ?? null,
    metadata: params.metadata ?? null,
    details: params.details ?? `${params.eventLabel ?? params.eventType}`,
    isOwner: params.isOwner ?? false
  });

  analyticsEmitter.sendToAll({
    type: "event",
    data: {
      timestamp: inserted.timestamp,
      event_type: inserted.eventType ?? params.eventType,
      event_category: inserted.eventCategory,
      event_label: params.eventLabel,
      event_value: params.eventValue ?? null,
      sessionId: params.sessionId ?? null,
      userId: params.userId ?? null,
      is_owner: inserted.isOwner ? 1 : 0
    }
  });
}

export async function startSession(params: {
  sessionId?: string;
  userId?: string;
  landingPage?: string;
  isOwner?: boolean;
}): Promise<void> {
  await insertEvent({
    type: "session",
    sessionId: params.sessionId,
    userId: params.userId ?? null,
    landingPage: params.landingPage ?? null,
    metadata: null,
    details: `Sessão iniciada em ${params.landingPage ?? "unknown"}`,
    isOwner: params.isOwner ?? false
  });
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [
    visitsResultRaw,
    eventsResultRaw,
    sessionsResultRaw,
    uniqueUsersResultRaw,
    ownerVisitsResultRaw,
    ownerEventsResultRaw,
    topPagesRaw,
    topEventsRaw,
    recentRecordsRaw,
    totalOptimizationsResultRaw
  ] = await Promise.all([
    getDb().get("SELECT COUNT(*) as count FROM analytics_events WHERE type = ?", ["visit"]),
    getDb().get("SELECT COUNT(*) as count FROM analytics_events WHERE type = ?", ["event"]),
    getDb().get("SELECT COUNT(*) as count FROM analytics_events WHERE type = ?", ["session"]),
    getDb().get("SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE user_id IS NOT NULL"),
    getDb().get("SELECT COUNT(*) as count FROM analytics_events WHERE type = ? AND is_owner = 1", ["visit"]),
    getDb().get("SELECT COUNT(*) as count FROM analytics_events WHERE type = ? AND is_owner = 1", ["event"]),
    getDb().all("SELECT page, COUNT(*) as count FROM analytics_events WHERE type = ? AND page IS NOT NULL GROUP BY page ORDER BY count DESC LIMIT 5", ["pageview"]),
    getDb().all("SELECT COALESCE(event_type, event_label, 'evento') as eventType, COUNT(*) as count FROM analytics_events WHERE type = ? GROUP BY eventType ORDER BY count DESC LIMIT 5", ["event"]),
    getDb().all(
      `SELECT type, page, event_type, event_category, landing_page, timestamp, is_owner, details
       FROM analytics_events
       WHERE type IN ('pageview', 'event', 'session')
       ORDER BY timestamp DESC
       LIMIT 20`
    ),
    getDb().get("SELECT COUNT(*) as count FROM optimization_history")
  ]);

  const visitsResult = visitsResultRaw as { count: number } | null;
  const eventsResult = eventsResultRaw as { count: number } | null;
  const sessionsResult = sessionsResultRaw as { count: number } | null;
  const uniqueUsersResult = uniqueUsersResultRaw as { count: number } | null;
  const ownerVisitsResult = ownerVisitsResultRaw as { count: number } | null;
  const ownerEventsResult = ownerEventsResultRaw as { count: number } | null;
  const topPages = (topPagesRaw as Array<{ page: string; count: number }> | null) ?? [];
  const topEvents = (topEventsRaw as Array<{ eventType: string; count: number }> | null) ?? [];
  const recentRecords = (recentRecordsRaw as Array<{
    type: "pageview" | "event" | "session";
    page: string | null;
    event_type: string | null;
    event_category: string | null;
    landing_page: string | null;
    timestamp: string;
    is_owner: number | null;
    details: string | null;
  }> | null) ?? [];
  const totalOptimizationsResult = totalOptimizationsResultRaw as { count: number } | null;

  const recentActivity: RecentActivity[] = recentRecords.map((record) => {
    const type = record.type;
    let details = record.details;
    if (!details) {
      if (type === "pageview") {
        details = `Página: ${record.page ?? "sem rota"}`;
      } else if (type === "event") {
        details = `Evento: ${record.event_type ?? "custom"}${record.event_category ? ` (${record.event_category})` : ""}`;
      } else if (type === "session") {
        details = `Sessão iniciada: ${record.landing_page ?? "sem destino"}`;
      } else {
        details = "Atividade registrada";
      }
    }

    return {
      type,
      timestamp: record.timestamp,
      details,
      isOwner: Boolean(record.is_owner)
    };
  });

  return {
    totalVisits: visitsResult?.count ?? 0,
    totalEvents: eventsResult?.count ?? 0,
    totalSessions: sessionsResult?.count ?? 0,
    totalOptimizations: totalOptimizationsResult?.count ?? 0,
    uniqueUsers: uniqueUsersResult?.count ?? 0,
    ownerVisits: ownerVisitsResult?.count ?? 0,
    ownerEvents: ownerEventsResult?.count ?? 0,
    topPages: topPages.map((row) => ({ page: row.page, count: row.count })),
    topEvents: topEvents.map((row) => ({ eventType: row.eventType, count: row.count })),
    recentActivity
  };
}

export async function cleanupAnalyticsRecords(days: number): Promise<number> {
  if (days <= 0) {
    return 0;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  const countResult = (await getDb().get(
    "SELECT COUNT(*) as count FROM analytics_events WHERE timestamp < ?",
    [cutoffIso]
  )) as { count: number } | null;

  await getDb().run("DELETE FROM analytics_events WHERE timestamp < ?", [cutoffIso]);
  return countResult?.count ?? 0;
}
