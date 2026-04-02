/**
 * fix-week2-scores.js
 *
 * Fixes the EU AI Act Classification = 0 bug and applies lenient scoring.
 *
 * Problem: The API grading gave 0/10 for EU AI Act Classification to 99/100 students,
 * even though MD evaluations show they answered correctly (e.g. "✅ Correct (Limited Risk)").
 *
 * Fix:
 *   1. For 66 students with MD feedback: parse EU AI Act rating from their feedback text
 *   2. For 34 students without MD: assign fair default (8/10 = "Correct")
 *   3. Apply lenient rounding: bump borderline category scores up by 1 point
 *   4. Recalculate total_score
 *
 * Usage:
 *   node scripts/fix-week2-scores.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '..', 'week2-data.json');

// EU AI Act max = 10 points
const EU_AI_ACT_MAX = 10;

// Rating → score mapping (same as migration script)
const RATING_SCORES = {
  'excellent':    10,
  'strong':        9,
  'correct':       8,  // "Correct (Minimal Risk)", "Correct (Limited Risk)"
  'solid':         8,
  'detailed':      9,
  'good':          7,
  'reasonable':    7,
  'honest':        7,
  'needs depth':   5,
  'needs work':    3,
  'needs reconsideration': 3,
  'needs revision': 3,
  'needs justification': 3,
  'brief':         4,
  'too brief':     4,
  'very brief':    3,
  'minimal':       3,
  'questionable':  3,
  'conflicting':   4,
  'mixed':         4,
  'missing':       0,
  'misdirected':   3,
  'low classification': 3,
};

const RUBRIC_MAX = {
  'KAF Mapping': 12,
  'Policy-as-Code': 10,
  'Bounded Agent vs Chatbot': 8,
  'EU AI Act Classification': 10,
  'Risk Justification': 8,
  'Compliance Obligations': 10,
  'AI Literacy Plan': 10,
  'OWASP Top 10 Threats': 12,
  'HealthCare Audit Exercise': 10,
  'Golden Dataset': 10,
};

// ---------------------------------------------------------------------------
// Parse EU AI Act rating from feedback text
// ---------------------------------------------------------------------------

function parseEuAiActRating(feedbackText) {
  if (!feedbackText) return null;

  // Look for the table row: "| EU AI Act Classification | ✅ Correct (Limited Risk) |"
  const match = feedbackText.match(/EU AI Act Classification\s*\|\s*[✅⚠️]*\s*([^|]+)/i);
  if (!match) return null;

  const ratingStr = match[1].trim().toLowerCase();

  // Try exact matches first
  for (const [key, score] of Object.entries(RATING_SCORES)) {
    if (ratingStr.includes(key)) return score;
  }

  // If it contains "correct" anywhere
  if (ratingStr.includes('correct')) return 8;

  return null;
}

// ---------------------------------------------------------------------------
// Lenient scoring: bump borderline scores
// ---------------------------------------------------------------------------

function applyLeniency(categories) {
  const adjusted = { ...categories };

  for (const [cat, max] of Object.entries(RUBRIC_MAX)) {
    const score = adjusted[cat] || 0;
    const pct = max > 0 ? score / max : 0;

    // Bump up scores that are just below a threshold by 1 point
    // 69-74% → +1 (helps solidify "Solid" rating)
    // 84-89% → +1 (helps reach "Strong/Excellent")
    if (score < max) {
      if (pct >= 0.69 && pct < 0.75) {
        adjusted[cat] = score + 1;
      } else if (pct >= 0.84 && pct < 0.90) {
        adjusted[cat] = score + 1;
      }
    }
  }

  return adjusted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

let fixedFromMd = 0;
let fixedDefault = 0;
let leniencyBumps = 0;

for (const student of data.students) {
  const cats = student.category_scores;
  const oldTotal = student.total_score;

  // 1. Fix EU AI Act Classification
  const currentEuScore = cats['EU AI Act Classification'] || 0;

  if (currentEuScore === 0) {
    // Try to parse from feedback text
    const parsedScore = parseEuAiActRating(student.feedback_text);

    if (parsedScore !== null) {
      cats['EU AI Act Classification'] = parsedScore;
      fixedFromMd++;
    } else {
      // Default: 8/10 (Correct) — most students answered the question
      cats['EU AI Act Classification'] = 8;
      fixedDefault++;
    }
  }

  // 2. Apply lenient rounding to all categories
  const before = JSON.stringify(cats);
  const adjusted = applyLeniency(cats);
  if (JSON.stringify(adjusted) !== before) leniencyBumps++;

  student.category_scores = adjusted;

  // 3. Recalculate total
  student.total_score = Object.values(adjusted).reduce((sum, v) => sum + v, 0);
  student.passed = student.total_score >= 70;
}

// Save
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');

// Report
const scores = data.students.map(s => s.total_score);
console.log('=== Score Fix Results ===\n');
console.log('EU AI Act fixes:');
console.log('  From MD feedback:', fixedFromMd);
console.log('  Default (8/10):', fixedDefault);
console.log('  Already had score:', data.students.length - fixedFromMd - fixedDefault);
console.log('Leniency bumps applied:', leniencyBumps, 'students\n');

console.log('New score distribution:');
console.log('  Min:', Math.min(...scores));
console.log('  Max:', Math.max(...scores));
console.log('  Avg:', Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
console.log('  95+:', scores.filter(s => s >= 95).length);
console.log('  90-94:', scores.filter(s => s >= 90 && s < 95).length);
console.log('  85-89:', scores.filter(s => s >= 85 && s < 90).length);
console.log('  80-84:', scores.filter(s => s >= 80 && s < 85).length);
console.log('  75-79:', scores.filter(s => s >= 75 && s < 80).length);
console.log('  <75:', scores.filter(s => s < 75).length);
console.log('\nSaved to', DATA_PATH);
