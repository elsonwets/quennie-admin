// Writes supabase/seed-demo.sql from the demo data in src/server/seed.ts.
// Run: node scripts/seed-sql.ts  (Node 22.18+ runs TypeScript directly)
import { writeFileSync } from 'node:fs'
import { seed } from '../src/server/seed.ts'

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`
const workspace = seed()
let sql = '-- Demo data for testing. Dates are relative to the day this file was generated.\n-- Run in SQL Editor after setup.sql. Skips rows that already exist.\n\n'

for (const [table, rows] of Object.entries(workspace)) {
  if (!rows.length) continue
  // created_at decreases row by row so the app shows them in the original order.
  const values = (rows as Array<{ id: string }>).map(({ id, ...data }, i) => `  (${quote(id)}, ${quote(JSON.stringify(data))}::jsonb, now() - interval '${i} seconds')`)
  sql += `insert into public.${table} (id, data, created_at) values\n${values.join(',\n')}\non conflict (id) do nothing;\n\n`
}

writeFileSync(new URL('../supabase/seed-demo.sql', import.meta.url), sql)
console.log('supabase/seed-demo.sql written')
