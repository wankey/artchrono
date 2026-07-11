import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: enrollments } = await supabase
  .from('enrollments')
  .select('id')
  .eq('status', 'active');

let total = 0;
for (const e of enrollments ?? []) {
  const { error } = await supabase.rpc('regenerate_for_enrollment', { p_enrollment_id: e.id });
  if (!error) total++;
}
console.log(`Regenerated ${total}/${enrollments?.length ?? 0} enrollments`);
