/**
 * diagnose-week2.js — Quick diagnostic to check what's actually in the DB.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/diagnose-week2.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 1. Check assessment record
  const { data: assessment } = await supabase
    .from('assessments')
    .select('*')
    .eq('week_number', 2)
    .single();

  console.log('=== ASSESSMENT ===');
  console.log(JSON.stringify(assessment, null, 2));

  // 2. Get ALL student_scores for this assessment (no filter)
  const { data: scores, error } = await supabase
    .from('student_scores')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('student_name', { ascending: true });

  if (error) { console.error('ERROR:', error.message); return; }

  console.log('\n=== SUMMARY ===');
  console.log('Total records:', scores.length);

  // Count by status
  const byStatus = {};
  scores.forEach(s => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });
  console.log('By status:', byStatus);

  // Count what fields are populated
  const hasScore = scores.filter(s => s.total_score != null).length;
  const hasFeedback = scores.filter(s => s.feedback_text && s.feedback_text.length > 0).length;
  const hasCategories = scores.filter(s => s.category_scores && Object.keys(s.category_scores).length > 0).length;
  const hasBoth = scores.filter(s => s.total_score != null && s.feedback_text && s.feedback_text.length > 0).length;

  console.log('Has total_score:', hasScore);
  console.log('Has feedback_text:', hasFeedback);
  console.log('Has category_scores:', hasCategories);
  console.log('Has BOTH score+feedback:', hasBoth);

  // 3. Show first 3 records in full detail (one known evaluated student)
  console.log('\n=== SAMPLE RECORDS (first 3) ===');
  for (const s of scores.slice(0, 3)) {
    console.log('\n---', s.student_name, '(' + s.student_email + ')');
    console.log('  status:', s.status);
    console.log('  graded_by:', s.graded_by);
    console.log('  total_score:', s.total_score);
    console.log('  passed:', s.passed);
    console.log('  category_scores:', JSON.stringify(s.category_scores));
    console.log('  feedback_text:', s.feedback_text ? s.feedback_text.substring(0, 100) + '...' : 'NULL');
    console.log('  raw_answers:', s.raw_answers ? 'present (' + JSON.stringify(s.raw_answers).length + ' chars)' : 'NULL');
  }

  // 4. Check specifically for known students from MD evaluations
  const knownStudents = ['petr.lukas@kyndryl.com', 'peter.vasik@kyndryl.com', 'mateusz.morkisz@kyndryl.com'];
  console.log('\n=== KNOWN EVALUATED STUDENTS ===');
  for (const email of knownStudents) {
    const record = scores.find(s => s.student_email === email);
    if (record) {
      console.log('\n', record.student_name, '(' + email + ')');
      console.log('  total_score:', record.total_score);
      console.log('  feedback_text:', record.feedback_text ? record.feedback_text.substring(0, 150) + '...' : 'NULL');
      console.log('  category_scores:', JSON.stringify(record.category_scores));
      console.log('  status:', record.status, '| graded_by:', record.graded_by);
    } else {
      console.log('\n  NOT FOUND:', email);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
