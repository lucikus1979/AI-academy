import { verifyAuth } from '../_lib/supabase.js';
import { buildStudentNameMap } from '../_lib/student-resolver.js';

// ============================================================
// CORS HELPER
// ============================================================

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
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  // CORS
  setCorsHeaders(req, res);

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate auth using shared helper
    const { user, error: authError } = await verifyAuth(req);
    if (authError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify lector role
    const role = user.user_metadata?.role;
    if (role !== 'lector') {
      return res.status(403).json({ error: 'Only lectors can access this endpoint' });
    }

    // Fetch student_progress using service role (server-side)
    // This bypasses RLS and ensures lectors can see all student data
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return res.status(500).json({ error: 'Service configuration error' });
    }

    const progressResponse = await fetch(
      `${supabaseUrl}/rest/v1/student_progress?select=student_id,lesson_id,status,ai_summary,week_number,day_number,completed_at&order=student_id,week_number,day_number`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseAnonKey,
        },
      }
    );

    if (!progressResponse.ok) {
      const errorText = await progressResponse.text();
      console.error('Supabase error:', errorText);
      return res.status(500).json({ error: 'Failed to fetch student progress' });
    }

    const progressData = await progressResponse.json();

    // Validate response is array
    if (!Array.isArray(progressData)) {
      return res.status(500).json({ error: 'Failed to fetch student progress' });
    }

    // OK if empty (lector with no students yet)
    if (progressData.length === 0) {
      return res.status(200).json({ success: true, students: [], total: 0 });
    }

    // Validate required fields
    const validRecords = progressData.every(r =>
      r.student_id && r.lesson_id && r.week_number !== undefined && r.day_number !== undefined
    );
    if (!validRecords) {
      return res.status(500).json({ error: 'Failed to fetch student progress' });
    }

    // Group by student_id and aggregate
    const studentMap = {};

    progressData.forEach((record) => {
      if (!studentMap[record.student_id]) {
        studentMap[record.student_id] = {
          student_id: record.student_id,
          progress: [],
          currentWeek: 1,
          currentDay: 1,
        };
      }

      studentMap[record.student_id].progress.push({
        lesson_id: record.lesson_id,
        week_number: record.week_number,
        day_number: record.day_number,
        status: record.status,
        ai_summary: record.ai_summary,
        completed_at: record.completed_at,
      });

      // Track latest lesson by week/day (any status)
      const student = studentMap[record.student_id];
      if (record.week_number > student.currentWeek ||
          (record.week_number === student.currentWeek && record.day_number > student.currentDay)) {
        student.currentWeek = record.week_number;
        student.currentDay = record.day_number;
      }
    });

    const nameMap = await buildStudentNameMap();
    const students = Object.values(studentMap).map((s) => {
      const resolved = nameMap.get(s.student_id) || {};
      return {
        ...s,
        student_name: resolved.name || String(s.student_id).slice(0, 8),
        student_email: resolved.email || '',
        role_track: resolved.role_track || '',
      };
    });

    return res.status(200).json({
      success: true,
      students,
      total: students.length,
    });
  } catch (error) {
    console.error('Lector students API error:', error);
    return res.status(500).json({ error: 'Failed to fetch student progress' });
  }
}
