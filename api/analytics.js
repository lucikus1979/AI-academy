// api/analytics.js
// Admin-only analytics endpoint for AI Academy Mentor System
// Protected by ANALYTICS_SECRET env var. Not called from the widget.
//
// GET  ?action=summary  (header: x-analytics-secret) — Daily rollup summary
// GET  ?action=questions (header: x-analytics-secret) — Top recurring first questions grouped by role+day
// POST ?action=rollup    (header: x-analytics-secret) — Compute daily rollups from chat_events → daily_rollups

import { getClient } from './_lib/supabase.js';

// ============================================================
// AUTH HELPER
// ============================================================

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function authenticate(req) {
  // Accept secret via header only (query strings leak in logs, referrers, browser history)
  const secret = req.headers['x-analytics-secret'];
  if (!process.env.ANALYTICS_SECRET) {
    return { ok: false, error: 'ANALYTICS_SECRET not configured' };
  }
  const expected = process.env.ANALYTICS_SECRET;
  if (!secret || secret.length !== expected.length || !timingSafeEqual(secret, expected)) {
    return { ok: false, error: 'Unauthorized' };
  }
  return { ok: true };
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  // Only GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  }

  // Authenticate
  const auth = authenticate(req);
  if (!auth.ok) {
    return res.status(401).json({ error: auth.error });
  }

  // Check Supabase is configured
  const client = getClient();
  if (!client) {
    return res.status(503).json({
      error: 'Supabase not configured',
      message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    });
  }

  const action = req.query?.action || '';

  try {
    switch (action) {
      case 'summary':
        return await handleSummary(client, req, res);
      case 'questions':
        return await handleQuestions(client, req, res);
      case 'rollup':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Rollup requires POST method' });
        }
        return await handleRollup(client, req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          validActions: ['summary', 'questions', 'rollup'],
          usage: {
            summary: 'GET ?action=summary&secret=X — Aggregated overview',
            questions: 'GET ?action=questions&secret=X&role=FDE&day=13 — Top first questions',
            rollup: 'POST ?action=rollup&secret=X — Compute daily rollups'
          }
        });
    }
  } catch (err) {
    console.error('Analytics error:', err.message || err);
    return res.status(500).json({ error: 'Internal analytics error' });
  }
}

// ============================================================
// ACTION: summary
// ============================================================

async function handleSummary(client, req, res) {
  const role = req.query?.role || null;
  const day = req.query?.day ? parseInt(req.query.day, 10) : null;

  // 1. Overall stats
  let overallQuery = client
    .from('chat_events')
    .select('*', { count: 'exact', head: true });

  const { count: totalEvents } = await overallQuery;

  // 2. Per role+day breakdown from daily_rollups (if they exist)
  let rollupQuery = client
    .from('daily_rollups')
    .select('*')
    .order('roll_date', { ascending: false })
    .order('role', { ascending: true });

  if (role) rollupQuery = rollupQuery.eq('role', role.toUpperCase());
  if (day) rollupQuery = rollupQuery.eq('day_number', day);

  const { data: rollups, error: rollupError } = await rollupQuery.limit(200);

  if (rollupError) {
    console.error('Rollup query failed:', rollupError.message);
    return res.status(500).json({ error: 'Rollup query failed' });
  }

  // 3. Recent error rate (last 24h from raw events)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentErrors, error: errError } = await client
    .from('chat_events')
    .select('role, day_number, error_type, status_code')
    .not('error_type', 'is', null)
    .gte('created_at', yesterday);

  if (errError) {
    console.error('Error fetching recent errors:', errError.message);
  }

  // 4. Top struggling roles (most errors in last 24h)
  const errorsByRole = {};
  (recentErrors || []).forEach(e => {
    const key = e.role;
    errorsByRole[key] = (errorsByRole[key] || 0) + 1;
  });

  const topStrugglingRoles = Object.entries(errorsByRole)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([r, count]) => ({ role: r, errors_24h: count }));

  // 5. Token burn summary from rollups
  const totalTokens = (rollups || []).reduce((sum, r) => sum + (r.total_tokens || 0), 0);
  const totalCost = (rollups || []).reduce((sum, r) => sum + parseFloat(r.estimated_cost_usd || 0), 0);

  return res.status(200).json({
    totalEvents: totalEvents || 0,
    rollups: rollups || [],
    recentErrors: {
      count: (recentErrors || []).length,
      topStrugglingRoles,
      since: yesterday
    },
    tokenBurn: {
      totalTokens,
      estimatedCostUSD: Math.round(totalCost * 10000) / 10000
    },
    generatedAt: new Date().toISOString()
  });
}

// ============================================================
// ACTION: questions
// ============================================================

