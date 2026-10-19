#!/usr/bin/env node
/**
 * Create Supabase Auth accounts for lab members in one go.
 *
 * Reads a CSV with at least the columns `name,email` (the output of the
 * "who has no account yet" query in the SQL editor), creates one confirmed
 * auth user per row with a random temporary password, and writes
 * <csv>-created-<date>.csv (name, email, temporary password) next to the
 * input — send each line to its owner privately, then delete the file.
 * Existing accounts are skipped, so the script can be re-run.
 *
 * Usage (the service-role key never goes on the command line or in git):
 *
 *   read -s SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY
 *   node scripts/create-lab-accounts.mjs assets-originals/import-2026-09/accounts-to-create.csv
 *   unset SUPABASE_SERVICE_ROLE_KEY
 *
 * Key: Supabase → Project Settings → API → service_role (Reveal). It bypasses
 * RLS: use it only here, on your machine, and never paste it anywhere else.
 * Add --dry-run to see what would happen without creating anything.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL || 'https://vfruyyrpriymhmelgidr.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv.find(a => a.endsWith('.csv'));
const dry = process.argv.includes('--dry-run');

if (!file) { console.error('usage: node scripts/create-lab-accounts.mjs <list.csv> [--dry-run]'); process.exit(1); }
if (!KEY && !dry) { console.error('SUPABASE_SERVICE_ROLE_KEY is not set (see the header of this script)'); process.exit(1); }

// Temporary password that satisfies the app rule (8+, upper, lower, digit)
// and is easy to read aloud / type on a phone: no 0/O, 1/l/I.
const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghjkmnpqrstuvwxyz', D = '23456789';
const pick = (s, n) => Array.from({ length: n }, () => s[randomInt(s.length)]).join('');
const tempPassword = () => `${pick(U, 1)}${pick(L, 4)}-${pick(D, 4)}-${pick(L, 3)}${pick(U, 1)}`;

const rows = readFileSync(file, 'utf8').trim().split(/\r?\n/).map(l => l.split(','));
const head = rows.shift().map(h => h.trim().toLowerCase());
const iName = head.indexOf('name'), iEmail = head.indexOf('email');
if (iEmail < 0) { console.error('the CSV needs an "email" column'); process.exit(1); }
const people = rows.map(r => ({ name: iName >= 0 ? r[iName].trim() : '', email: r[iEmail].trim().toLowerCase() })).filter(p => p.email);

const supabase = dry ? null : createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function existingEmails() {
  const seen = new Set();
  if (dry) return seen;
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) seen.add((u.email || '').toLowerCase());
    if (data.users.length < 200) break;
  }
  return seen;
}

const have = await existingEmails();
const created = [], skipped = [], failed = [];
for (const p of people) {
  if (have.has(p.email)) { skipped.push(p); continue; }
  const password = tempPassword();
  if (dry) { created.push({ ...p, password: '(dry run)' }); continue; }
  const { error } = await supabase.auth.admin.createUser({
    email: p.email, password, email_confirm: true, user_metadata: { name: p.name },
  });
  if (error) failed.push({ ...p, error: error.message }); else created.push({ ...p, password });
}

const out = file.replace(/\.csv$/, `-created-${new Date().toISOString().slice(0, 10)}.csv`);
if (created.length && !dry) {
  writeFileSync(out, 'name,email,temporary_password\n' + created.map(c => `${c.name},${c.email},${c.password}`).join('\n') + '\n');
}
console.log(`${dry ? 'would create' : 'created'}: ${created.length}`);
for (const c of created) console.log(`   ${c.email}`);
if (skipped.length) { console.log(`already had an account (skipped): ${skipped.length}`); for (const s of skipped) console.log(`   ${s.email}`); }
if (failed.length) { console.log(`FAILED: ${failed.length}`); for (const f of failed) console.log(`   ${f.email} — ${f.error}`); }
if (created.length && !dry) console.log(`\npasswords written to ${out} — send them privately, then delete the file.`);
