/**
 * restore-deleted-students.js
 *
 * Re-creates Supabase auth accounts for students who were deleted
 * by cleanup-no-submission.js. Uses the original enrollment list as
 * the source of truth.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/restore-deleted-students.js
 *
 * Modes:
 *   --dry-run   (default) Lists users to restore without creating
 *   --execute   Actually creates the users in Supabase auth
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const EXECUTE = process.argv.includes('--execute');

// ---------------------------------------------------------------------------
// Parse original enrollment list (RTF format from Outlook)
// ---------------------------------------------------------------------------

function parseEnrollmentList(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const enrolled = new Map(); // email -> name

  // Extract Name <Email> pairs
  const pairRegex = /([^;<>]+?)\s*<([^>]+@[^>]+)>/g;
  let match;
  while ((match = pairRegex.exec(text)) !== null) {
    let name = match[1].trim();
    const email = match[2].trim().toLowerCase();

    // Clean RTF escape sequences from name
    name = name
      .replace(/\\uc0\\u\d+\s*/g, '')
      .replace(/\\u\d+\s*/g, '')
      .replace(/\\'[0-9a-f]{2}/gi, '')
      .replace(/\\[a-z]+\d*\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (email.includes('@') && name.length > 1) {
      enrolled.set(email, name);
    }
  }

  // Also catch bare emails not in Name <Email> format
  const bareEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+/g;
  while ((match = bareEmailRegex.exec(text)) !== null) {
    const email = match[0].toLowerCase();
    if (!enrolled.has(email)) {
      enrolled.set(email, '');
    }
  }

  return enrolled;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== AI Academy 2026 — Restore deleted student accounts ===\n');
  console.log(`Mode: ${EXECUTE ? '🔴 EXECUTE (will create users)' : '🟡 DRY RUN (no changes)'}\n`);

  // 1. Read original enrollment list
  const enrollmentPath = path.join(ROOT, 'docs/enrollment/AI Academy Name List.txt');
  if (!fs.existsSync(enrollmentPath)) {
    console.error(`ERROR: Enrollment list not found at ${enrollmentPath}`);
    console.error('Copy the original enrollment file there first.');
    process.exit(1);
  }

  const enrolled = parseEnrollmentList(enrollmentPath);
  console.log(`Original enrollment: ${enrolled.size} unique emails\n`);

  // 2. Fetch all current Supabase auth users
  console.log('Fetching current Supabase auth users...');
  const allUsers = [];
  let page = 1;
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.error('ERROR fetching users:', error.message); process.exit(1); }
    allUsers.push(...users);
    if (users.length < 1000) break;
    page++;
  }

  const existingEmails = new Set(allUsers.map(u => (u.email || '').toLowerCase()));
  console.log(`  Current auth users: ${allUsers.length}\n`);

  // 3. Find enrolled students without auth accounts
  const needsCreation = [];
  const alreadyExists = [];

  for (const [email, name] of enrolled) {
    if (existingEmails.has(email)) {
      alreadyExists.push(email);
    } else {
      needsCreation.push({ email, name });
    }
  }

  console.log(`Already have accounts: ${alreadyExists.length}`);
  console.log(`Need to restore: ${needsCreation.length}\n`);

  if (needsCreation.length === 0) {
    console.log('All enrolled students have accounts. Nothing to restore.');
    return;
  }

  // 4. List accounts to create
  console.log('--- Accounts to restore ---');
  for (const { email, name } of needsCreation.sort((a, b) => a.email.localeCompare(b.email))) {
    console.log(`  ${email.padEnd(50)} ${name}`);
  }
  console.log();

  if (!EXECUTE) {
    console.log('Dry run complete. To actually create these accounts, run with --execute flag.');
    return;
  }

  // 5. Create accounts
  console.log('Creating accounts...\n');
  let created = 0;
  let errors = 0;

  for (const { email, name } of needsCreation) {
    const tempPassword = 'IAmNotARobot77!';

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: name || undefined,
      },
    });

    if (error) {
      console.error(`  ✗ FAIL: ${email} — ${error.message}`);
      errors++;
    } else {
      console.log(`  ✓ CREATED: ${email} (ID: ${data.user.id})`);
      created++;
    }
  }

  console.log(`\n=== Restore Summary ===`);
  console.log(`Created: ${created}`);
  console.log(`Errors: ${errors}`);
  console.log(`Already existed: ${alreadyExists.length}`);
  console.log(`\nStudents should use "Forgot password?" on the login page to set their password.`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
