// api/progress.js
// Vercel serverless function — Save lesson completion progress to Supabase
// POST /api/progress { lesson_id, week_number, day_number, ai_summary, mentor_interactions, student_notes }

import { verifyAuth } from './_lib/supabase.js';

// ============================================================
// CORS HELPER
// ============================================================

// Production origins — Vercel sets VERCEL_ENV automatically
const PROD_ORIGINS = [
  'https://ai-academy-knowledge.vercel.app',
];

// Dev origins — only allowed when not in production
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

  // Only GET or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  }

  try {
    // Validate auth
    const { user, error: authError } = await verifyAuth(req);
    if (authError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const studentId = user.id;

    // ── GET: Return student's own progress ──────────────────
    if (req.method === 'GET') {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase configuration missing');
        return res.status(500).json({ error: 'Service configuration error' });
      }

      const token = req.headers.authorization?.substring(7);
      if (!token) {
        return res.status(401).json({ error: 'Missing token' });
      }

      const progressResponse = await fetch(
        `${supabaseUrl}/rest/v1/student_progress?student_id=eq.${studentId}&select=lesson_id,week_number,day_number,status,completed_at&order=week_number,day_number`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseAnonKey,
          },
        }
      );

      if (!progressResponse.ok) {
        const errorText = await progressResponse.text();
        console.error('Supabase GET error:', errorText);
        return res.status(500).json({ error: 'Failed to fetch progress' });
      }

      const progressData = await progressResponse.json();
      return res.status(200).json({ success: true, progress: Array.isArray(progressData) ? progressData : [] });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase configuration missing (SUPABASE_URL or SUPABASE_ANON_KEY)');
      return res.status(500).json({ error: 'Service configuration error' });
    }

    // Parse request body
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }

    const { lesson_id, week_number, day_number, ai_summary, mentor_interactions, student_notes } = body;

    if (!lesson_id || week_number === undefined || day_number === undefined) {
      return res.status(400).json({ error: 'Missing required fields: lesson_id, week_number, day_number' });
    }

    // Insert into student_progress
    const progressResponse = await fetch(`${supabaseUrl}/rest/v1/student_progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.authorization.substring(7)}`,
        'apikey': supabaseAnonKey,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        student_id: studentId,
        lesson_id,
        week_number,
        day_number,
        status: 'completed',
        ai_summary: ai_summary || '',
        mentor_interactions: mentor_interactions || {},
        student_notes: student_notes || '',
        completed_at: new Date().toISOString(),
      }),
    });

    if (!progressResponse.ok) {
      const error = await progressResponse.text();
      console.error('Supabase error status:', progressResponse.status);
      console.error('Supabase error:', error);
      return res.status(progressResponse.status === 401 ? 401 : 500).json({ error: 'Failed to save progress' });
    }

    let result;
    try {
      result = await progressResponse.json();
    } catch (parseError) {
      console.error('Failed to parse Supabase response:', parseError);
      return res.status(500).json({ error: 'Failed to save progress' });
    }

    // Validate response structure - result can be object or array
    const progressId = Array.isArray(result) ? result[0]?.id : result?.id;
    if (!progressId) {
      console.error('Unexpected Supabase response:', result);
      return res.status(500).json({ error: 'Failed to save progress' });
    }

    return res.status(200).json({
      success: true,
      progress_id: progressId,
    });
  } catch (error) {
    console.error('Progress API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
