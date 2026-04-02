/**
 * generate-missing-feedback.js
 *
 * Generates feedback text for students in week2-data.json who have scores
 * but no feedback_text. Uses category scores to derive ratings and build
 * personalized feedback in the same format as the MD evaluations.
 *
 * Usage:
 *   node scripts/generate-missing-feedback.js
 *
 * Reads/writes: ./week2-data.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '..', 'week2-data.json');

const RUBRIC = {
  'KAF Mapping':              { max: 12, area: 'KAF Mapping',              short: 'KAF mapping' },
  'Policy-as-Code':           { max: 10, area: 'Policy-as-Code',           short: 'Policy-as-Code rules' },
  'Bounded Agent vs Chatbot': { max:  8, area: 'Bounded vs. Chatbot',      short: 'bounded agent vs. chatbot distinction' },
  'EU AI Act Classification': { max: 10, area: 'EU AI Act Classification', short: 'EU AI Act risk classification' },
  'Risk Justification':       { max:  8, area: 'Risk Justification',       short: 'risk justification' },
  'Compliance Obligations':   { max: 10, area: 'Compliance Obligations',   short: 'compliance obligations analysis' },
  'AI Literacy Plan':         { max: 10, area: 'AI Literacy Plan',         short: 'AI Literacy training plan' },
  'OWASP Top 10 Threats':     { max: 12, area: 'OWASP Threats',            short: 'OWASP threat analysis' },
  'HealthCare Audit Exercise': { max: 10, area: 'Audit Exercise',          short: 'healthcare audit exercise' },
  'Golden Dataset':           { max: 10, area: 'Golden Dataset',           short: 'golden dataset specification' },
};

// ---------------------------------------------------------------------------
// Score → Rating mapping
// ---------------------------------------------------------------------------

function scoreToRating(score, max) {
  if (max === 0) return { emoji: '⚠️', label: 'N/A' };
  const pct = score / max;
  if (pct >= 0.95) return { emoji: '✅', label: 'Excellent' };
  if (pct >= 0.85) return { emoji: '✅', label: 'Strong' };
  if (pct >= 0.75) return { emoji: '✅', label: 'Solid' };
  if (pct >= 0.65) return { emoji: '✅', label: 'Good' };
  if (pct >= 0.45) return { emoji: '⚠️', label: 'Needs depth' };
  if (pct >= 0.20) return { emoji: '⚠️', label: 'Needs work' };
  if (pct > 0)     return { emoji: '⚠️', label: 'Minimal' };
  return { emoji: '⚠️', label: 'Missing' };
}

function firstName(fullName) {
  return (fullName || '').split(/\s+/)[0] || 'there';
}

// ---------------------------------------------------------------------------
// Category-specific strength descriptions
// ---------------------------------------------------------------------------

const STRENGTH_DESCRIPTIONS = {
  'KAF Mapping':              'Your KAF mapping demonstrates a clear understanding of the Kyndryl AI Factory layers and how they apply to your agent architecture.',
  'Policy-as-Code':           'Your Policy-as-Code rules are well-structured with proper IF/THEN logic and logging actions.',
  'Bounded Agent vs Chatbot': 'You clearly articulated the distinction between bounded AI agents and simple chatbots.',
  'EU AI Act Classification': 'Your EU AI Act risk classification is accurate with proper regulatory references.',
  'Risk Justification':       'Your risk justification provides solid reasoning with supporting evidence.',
  'Compliance Obligations':   'You identified the relevant compliance obligations and proposed practical implementation measures.',
  'AI Literacy Plan':         'Your AI Literacy plan is well-structured with clear stakeholder groups and training levels.',
  'OWASP Top 10 Threats':     'Your OWASP threat analysis identifies relevant threats with thoughtful mitigation strategies.',
  'HealthCare Audit Exercise': 'You demonstrated strong audit skills by correctly identifying security and compliance issues.',
  'Golden Dataset':           'Your golden dataset specification shows a good understanding of evaluation framework design.',
};

// ---------------------------------------------------------------------------
// Category-specific growth area descriptions
// ---------------------------------------------------------------------------

const GROWTH_DESCRIPTIONS = {
  'KAF Mapping':              'Try to be more specific when mapping each KAF layer to your agent — concrete examples of services, APIs, or tools at each layer strengthen the mapping significantly.',
  'Policy-as-Code':           'Focus on making your Policy-as-Code rules more specific — include concrete IF/THEN/AND conditions with explicit logging or alerting actions rather than general guidelines.',
  'Bounded Agent vs Chatbot': 'Deepen your analysis of what makes a bounded agent different from a chatbot — think about decision boundaries, autonomy levels, and guardrails rather than just functional differences.',
  'EU AI Act Classification': 'The EU AI Act risk classification needs more attention. Make sure to identify the correct risk tier (Minimal, Limited, High, or Unacceptable) and reference specific Articles or Annexes that support your classification.',
  'Risk Justification':       'Strengthen your risk justification by referencing specific EU AI Act Articles or Annexes. A strong justification connects your agent\'s capabilities directly to regulatory criteria.',
  'Compliance Obligations':   'Be more specific about which compliance obligations apply to your agent\'s risk tier. Even Minimal Risk systems have Article 4 (AI Literacy) obligations — distinguish between mandatory requirements and voluntary best practices.',
  'AI Literacy Plan':         'Your AI Literacy plan would benefit from more structure — define clear competency levels (awareness → understanding → competence → mastery) and map specific training content to each stakeholder group.',
  'OWASP Top 10 Threats':     'Go deeper in your OWASP threat analysis — for each threat, describe the specific attack vector relevant to your agent and propose a concrete mitigation, not just a general best practice.',
  'HealthCare Audit Exercise': 'In the healthcare audit exercise, provide more detailed evidence for each finding. A strong audit report follows the "what I saw → why it matters → what to fix" structure with specific OWASP and KAF layer references.',
  'Golden Dataset':           'Your golden dataset needs more structure — specify the total number of test questions, percentage distribution across categories, and include concrete example questions for each category.',
};

// ---------------------------------------------------------------------------
// Generate feedback
// ---------------------------------------------------------------------------

function generateFeedback(student) {
  const name = firstName(student.student_name);
  const cats = student.category_scores || {};
  const totalScore = student.total_score || 0;

  // Build ratings
  const ratings = [];
  const strengths = [];
  const growthAreas = [];

  for (const [category, info] of Object.entries(RUBRIC)) {
    const score = cats[category] || 0;
    const rating = scoreToRating(score, info.max);
    ratings.push({ area: info.area, emoji: rating.emoji, label: rating.label });

    const pct = info.max > 0 ? score / info.max : 0;
    if (pct >= 0.85) {
      strengths.push(category);
    } else if (pct < 0.65) {
      growthAreas.push(category);
    }
  }

  // Build rating table
  let ratingTable = '| Area | Rating |\n|------|--------|\n';
  for (const r of ratings) {
    ratingTable += '| ' + r.area + ' | ' + r.emoji + ' ' + r.label + ' |\n';
  }

  // Build "What you did well" section
  let wellSection = '';
  if (strengths.length > 0) {
    const topStrengths = strengths.slice(0, 4);
    wellSection = '**What you did well:** ' + topStrengths.map(function(cat) {
      return STRENGTH_DESCRIPTIONS[cat];
    }).join(' ');
  } else {
    wellSection = '**What you did well:** You completed all sections of the assessment and demonstrated a baseline understanding across the governance, compliance, and security topics covered in Week 2.';
  }

  // Build "Focus areas for growth" section
  let growthSection = '';
  if (growthAreas.length > 0) {
    growthSection = '**Focus areas for growth:**\n' + growthAreas.map(function(cat) {
      return '- ' + GROWTH_DESCRIPTIONS[cat];
    }).join('\n');
  } else {
    // Even strong students get some encouragement
    const midAreas = [];
    for (const [category, info] of Object.entries(RUBRIC)) {
      const score = cats[category] || 0;
      const pct = info.max > 0 ? score / info.max : 0;
      if (pct >= 0.65 && pct < 0.85) {
        midAreas.push(category);
      }
    }
    if (midAreas.length > 0) {
      growthSection = '**Focus areas for growth:**\n' + midAreas.slice(0, 2).map(function(cat) {
        return '- ' + GROWTH_DESCRIPTIONS[cat];
      }).join('\n');
    } else {
      growthSection = '**Focus areas for growth:** Excellent work across the board. Continue pushing for depth and specificity in your regulatory arguments and security analyses.';
    }
  }

  // Build Week 3 recommendation
  var week3Rec;
  if (totalScore >= 85) {
    week3Rec = '**For Week 3:** Strong foundations across governance and security. Keep building on this momentum — focus on translating your knowledge into practical implementation patterns.';
  } else if (totalScore >= 75) {
    week3Rec = '**For Week 3:** Solid understanding of the core concepts. Focus on adding more depth and specificity to your regulatory and security analyses — concrete examples and Article references make a real difference.';
  } else {
    week3Rec = '**For Week 3:** You have the fundamentals in place. Prioritize revisiting the EU AI Act classification framework and the OWASP Top 10 for LLMs — these are foundational for everything that follows in Weeks 3-5.';
  }

  // Assemble full feedback
  var feedback = 'Hi ' + name + ',\n\n' +
    'Thank you for your Week 2 Capstone submission. Here is your assessment:\n\n' +
    ratingTable + '\n' +
    wellSection + '\n\n' +
    growthSection + '\n\n' +
    week3Rec;

  return feedback;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

var data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
var generated = 0;
var regenerated = 0;

// Tag for generated feedback so we can re-generate
var GENERATED_TAG = 'Thank you for your Week 2 Capstone submission. Here is your assessment:';

for (var i = 0; i < data.students.length; i++) {
  var student = data.students[i];
  var isGenerated = student.feedback_text && student.feedback_text.indexOf(GENERATED_TAG) >= 0
    && student.feedback_text.indexOf('What you did well:') > 0
    && student.feedback_text.indexOf('Focus areas for growth:') > 0;
  // Only look at feedback that we generated (has our structure but no unique hand-written content)
  // MD feedback starts with "Hi X," but also has specific references to student's work
  var isHandWritten = student.feedback_text && (
    student.feedback_text.indexOf('secret-redaction') >= 0 ||
    student.feedback_text.indexOf('your agent') >= 0 ||
    student.feedback_text.indexOf('Your ') >= 0 && student.feedback_text.indexOf('agent is') >= 0
  );

  if (!student.feedback_text && student.total_score != null) {
    student.feedback_text = generateFeedback(student);
    generated++;
  } else if (isGenerated && !isHandWritten && student.total_score != null) {
    student.feedback_text = generateFeedback(student);
    regenerated++;
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');

var withFb = data.students.filter(function(s) { return s.feedback_text; }).length;
console.log('Generated feedback for ' + generated + ' new students.');
console.log('Re-generated feedback for ' + regenerated + ' students (score update).');
console.log('Total with feedback now: ' + withFb + '/' + data.students.length);
