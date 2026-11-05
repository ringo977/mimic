-- ============================================================
-- Secondary antibodies: structured fields + backfill (05/11/2026)
-- ============================================================
-- Marco: the commercial name is long and gets cut; what must always be
-- visible is host and target species, the Ig type and the fluorophore
-- (wavelength), and one should be able to search on them — and build a
-- 3-to-5-colour panel (blue, green, red, far-red, ultra-far-red).
--
-- One jsonb column, same shape as the client type SecondaryAntibody
-- (lib/antibodies.ts): {"host","target","isotype","fluorophore"}. The band
-- is derived from the fluorophore on the client. Edited from the reagent
-- form (block "Secondary antibody", with "Detect from name"), written by
-- the usual upsert — no new policy or trigger.
--
-- Backfill: our names carry the lab suffix "[Host · Isotype · Fluorophore]"
-- (e.g. "[Goat · IgG1 k · AF-488]") and "anti-<Species>"; rows without the
-- suffix get what the regexes find. Rows that already have the column set
-- are left alone, so the script is re-runnable.
-- ============================================================

ALTER TABLE reagents ADD COLUMN IF NOT EXISTS antibody jsonb;
COMMENT ON COLUMN reagents.antibody IS 'Secondary antibody: {host, target, isotype, fluorophore} — lib/antibodies.ts';

-- Backfill
WITH src AS (
  SELECT id, name,
         substring(name FROM '\[([^\]]+)\]\s*$')                              AS suffix,
         initcap(substring(name FROM '(?i)anti-\s?([A-Za-z]+(?: Pig)?)'))     AS target_raw
    FROM reagents
   WHERE antibody IS NULL
     AND name ~* 'anti-\s?(mouse|rabbit|rat|chicken|goat|donkey|sheep|guinea pig|hamster|human|horse|bovine|llama|alpaca)\M'
     -- an Ig class, and not a FACS-conjugated primary ("APC anti-human CD34", "Rat anti-Mouse CD45")
     AND name ~* '\mIg[GAMYE]'
     AND name !~* 'anti-\s?[a-z]+(?: pig)?\s+CD\d'
), parts AS (
  SELECT id, name, target_raw,
         nullif(trim(split_part(suffix, '·', 1)), '')  AS s_host,
         nullif(trim(split_part(suffix, '·', 2)), '')  AS s_iso,
         nullif(trim(split_part(suffix, '·', 3)), '')  AS s_fluor
    FROM src
), parsed AS (
  SELECT id,
         coalesce(s_host, initcap(substring(name FROM '(?i)\m(mouse|rabbit|rat|chicken|goat|donkey|sheep|guinea pig|hamster|horse|bovine|llama|alpaca)\s+anti-')), '') AS host,
         CASE WHEN target_raw = 'Guinea pig' THEN 'Guinea Pig' ELSE target_raw END                            AS target,
         regexp_replace(regexp_replace(coalesce(s_iso, substring(name FROM '(?i)\m(Ig[GAMYE](?:\d[ab]?)?(?:\s*\(H\+L\))?)'), ''),
                        '\s*\mk$', '', 'i'), '\(h\+l\)', '(H+L)', 'i')                                        AS isotype,
         -- "Alexa Fluor™ Plus 647" / "AF-647" → AF-647; other dyes kept as written
         CASE
           WHEN coalesce(s_fluor, '') ~* '^(alexa\s*fluor|af)' THEN 'AF-' || substring(s_fluor FROM '(\d{3})')
           WHEN s_fluor IS NOT NULL THEN s_fluor
           WHEN name ~* 'alexa\s*fluor' THEN 'AF-' || substring(name FROM '(?i)alexa\s*fluor[™®]?\s*(?:plus\s*)?(\d{3})')
           WHEN name ~* 'dylight\s*\d{3}' THEN 'DyLight ' || substring(name FROM '(?i)dylight[™®]?\s*(\d{3})')
           ELSE coalesce(substring(name FROM '(?i)\m(FITC|TRITC|Cy\s?[357](?:\.5)?|APC(?:[-/]Cy7)?|PE(?:[-/]Cy7)?|HRP|Biotin|Texas Red|Pacific Blue)\M'), '')
         END                                                                                                 AS fluorophore
    FROM parts
)
UPDATE reagents r
   SET antibody = jsonb_build_object('host', p.host, 'target', p.target, 'isotype', p.isotype, 'fluorophore', p.fluorophore)
  FROM parsed p
 WHERE r.id = p.id;

-- ------------------------------------------------------------
-- Checks — expect: column_ok = true, then every secondary with its fields
-- (look for blanks in host / isotype / fluorophore and fix them from the
-- app: Edit → "Secondary antibody")
-- ------------------------------------------------------------
SELECT (SELECT count(*) = 1 FROM information_schema.columns WHERE table_name = 'reagents' AND column_name = 'antibody') AS column_ok,
       (SELECT count(*) FROM reagents WHERE antibody IS NOT NULL) AS n_secondaries;

SELECT antibody ->> 'host' AS host, antibody ->> 'target' AS target, antibody ->> 'isotype' AS isotype, antibody ->> 'fluorophore' AS fluorophore,
       current_stock, unit, name
  FROM reagents WHERE antibody IS NOT NULL
 ORDER BY antibody ->> 'target', antibody ->> 'isotype', antibody ->> 'fluorophore';
