// api/lib/supabase.js
// Shared Supabase client + analytics helpers for AI Academy Mentor System
// Gracefully degrades if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.

import { createClient } from '@supabase/supabase-js';

let supabase = null;

/**
 * Lazily create and return the Supabase client.
 * Returns null if env vars are missing (analytics silently skips).
 */
function getClient() {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

/**
 * Log a chat event to the chat_events table.
 * Fire-and-forget — errors are logged but never block the caller.
 *
 * @param {Object} event
 * @param {string}  event.session_id       - UUID from the client
 * @param {string}  event.page_url         - window.location.pathname
 * @param {string}  event.role             - Normalized role (e.g. "FDE", "AI-SE")
 * @param {number}  event.day_number       - Day 11-25
 * @param {number}  event.message_count    - Messages in this session so far
 * @param {number}  [event.prompt_tokens]
 * @param {number}  [event.completion_tokens]
 * @param {number}  [event.total_tokens]
 * @param {number}  [event.response_time_ms]
 * @param {string}  [event.error_type]     - null on success; e.g. "rate_limit", "openai_auth", "timeout"
 * @param {number}  [event.status_code]    - HTTP status sent to client
 * @param {string}  [event.first_question] - First user message (truncated to 500 chars), only for new conversations
 */
export async function logChatEvent(event) {
  const client = getClient();
  if (!client) return; // Supabase not configured — skip silently

  try {
    const { error } = await client.from('chat_events').insert([event]);
    if (error) {
      console.error('Analytics insert error:', error.message);
    }
  } catch (err) {
    console.error('Analytics unexpected error:', err.message);
  }
}

/**
 * Verify a user's auth token from the Authorization header.
 * Uses the service-role client to call auth.getUser(token).
 *
 * @param {Object} req - HTTP request object
 * @returns {Promise<{user?: Object, error?: string}>}
 */
export async function verifyAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { error: 'Missing authorization token' };
  }

  const client = getClient();
  if (!client) {
    // Supabase not configured — fail closed (block request)
    return { error: 'Auth service not configured' };
  }

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) {
      return { error: error?.message || 'Invalid token' };
    }
    return { user: data.user };
  } catch (err) {
    return { error: 'Auth verification failed' };
  }
}

export { getClient };
