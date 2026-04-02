import { verifyAuth } from '../_lib/supabase.js';
import { listFallbackTickets, updateFallbackTicket } from '../_lib/ops-store.js';
import { buildStudentNameMap } from '../_lib/student-resolver.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function isLector(user) {
  const role = user?.user_metadata?.role;
  const roles = Array.isArray(user?.user_metadata?.roles) ? user.user_metadata.roles : [];
  return role === 'lector' || roles.includes('lector');
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['open', 'acknowledged', 'resolved', 'closed'].includes(value)) return value;
  return null;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET, PATCH, or POST.' });
  }

  const { user, error: authError } = await verifyAuth(req);
  if (authError) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!isLector(user)) {
    return res.status(403).json({ error: 'Only lectors can access this endpoint' });
  }

  try {
    if (req.method === 'GET') {
      const status = normalizeStatus(req.query?.status);
      const limit = parseInt(req.query?.limit, 10);

      const [tickets, nameMap] = await Promise.all([
        listFallbackTickets({
          status: status || undefined,
          limit: Number.isFinite(limit) ? limit : 200,
        }),
        buildStudentNameMap(),
      ]);

      const enrichedTickets = tickets.map((t) => {
        const resolved = nameMap.get(t.student_id) || {};
        return {
          ...t,
          student_name: resolved.name || t.student_alias || 'Unknown',
          student_email: resolved.email || '',
        };
      });

      return res.status(200).json({
        success: true,
        tickets: enrichedTickets,
        total: enrichedTickets.length,
      });
    }

    // POST: bulk close all open/acknowledged tickets
    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action !== 'close_all') {
        return res.status(400).json({ error: 'Unknown action. Supported: close_all' });
      }

      const openTickets = await listFallbackTickets({ limit: 1000 });
      const toClose = openTickets.filter(
        (t) => t.status === 'open' || t.status === 'acknowledged'
      );

      let closed = 0;
      for (const ticket of toClose) {
        await updateFallbackTicket(ticket.id, {
          status: 'closed',
          resolved_by: user.id,
          resolution_note: body.resolution_note || 'Bulk closed by lector from dashboard.',
        });
        closed++;
      }

      return res.status(200).json({
        success: true,
        closed,
        message: `Closed ${closed} ticket(s).`,
      });
    }

    // PATCH: update single ticket
    const body = req.body || {};
    const ticketId = typeof body.id === 'string' ? body.id.trim() : '';
    const status = normalizeStatus(body.status);

    if (!ticketId) {
      return res.status(400).json({ error: 'id is required' });
    }
    if (!status) {
      return res.status(400).json({ error: 'status must be one of: open, acknowledged, resolved, closed' });
    }

    const patch = { status };
    if (status === 'acknowledged') {
      patch.acknowledged_by = user.id;
    }
    if (status === 'resolved' || status === 'closed') {
      patch.resolved_by = user.id;
      patch.resolution_note = typeof body.resolution_note === 'string' ? body.resolution_note : '';
    }

    const updated = await updateFallbackTicket(ticketId, patch);
    if (!updated) {
      return res.status(404).json({ error: 'Fallback ticket not found' });
    }

    return res.status(200).json({
      success: true,
      ticket: updated,
    });
  } catch (error) {
    console.error('Lector fallbacks API error:', error);
    return res.status(500).json({ error: 'Failed to process fallback queue request' });
  }
}
