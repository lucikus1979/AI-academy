// api/_lib/student-resolver.js
// Resolves student UUIDs to real names + emails for lector dashboard.
// Uses 5-minute in-memory cache (serverless cold start resets it).

import { getClient } from './supabase.js';

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Build a Map of student_id -> { name, email, role_track }
 * Sources (fallback chain):
 *   1. student_scores.student_name
 *   2. auth.users.user_metadata.full_name / name
 *   3. email prefix (before @)
 *   4. "Unknown"
 */
export async function buildStudentNameMap() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
    return _cache;
  }

  const map = new Map();
  const client = getClient();
  if (!client) return map;

  try {
    // Fetch auth users (admin API) and student_scores in parallel
    const [authResult, scoresResult] = await Promise.all([
      fetchAuthUsers(client),
      fetchStudentScores(),
    ]);

    // Index auth users by ID
    for (const user of authResult) {
      map.set(user.id, {
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        email: user.email || '',
        role_track: user.user_metadata?.role_track || '',
      });
    }

    // Overlay student_scores data (higher priority for name)
    for (const score of scoresResult) {
      const existing = map.get(score.student_id) || { name: '', email: '', role_track: '' };
      if (score.student_name) {
        existing.name = score.student_name;
      }
      if (score.role_track) {
        existing.role_track = score.role_track;
      }
      map.set(score.student_id, existing);
    }

    // Apply fallback: email prefix for entries with no name
    for (const [id, entry] of map) {
      if (!entry.name && entry.email) {
        entry.name = entry.email.split('@')[0];
      }
      if (!entry.name) {
        entry.name = 'Unknown';
      }
    }

    _cache = map;
    _cacheTime = Date.now();
  } catch (err) {
    console.error('student-resolver error:', err.message);
    // Return whatever we have (possibly empty map)
  }

  return map;
}

async function fetchAuthUsers(client) {
  const allUsers = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error('listUsers error:', error.message);
      break;
    }

    const users = data?.users || [];
    allUsers.push(...users);

    if (users.length < perPage) break;
    page++;
  }

  return allUsers;
}

async function fetchStudentScores() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return [];
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/student_scores?select=student_id,student_name,role_track`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseAnonKey,
        },
      }
    );

    if (!response.ok) return [];

    const rows = await response.json();
    if (!Array.isArray(rows)) return [];

    // Deduplicate by student_id (keep first non-empty name)
    const seen = new Map();
    for (const row of rows) {
      if (!row.student_id) continue;
      if (!seen.has(row.student_id) || (row.student_name && !seen.get(row.student_id).student_name)) {
        seen.set(row.student_id, row);
      }
    }

    return Array.from(seen.values());
  } catch {
    return [];
  }
}
