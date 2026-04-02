import { Redis } from '@upstash/redis';

const OPS_ACTIVITY_INDEX_KEY = 'ops:activity:index:v1';
const OPS_FALLBACK_INDEX_KEY = 'ops:fallback:index:v1';
const ACTIVITY_TTL_SECONDS = 60 * 60 * 12; // 12h
const FALLBACK_TTL_SECONDS = 60 * 60 * 24 * 30; // 30d

const memory = {
  activities: new Map(),
  fallbacks: new Map(),
};

let redis = null;

function isRedisConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function getRedis() {
  if (!redis && isRedisConfigured()) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return redis;
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSeverity(value) {
  const v = String(value || 'medium').toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(v)) return v;
  return 'medium';
}

function normalizeStatus(value) {
  const v = String(value || 'open').toLowerCase();
  if (['open', 'acknowledged', 'resolved', 'closed'].includes(v)) return v;
  return 'open';
}

function safeNumber(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function toStudentAlias(studentId) {
  return `student-${String(studentId || '').slice(0, 8)}`;
}

async function redisSetJson(key, value, ttlSeconds) {
  const client = getRedis();
  if (!client) return false;
  await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
  return true;
}

async function redisGetJson(key) {
  const client = getRedis();
  if (!client) return null;
  const raw = await client.get(key);
  if (!raw) return null;
  try {
    if (typeof raw === 'string') return JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
}

async function redisMembersByScoreDesc(indexKey, limit = 200) {
  const client = getRedis();
  if (!client) return [];
  const members = await client.zrange(indexKey, 0, Math.max(0, limit - 1), { rev: true });
  return Array.isArray(members) ? members : [];
}

async function redisIndexUpsert(indexKey, member, score) {
  const client = getRedis();
  if (!client) return false;
  await client.zadd(indexKey, { score, member });
  return true;
}

export async function upsertStudentActivity(payload) {
  const activity = {
    student_id: safeString(payload.student_id),
    student_alias: safeString(payload.student_alias) || toStudentAlias(payload.student_id),
    role: safeString(payload.role).toUpperCase(),
    day_number: safeNumber(payload.day_number, 0),
    page_url: safeString(payload.page_url),
    session_id: safeString(payload.session_id),
    message_count: safeNumber(payload.message_count, 0),
    pod_id: safeString(payload.pod_id) || null,
    last_event: safeString(payload.last_event) || 'chat',
    last_seen_at: nowIso(),
  };

  if (!activity.student_id) {
    throw new Error('student_id is required');
  }

  const key = `ops:activity:${activity.student_id}`;
  const score = Date.now();

  if (getRedis()) {
    await redisSetJson(key, activity, ACTIVITY_TTL_SECONDS);
    await redisIndexUpsert(OPS_ACTIVITY_INDEX_KEY, activity.student_id, score);
    return activity;
  }

  memory.activities.set(activity.student_id, activity);
  return activity;
}

export async function listStudentActivities(limit = 200) {
  const clampedLimit = Math.max(1, Math.min(limit, 1000));

  if (getRedis()) {
    const studentIds = await redisMembersByScoreDesc(OPS_ACTIVITY_INDEX_KEY, clampedLimit);
    if (studentIds.length === 0) return [];
    const items = await Promise.all(
      studentIds.map((studentId) => redisGetJson(`ops:activity:${studentId}`))
    );
    return items.filter(Boolean);
  }

  return Array.from(memory.activities.values())
    .sort((a, b) => (new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()))
    .slice(0, clampedLimit);
}

export async function createFallbackTicket(payload) {
  const id = randomId('fallback');
  const openedAt = nowIso();

  const ticket = {
    id,
    status: 'open',
    severity: normalizeSeverity(payload.severity),
    reason: safeString(payload.reason).slice(0, 500),
    context: safeString(payload.context).slice(0, 1000),
    student_id: safeString(payload.student_id),
    student_alias: safeString(payload.student_alias) || toStudentAlias(payload.student_id),
    role: safeString(payload.role).toUpperCase(),
    day_number: safeNumber(payload.day_number, 0),
    page_url: safeString(payload.page_url),
    session_id: safeString(payload.session_id),
    pod_id: safeString(payload.pod_id) || null,
    source: safeString(payload.source) || 'student',
    opened_at: openedAt,
    updated_at: openedAt,
    acknowledged_at: null,
    acknowledged_by: null,
    resolved_at: null,
    resolved_by: null,
    resolution_note: null,
  };

  const key = `ops:fallback:${id}`;
  const score = Date.now();

  if (getRedis()) {
    await redisSetJson(key, ticket, FALLBACK_TTL_SECONDS);
    await redisIndexUpsert(OPS_FALLBACK_INDEX_KEY, id, score);
    return ticket;
  }

  memory.fallbacks.set(id, ticket);
  return ticket;
}

export async function getFallbackTicketById(id) {
  const ticketId = safeString(id);
  if (!ticketId) return null;

  if (getRedis()) {
    return redisGetJson(`ops:fallback:${ticketId}`);
  }

  return memory.fallbacks.get(ticketId) || null;
}

export async function updateFallbackTicket(id, patch) {
  const existing = await getFallbackTicketById(id);
  if (!existing) return null;

  const nextStatus = patch.status ? normalizeStatus(patch.status) : existing.status;
  const updated = {
    ...existing,
    status: nextStatus,
    updated_at: nowIso(),
  };

  if (patch.acknowledged_by) {
    updated.acknowledged_by = safeString(patch.acknowledged_by);
    updated.acknowledged_at = updated.acknowledged_at || nowIso();
  }

  if (patch.resolved_by) {
    updated.resolved_by = safeString(patch.resolved_by);
  }

  if (patch.resolution_note !== undefined) {
    updated.resolution_note = safeString(patch.resolution_note).slice(0, 1000) || null;
  }

  if ((nextStatus === 'resolved' || nextStatus === 'closed') && !updated.resolved_at) {
    updated.resolved_at = nowIso();
  }

  const key = `ops:fallback:${updated.id}`;

  if (getRedis()) {
    await redisSetJson(key, updated, FALLBACK_TTL_SECONDS);
    await redisIndexUpsert(OPS_FALLBACK_INDEX_KEY, updated.id, Date.now());
    return updated;
  }

  memory.fallbacks.set(updated.id, updated);
  return updated;
}

export async function listFallbackTickets(options = {}) {
  const statusFilter = options.status ? normalizeStatus(options.status) : null;
  const clampedLimit = Math.max(1, Math.min(safeNumber(options.limit, 200), 1000));

  let tickets = [];
  if (getRedis()) {
    const ids = await redisMembersByScoreDesc(OPS_FALLBACK_INDEX_KEY, clampedLimit * 3);
    if (ids.length) {
      const rows = await Promise.all(ids.map((id) => redisGetJson(`ops:fallback:${id}`)));
      tickets = rows.filter(Boolean);
    }
  } else {
    tickets = Array.from(memory.fallbacks.values());
  }

  tickets.sort((a, b) => {
    const aTime = new Date(a.updated_at || a.opened_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.opened_at || 0).getTime();
    return bTime - aTime;
  });

  if (statusFilter) {
    tickets = tickets.filter((ticket) => normalizeStatus(ticket.status) === statusFilter);
  }

  return tickets.slice(0, clampedLimit);
}