async function handleQuestions(client, req, res) {
  const role = req.query?.role || null;
  const day = req.query?.day ? parseInt(req.query.day, 10) : null;
  const limit = Math.min(parseInt(req.query?.limit || '50', 10), 200);

  let query = client
    .from('chat_events')
    .select('role, day_number, first_question, session_id, created_at')
    .not('first_question', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (role) query = query.eq('role', role.toUpperCase());
  if (day) query = query.eq('day_number', day);

  const { data, error } = await query;

  if (error) {
    console.error('Questions query failed:', error.message);
    return res.status(500).json({ error: 'Questions query failed' });
  }

  // Group questions by role+day for easy reading
  const grouped = {};
  (data || []).forEach(row => {
    const key = `${row.role}:day${row.day_number}`;
    if (!grouped[key]) {
      grouped[key] = { role: row.role, day: row.day_number, questions: [] };
    }
    grouped[key].questions.push({
      question: row.first_question,
      sessionId: row.session_id,
      timestamp: row.created_at
    });
  });

  return res.status(200).json({
    total: (data || []).length,
    grouped: Object.values(grouped),
    generatedAt: new Date().toISOString()
  });
}

// ============================================================
// ACTION: rollup (POST)
// Aggregates chat_events → daily_rollups using UPSERT
// ============================================================

async function handleRollup(client, req, res) {
  // Determine date range: default to last 7 days, or accept ?date=YYYY-MM-DD for specific day
  const rawDate = req.query?.date || null;
  const specificDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

  if (rawDate && !specificDate) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  let fromDate, toDate;

  if (specificDate) {
    fromDate = specificDate + 'T00:00:00Z';
    toDate = specificDate + 'T23:59:59.999Z';
  } else {
    // Last 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    fromDate = weekAgo.toISOString();
    toDate = now.toISOString();
  }

  // Fetch raw events in date range
  const { data: events, error: fetchError } = await client
    .from('chat_events')
    .select('*')
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .order('created_at', { ascending: true })
    .limit(10000);

  if (fetchError) {
    console.error('Failed to fetch events:', fetchError.message);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }

  if (!events || events.length === 0) {
    return res.status(200).json({ message: 'No events found in date range', rollups: 0 });
  }

  // Aggregate by (date, role, day_number)
  const buckets = {};

  for (const evt of events) {
    const rollDate = evt.created_at.slice(0, 10); // YYYY-MM-DD
    const key = `${rollDate}|${evt.role}|${evt.day_number}`;

    if (!buckets[key]) {
      buckets[key] = {
        roll_date: rollDate,
        role: evt.role,
        day_number: evt.day_number,
        sessions: new Set(),
        total_messages: 0,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
        total_errors: 0,
        response_times: [],
      };
    }

    const b = buckets[key];
    b.sessions.add(evt.session_id);
    b.total_messages += 1;
    b.total_prompt_tokens += evt.prompt_tokens || 0;
    b.total_completion_tokens += evt.completion_tokens || 0;
    b.total_tokens += evt.total_tokens || 0;
    if (evt.error_type) b.total_errors += 1;
    if (evt.response_time_ms) b.response_times.push(evt.response_time_ms);
  }

  // Build rollup rows
  // Cost estimation: gpt-5-nano pricing ($0.05/1M input, $0.40/1M output)
  const INPUT_COST_PER_TOKEN = 0.05 / 1_000_000;
  const OUTPUT_COST_PER_TOKEN = 0.40 / 1_000_000;

  const rollupRows = Object.values(buckets).map(b => {
    const uniqueSessions = b.sessions.size;
    const avgMessages = uniqueSessions > 0 ? Math.round((b.total_messages / uniqueSessions) * 10) / 10 : 0;
    const avgResponseTime = b.response_times.length > 0
      ? Math.round(b.response_times.reduce((a, c) => a + c, 0) / b.response_times.length)
      : 0;
    const errorRate = b.total_messages > 0
      ? Math.round((b.total_errors / b.total_messages) * 1000) / 1000
      : 0;
    const estimatedCost = (b.total_prompt_tokens * INPUT_COST_PER_TOKEN) +
      (b.total_completion_tokens * OUTPUT_COST_PER_TOKEN);

    return {
      roll_date: b.roll_date,
      role: b.role,
      day_number: b.day_number,
      total_sessions: b.total_messages, // total API calls
      total_messages: b.total_messages,
      unique_sessions: uniqueSessions,
      avg_messages_per_session: avgMessages,
      total_prompt_tokens: b.total_prompt_tokens,
      total_completion_tokens: b.total_completion_tokens,
      total_tokens: b.total_tokens,
      estimated_cost_usd: Math.round(estimatedCost * 10000) / 10000,
      total_errors: b.total_errors,
      error_rate: errorRate,
      avg_response_time_ms: avgResponseTime,
      updated_at: new Date().toISOString(),
    };
  });

  // UPSERT into daily_rollups
  const { data: upsertResult, error: upsertError } = await client
    .from('daily_rollups')
    .upsert(rollupRows, {
      onConflict: 'roll_date,role,day_number',
      ignoreDuplicates: false
    });

  if (upsertError) {
    console.error('Rollup upsert failed:', upsertError.message);
    return res.status(500).json({ error: 'Rollup upsert failed' });
  }

  return res.status(200).json({
    message: 'Rollup completed',
    eventsProcessed: events.length,
    rollupsUpserted: rollupRows.length,
    dateRange: { from: fromDate, to: toDate },
    generatedAt: new Date().toISOString()
  });
}
