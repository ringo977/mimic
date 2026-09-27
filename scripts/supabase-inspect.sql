-- ============================================================
-- MiMic Lab Manager — live database inspection (READ ONLY)
-- ============================================================
-- PURPOSE: dump what the live Supabase project actually contains
-- (columns, constraints, indexes, RLS policies, functions, triggers)
-- so that scripts/supabase-schema-reference.sql can be realigned.
-- Two constraints created by hand in the dashboard had already drifted
-- (lab_users_role_check, reagents.expiry_date NOT NULL) and only showed
-- up as failed imports — this script makes the drift visible.
--
-- HOW TO RUN
--   Supabase → SQL Editor → paste → Run.
--   One result set, two columns (section, item). Use "Download CSV"
--   (top-right of the results pane) and send the file.
--   Nothing is modified: only catalog tables are read.
-- ============================================================

WITH cols AS (
  SELECT 1 AS ord, 'COLUMN' AS section,
         format('%s.%s %s%s%s',
                c.table_name, c.column_name,
                CASE WHEN c.data_type = 'character varying' AND c.character_maximum_length IS NOT NULL
                     THEN format('varchar(%s)', c.character_maximum_length)
                     WHEN c.data_type = 'numeric' AND c.numeric_precision IS NOT NULL
                     THEN format('numeric(%s,%s)', c.numeric_precision, c.numeric_scale)
                     ELSE c.data_type END,
                CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
                COALESCE(' DEFAULT ' || c.column_default, '')) AS item,
         c.table_name::text AS t, c.ordinal_position::int AS pos
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
     AND tb.table_type = 'BASE TABLE'
   WHERE c.table_schema = 'public'
),
cons AS (
  SELECT 2, 'CONSTRAINT',
         format('%s  %s', rel.relname, pg_get_constraintdef(con.oid)) ||
         format('   [%s]', con.conname),
         rel.relname::text, 0::int
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
   WHERE ns.nspname = 'public'
),
idx AS (
  SELECT 3, 'INDEX', indexdef, tablename::text, 0::int
    FROM pg_indexes
   WHERE schemaname = 'public'
     AND indexname NOT IN (SELECT conname FROM pg_constraint)  -- skip PK/UNIQUE backing indexes
),
rls AS (
  SELECT 4, 'RLS',
         format('%s  rls=%s  force=%s  policies=%s',
                rel.relname, rel.relrowsecurity, rel.relforcerowsecurity,
                (SELECT count(*) FROM pg_policies p
                  WHERE p.schemaname = 'public' AND p.tablename = rel.relname)),
         rel.relname::text, 0::int
    FROM pg_class rel
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
   WHERE ns.nspname = 'public' AND rel.relkind = 'r'
),
pol AS (
  SELECT 5, 'POLICY',
         format('%s  %s  %s  to=%s  using=%s  check=%s',
                tablename, policyname, cmd, array_to_string(roles, ','),
                COALESCE(qual, '—'), COALESCE(with_check, '—')),
         tablename::text, 0::int
    FROM pg_policies
   WHERE schemaname IN ('public', 'storage')
),
fns AS (
  SELECT 6, 'FUNCTION',
         format('%s(%s) returns %s  %s  %s',
                p.proname, pg_get_function_arguments(p.oid), pg_get_function_result(p.oid),
                CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'security invoker' END,
                COALESCE('config=' || array_to_string(p.proconfig, ' '), 'config=—')),
         p.proname::text, 0::int
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public'
),
trg AS (
  SELECT 7, 'TRIGGER',
         format('%s  %s', rel.relname, pg_get_triggerdef(t.oid)),
         rel.relname::text, 0::int
    FROM pg_trigger t
    JOIN pg_class rel ON rel.oid = t.tgrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
   WHERE ns.nspname = 'public' AND NOT t.tgisinternal
),
counts AS (
  SELECT 8, 'ROW COUNT',
         format('%s  ~%s rows', rel.relname,
                CASE WHEN rel.reltuples < 0 THEN 'never analyzed'
                     ELSE rel.reltuples::bigint::text END),
         rel.relname::text, 0::int
    FROM pg_class rel
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
   WHERE ns.nspname = 'public' AND rel.relkind = 'r'
),
buckets AS (
  SELECT 9, 'BUCKET',
         format('%s  public=%s  size_limit=%s  mime=%s', id, public,
                COALESCE(file_size_limit::text, '—'),
                COALESCE(array_to_string(allowed_mime_types, ','), '—')),
         id::text, 0::int
    FROM storage.buckets
)
SELECT section, item FROM (
  SELECT * FROM cols
  UNION ALL SELECT * FROM cons
  UNION ALL SELECT * FROM idx
  UNION ALL SELECT * FROM rls
  UNION ALL SELECT * FROM pol
  UNION ALL SELECT * FROM fns
  UNION ALL SELECT * FROM trg
  UNION ALL SELECT * FROM counts
  UNION ALL SELECT * FROM buckets
) all_rows(ord, section, item, t, pos)
ORDER BY ord, t, pos, item;
