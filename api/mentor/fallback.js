import { verifyAuth } from '../_lib/supabase.js';
import { createFallbackTicket, upsertStudentActivity } from '../_lib/ops-store.js';

const PROD_ORIGINS = [
  'https://ai-academy-knowledge.vercel.app',
];

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const allowed = isProd ? PROD_ORIGINS : [...PROD_ORIGINS, ...DEV_ORIGINS];

  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function normalizeRole(role) {
  return String(role || '')
    .toUpperCase()
    .replace(/\s+/g, '-')
    .slice(0, 20);
}

function normalizeSeverity(severity) {
  const value = String(severity || 'medium').toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(value)) return value;
  return 'medium';
}

function safeDay(day) {
  const parsed = parseInt(day, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(31, parsed));
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { user, error: authError } = await verifyAuth(req);
  if (authError) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body || {};
  const role = normalizeRole(body.role);
  const dayNumber = safeDay(body.day_number);
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!role) {
    return res.status(400).json({ error: 'role is required' });
  }
  if (!dayNumber) {
    return res.status(400).json({ error: 'day_number is required' });
  }
  if (!reason) {
    return res.status(400).json({ error: 'reason is required' });
  }

  try {
    const ticket = await createFallbackTicket({
      student_id: user.id,
      student_alias: body.student_alias || `student-${String(user.id).slice(0, 8)}`,
      role,
      day_number: dayNumber,
      page_url: typeof body.page_url === 'string' ? body.page_url.slice(0, 200) : '',
      session_id: typeof body.session_id === 'string' ? body.session_id.slice(0, 80) : '',
      pod_id: typeof body.pod_id === 'string' ? body.pod_id.slice(0, 40) : '',
      reason: reason.slice(0, 500),
      severity: normalizeSeverity(body.severity),
      context: typeof body.context === 'string' ? body.context.slice(0, 1000) : '',
      source: 'student',
    });

    await upsertStudentActivity({
      student_id: user.id,
      student_alias: body.student_alias || `student-${String(user.id).slice(0, 8)}`,
      role,
      day_number: dayNumber,
      page_url: typeof body.page_url === 'string' ? body.page_url.slice(0, 200) : '',
      session_id: typeof body.session_id === 'string' ? body.session_id.slice(0, 80) : '',
      message_count: Number.isFinite(parseInt(body.message_count, 10))
        ? parseInt(body.message_count, 10)
        : 0,
      pod_id: typeof body.pod_id === 'string' ? body.pod_id.slice(0, 40) : '',
      last_event: 'fallback_opened',
    });

    return res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Mentor fallback API error:', error);
    return res.status(500).json({ error: 'Failed to create fallback ticket' });
  }
}
