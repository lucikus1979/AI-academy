import { verifyAuth } from '../_lib/supabase.js';
import { listStudentActivities, listFallbackTickets } from '../_lib/ops-store.js';
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function isLector(user) {
  const role = user?.user_metadata?.role;
  const roles = Array.isArray(user?.user_metadata?.roles) ? user.user_metadata.roles : [];
  return role === 'lector' || roles.includes('lector');
}

function getLiveStatus(item, fallbackCount) {
  if (fallbackCount > 0) return 'red';
  if (!item?.last_seen_at) return 'gray';

  const minutesAgo = (Date.now() - new Date(item.last_seen_at).getTime()) / (1000 * 60);
  if (minutesAgo <= 15) return 'green';
  if (minutesAgo <= 45) return 'yellow';
  return 'gray';
}

function summarizeFallbacks(fallbacks) {
  const now = Date.now();
  const midnightUtc = new Date();
  midnightUtc.setUTCHours(0, 0, 0, 0);
  const midnightTime = midnightUtc.getTime();

  let open = 0;
  let acknowledged = 0;
  let resolvedToday = 0;
  for (const ticket of fallbacks) {
    const status = String(ticket.status || '').toLowerCase();
    if (status === 'open') open++;
    if (status === 'acknowledged') acknowledged++;
    if ((status === 'resolved' || status === 'closed') && ticket.resolved_at) {
      const t = new Date(ticket.resolved_at).getTime();
      if (Number.isFinite(t) && t >= midnightTime && t <= now) {
        resolvedToday++;
      }
    }
  }
  return { open, acknowledged, resolvedToday };
}

async function fetchStudentProgressMap() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return new Map();
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/student_progress?select=student_id,week_number,day_number,status,completed_at&order=student_id,week_number,day_number`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseAnonKey,
        },
      }
    );

    if (!response.ok) {
      return new Map();
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) return new Map();

    const map = new Map();
    for (const row of rows) {
      if (!row.student_id) continue;
      if (!map.has(row.student_id)) {
        map.set(row.student_id, {
          student_id: row.student_id,
          current_week: 0,
          current_day: 0,
          completed_lessons: 0,
        });
      }
      const entry = map.get(row.student_id);
      const week = parseInt(row.week_number, 10);
      const day = parseInt(row.day_number, 10);
      if (row.status === 'completed') entry.completed_lessons += 1;
      if (week > entry.current_week || (week === entry.current_week && day > entry.current_day)) {
        entry.current_week = week;
        entry.current_day = day;
      }
    }

    return map;
  } catch {
    return new Map();
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { user, error: authError } = await verifyAuth(req);
  if (authError) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!isLector(user)) {
    return res.status(403).json({ error: 'Only lectors can access this endpoint' });
  }

  try {
    const [activities, allFallbacks, progressMap, nameMap] = await Promise.all([
      listStudentActivities(500),
      listFallbackTickets({ limit: 1000 }),
      fetchStudentProgressMap(),
      buildStudentNameMap(),
    ]);

    const openFallbacksByStudent = {};
    for (const ticket of allFallbacks) {
      if (String(ticket.status).toLowerCase() !== 'open') continue;
      const key = ticket.student_id || 'unknown';
      openFallbacksByStudent[key] = (openFallbacksByStudent[key] || 0) + 1;
    }

    const aiAcademyMap = new Map();

    for (const [studentId, progress] of progressMap.entries()) {
      const resolved = nameMap.get(studentId) || {};
      aiAcademyMap.set(studentId, {
        student_id: studentId,
        student_name: resolved.name || `student-${String(studentId).slice(0, 8)}`,
        student_email: resolved.email || '',
        role_track: resolved.role_track || '',
        day_number: progress.current_day || 0,
        current_week: progress.current_week || 0,
        current_day: progress.current_day || 0,
        current_label: `Week ${progress.current_week || 0} / Day ${progress.current_day || 0}`,
        completed_lessons: progress.completed_lessons || 0,
        last_seen_at: null,
        message_count: 0,
        page_url: '',
        pod_id: null,
        fallback_open_count: openFallbacksByStudent[studentId] || 0,
        live_status: openFallbacksByStudent[studentId] > 0 ? 'red' : 'gray',
      });
    }

    for (const activity of activities) {
      const studentId = activity.student_id;
      if (!studentId) continue;

      const resolved = nameMap.get(studentId) || {};
      const current = aiAcademyMap.get(studentId) || {
        student_id: studentId,
        student_name: resolved.name || activity.student_alias || `student-${String(studentId).slice(0, 8)}`,
        student_email: resolved.email || '',
        role_track: resolved.role_track || '',
        day_number: 0,
        current_week: 0,
        current_day: 0,
        current_label: '',
        completed_lessons: 0,
        last_seen_at: null,
        message_count: 0,
        page_url: '',
        pod_id: null,
        fallback_open_count: openFallbacksByStudent[studentId] || 0,
        live_status: 'gray',
      };

      current.role_track = activity.role || current.role_track;
      current.day_number = activity.day_number || current.day_number;
      current.last_seen_at = activity.last_seen_at || current.last_seen_at;
      current.message_count = activity.message_count || current.message_count;
      current.page_url = activity.page_url || current.page_url;
      current.pod_id = activity.pod_id || current.pod_id;
      current.fallback_open_count = openFallbacksByStudent[studentId] || current.fallback_open_count;
      current.live_status = getLiveStatus(current, current.fallback_open_count);
      current.current_label = `Week ${current.current_week || 0} / Day ${current.current_day || current.day_number || 0}`;

      aiAcademyMap.set(studentId, current);
    }

    const aiAcademyMembers = Array.from(aiAcademyMap.values()).sort((a, b) => {
      const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return bTime - aTime;
    });

    const fallbackSummary = summarizeFallbacks(allFallbacks);
    const activeLast15m = aiAcademyMembers.filter((student) => {
      if (!student.last_seen_at) return false;
      return (Date.now() - new Date(student.last_seen_at).getTime()) <= (15 * 60 * 1000);
    }).length;

    // Calculate expected pace: ~1 day per calendar day since academy start
    // Behind schedule = current_week*5 + current_day is significantly less than expected
    const now = new Date();
    const academyStart = new Date('2026-01-20'); // Monday Week 1
    const daysSinceStart = Math.max(0, Math.floor((now - academyStart) / (1000 * 60 * 60 * 24)));
    const expectedDay = Math.min(25, daysSinceStart); // max 25 days
    const behindSchedule = aiAcademyMembers.filter((s) => {
      const studentDay = ((s.current_week || 1) - 1) * 5 + (s.current_day || 0);
      return studentDay > 0 && studentDay < expectedDay - 3; // 3-day grace
    }).length;

    // Enrich fallback tickets with real names
    const enrichedFallbacks = allFallbacks.slice(0, 300).map((ticket) => {
      const resolved = nameMap.get(ticket.student_id) || {};
      return {
        ...ticket,
        student_name: resolved.name || ticket.student_alias || 'Unknown',
        student_email: resolved.email || '',
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        total_students: aiAcademyMembers.length,
        active_last_15m: activeLast15m,
        fallback_open: fallbackSummary.open,
        fallback_acknowledged: fallbackSummary.acknowledged,
        fallback_resolved_today: fallbackSummary.resolvedToday,
        behind_schedule: behindSchedule,
      },
      ai_academy_members: aiAcademyMembers,
      fallback_tickets: enrichedFallbacks,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Lector live API error:', error);
    return res.status(500).json({ error: 'Failed to load live operations data' });
  }
}
