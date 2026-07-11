import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear + 1];

for (const year of years) {
  try {
    const res = await fetch(`http://timor.tech/api/holiday/year/${year}`);
    const json = await res.json();
    const records = Object.entries(json.holiday ?? {}).map(([key, info]) => {
      const [month, day] = key.split('-');
      return {
        date: `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`,
        name: info.name,
        type: info.holiday ? 'holiday' : 'workday',
        source: 'timor.tech',
        fetched_at: new Date().toISOString(),
      };
    });
    if (records.length > 0) {
      const { error } = await supabase.from('holidays').upsert(records, { onConflict: 'date' });
      if (!error) console.log(`Synced ${records.length} holidays for ${year}`);
      else console.error(`Failed ${year}:`, error);
    }
  } catch (err) {
    console.error(`Sync error ${year}:`, err.message);
  }
}
