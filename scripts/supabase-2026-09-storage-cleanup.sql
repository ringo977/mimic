-- ============================================================
-- MiMic Lab Manager — remove the stray open policy on the manuals bucket
-- ============================================================
-- Run in: Supabase Dashboard → SQL Editor. Idempotent.
--
-- Found on 27 Sep 2026 in the supabase-inspect.sql dump:
--
--   objects  manuals_storage_all  ALL  to=public
--            using=(bucket_id = 'manuals')  check=(bucket_id = 'manuals')
--
-- It is not created by any script in this repository: it is the dashboard
-- template ("give users access to all files in a bucket") applied when the
-- bucket was created. Because `public` includes the `anon` role, it lets
-- anyone holding the anon key — which is embedded in the public site —
-- list, download, overwrite and delete every PDF, regardless of the four
-- manuals_bucket_* policies (RLS policies are OR-ed; the widest one wins).
-- "Private bucket" only disables unauthenticated public URLs; it does not
-- restrict the API.
--
-- The four intended policies stay:
--   manuals_bucket_select  members
--   manuals_bucket_insert  lab_can_upload_manuals()
--   manuals_bucket_update  admin, or uploader on own file
--   manuals_bucket_delete  admin
-- ============================================================

DROP POLICY IF EXISTS "manuals_storage_all" ON storage.objects;

-- Check: exactly four policies on storage.objects, none "to public",
-- none FOR ALL.
SELECT policyname, cmd, roles, qual AS using_expr, with_check
FROM   pg_policies
WHERE  schemaname = 'storage' AND tablename = 'objects'
ORDER  BY policyname;
