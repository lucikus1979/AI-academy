/**
 * AI Academy – Content Unlock Guard
 * Blocks access to lesson pages before their scheduled date.
 * To update dates, edit COURSE_SCHEDULE below.
 */
(function () {
  'use strict';

  // ── Course Schedule ─────────────────────────────────────────────────
  // Format: day_number: 'YYYY-MM-DD'
  // All lessons unlock at 00:00 local time on the specified date.
  var COURSE_SCHEDULE = {
    11: '2026-02-23',
    12: '2026-02-24',
    13: '2026-02-25',
    14: '2026-02-26',
    15: '2026-02-26',
    16: '2026-03-02',
    17: '2026-03-03',
    18: '2026-03-04',
    19: '2026-03-05',
    20: '2026-03-06',
    21: '2026-03-09',
    22: '2026-03-10',
    23: '2026-03-11',
    24: '2026-03-12',
    25: '2026-03-13',
  };

  // ── Read day number from meta tag ────────────────────────────────────
  var meta = document.querySelector('meta[name="course-day"]');
  if (!meta) return; // No meta tag → no restriction

  var dayNum = parseInt(meta.getAttribute('content'), 10);
  if (!dayNum || !COURSE_SCHEDULE[dayNum]) return; // Unknown day → no restriction

  var unlockDateStr = COURSE_SCHEDULE[dayNum];
  var now = new Date();
  var today = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0'); // YYYY-MM-DD in local time

  if (today >= unlockDateStr) return; // Already unlocked → do nothing

  // ── Format unlock date for display ──────────────────────────────────
  var parts = unlockDateStr.split('-');
  var displayDate = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  ).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Days remaining ───────────────────────────────────────────────────
  var todayDate = new Date(today);
  var unlockDate = new Date(unlockDateStr);
  var diffMs = unlockDate - todayDate;
  var diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  var daysText = diffDays === 1 ? '1 day' : diffDays + ' days';

  // ── Inject overlay styles ────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '.aa-locked-overlay{',
      'position:fixed;inset:0;z-index:9999;',
      'background:var(--bg-primary,#0f1419);',
      'display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;',
      'text-align:center;padding:2rem;',
      'font-family:"Plus Jakarta Sans",system-ui,sans-serif;',
    '}',
    '.aa-locked-icon{font-size:3.5rem;margin-bottom:1rem;}',
    '.aa-locked-badge{',
      'display:inline-flex;align-items:center;gap:0.4rem;',
      'background:rgba(59,130,246,0.12);',
      'border:1px solid rgba(59,130,246,0.35);',
      'color:#60a5fa;',
      'padding:0.25rem 0.9rem;border-radius:20px;',
      'font-size:0.72rem;font-weight:700;letter-spacing:0.06em;',
      'font-family:"JetBrains Mono",monospace;',
      'margin-bottom:1.25rem;',
    '}',
    '.aa-locked-title{',
      'font-size:clamp(1.5rem,4vw,2.2rem);font-weight:800;',
      'color:var(--text-primary,#f1f5f9);',
      'margin:0 0 0.6rem;line-height:1.2;',
    '}',
    '.aa-locked-subtitle{',
      'font-size:1rem;color:var(--text-secondary,#94a3b8);',
      'margin:0 0 2rem;max-width:44ch;line-height:1.6;',
    '}',
    '.aa-locked-date{',
      'display:inline-block;',
      'background:var(--bg-secondary,#1a1f26);',
      'border:1px solid var(--border,#2d3748);',
      'border-radius:12px;padding:1rem 1.75rem;',
      'color:var(--text-primary,#f1f5f9);',
      'margin-bottom:2rem;',
    '}',
    '.aa-locked-date .label{',
      'font-size:0.7rem;text-transform:uppercase;',
      'letter-spacing:0.08em;color:var(--text-muted,#64748b);',
      'font-family:"JetBrains Mono",monospace;margin-bottom:0.3rem;',
    '}',
    '.aa-locked-date .date-val{',
      'font-size:1.1rem;font-weight:700;color:#60a5fa;',
    '}',
    '.aa-locked-date .days-left{',
      'font-size:0.8rem;color:var(--text-secondary,#94a3b8);',
      'margin-top:0.2rem;',
    '}',
    '.aa-locked-back{',
      'display:inline-flex;align-items:center;gap:0.4rem;',
      'padding:0.55rem 1.25rem;border-radius:8px;',
      'background:var(--bg-secondary,#1a1f26);',
      'border:1px solid var(--border,#2d3748);',
      'color:var(--text-secondary,#94a3b8);',
      'font-size:0.85rem;font-weight:600;text-decoration:none;',
      'transition:border-color .2s,color .2s;',
    '}',
    '.aa-locked-back:hover{border-color:#3b82f6;color:#60a5fa;}',
  ].join('');
  document.head.appendChild(style);

  // ── Inject overlay HTML ──────────────────────────────────────────────
  var overlay = document.createElement('div');
  overlay.className = 'aa-locked-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-live', 'assertive');
  overlay.innerHTML =
    '<div class="aa-locked-icon">🔒</div>' +
    '<div class="aa-locked-badge">AI ACADEMY 2026 · DAY ' + dayNum + '</div>' +
    '<h1 class="aa-locked-title">This lesson is not available yet</h1>' +
    '<p class="aa-locked-subtitle">' +
      'Your team will access this content together on the scheduled date. ' +
      'Check back then &mdash; or revisit an earlier lesson in the meantime.' +
    '</p>' +
    '<div class="aa-locked-date">' +
      '<div class="label">Unlocks on</div>' +
      '<div class="date-val">' + displayDate + '</div>' +
      '<div class="days-left">In ' + daysText + '</div>' +
    '</div>' +
    '<a href="/index.html" class="aa-locked-back">&#8592; Back to Dashboard</a>';

  // Wait for body to be available
  function inject() {
    if (document.body) {
      document.body.prepend(overlay);
      // Hide scrollbar while locked
      document.body.style.overflow = 'hidden';
    } else {
      setTimeout(inject, 10);
    }
  }
  inject();

})();
