-- ============================================================
-- Activity log: instrument names instead of ids (22 Oct 2026)
-- ============================================================
-- Booking log lines used to read "Booked mujt826uvycjztd5q". The app now
-- writes the instrument name; this rewrites the lines already recorded.
-- Data only, idempotent (a line already carrying the name has no id to
-- replace). Run once; not part of the disaster-recovery order.
-- ============================================================
UPDATE log_entries l
SET    action = replace(l.action, i.id, i.name)
FROM   instruments i
WHERE  l.category = 'booking'
AND    l.action LIKE '%' || i.id || '%';

-- Check: booking lines still mentioning an instrument id (expect 0)
SELECT count(*) AS still_with_id
FROM   log_entries l
WHERE  l.category = 'booking'
AND    EXISTS (SELECT 1 FROM instruments i WHERE l.action LIKE '%' || i.id || '%');
-- Sample (expect names)
SELECT "timestamp", user_name, action FROM log_entries WHERE category = 'booking' ORDER BY "timestamp" DESC LIMIT 5;
