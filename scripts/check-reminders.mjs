import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const THRESHOLD = 2;
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const dedupKey = `low_balance_${today}`;

const { data: enrollments, error: queryErr } = await supabase
  .from('enrollments')
  .select('id, student_id, teacher_id, classes_remaining')
  .eq('status', 'active')
  .lte('classes_remaining', THRESHOLD);

if (queryErr) {
  console.error('Query failed:', queryErr.message);
  process.exit(1);
}

let inserted = 0;
let skipped = 0;

for (const enr of enrollments ?? []) {
  const { error: insertErr } = await supabase
    .from('reminders')
    .insert({
      enrollment_id: enr.id,
      student_id: enr.student_id,
      teacher_id: enr.teacher_id,
      type: 'low_balance',
      threshold_value: THRESHOLD,
      notification_channel: 'in_app_banner',
      dedup_key: dedupKey,
    });

  if (insertErr) {
    // UNIQUE violation = already inserted today → skip gracefully
    if (insertErr.code === '23505') {
      skipped++;
    } else {
      console.error(`Insert failed for enrollment ${enr.id}:`, insertErr.message);
    }
  } else {
    inserted++;
  }
}

console.log(
  `Reminder check done. ${inserted} inserted, ${skipped} skipped (already exist today), ${(enrollments ?? []).length} low-balance enrollments found.`
);
