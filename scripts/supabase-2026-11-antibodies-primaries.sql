-- ============================================================
-- Antibodies: primaries, dyes and FACS conjugates (05/11/2026)
-- ============================================================
-- Follow-up of supabase-2026-11-secondary-antibodies.sql (run that first).
-- Marco: the panel builder should start from the primaries, not from the
-- colours. Same jsonb column reagents.antibody, now with
--   kind      primary | secondary | dye | facs
--   antigen   primaries / dyes: aSMA, Vimentin, F-actin, Nuclei…
--   clone     primaries / facs: 1A4, EP1580Y…
-- Rows written by the first script get kind = 'secondary'.
--
-- Backfill from our lab suffix "[Host · Ig · clone …]" / "[N/A · N/A · AF-546]"
-- / "[FACS · APC · clone 581]" and from the dye names (DAPI, Hoechst, phalloidin).
-- Rows that already have the column are left alone except for adding kind;
-- the script is re-runnable.
-- ============================================================

-- 1. First version → kind = 'secondary'
UPDATE reagents SET antibody = antibody || '{"kind":"secondary","antigen":"","clone":""}'::jsonb
 WHERE antibody IS NOT NULL AND antibody ->> 'kind' IS NULL;

-- 1b. Antigen without the "Monoclonal / Polyclonal Antibody" tail (re-runnable)
UPDATE reagents SET antibody = jsonb_set(antibody, '{antigen}', to_jsonb(trim(regexp_replace(antibody ->> 'antigen', '\s*(Mono|Poly)clo(nal|an) Antibody', '', 'gi'))))
 WHERE antibody ->> 'kind' = 'primary' AND antibody ->> 'antigen' ~* 'clo(nal|an) antibody';

-- 2. Backfill the rest
WITH src AS (
  SELECT id, name, category,
         -- "CD31 Monoclonal Antibody" → "CD31", "CXCR6 Antibody" → "CXCR6"
         regexp_replace(trim(regexp_replace(regexp_replace(regexp_replace(name, '\s*\[[^\]]*\]\s*$', ''), '\s*\((STOCK|sample)\)', '', 'gi'), '\s*(Mono|Poly)clo(nal|an) Antibody', '', 'gi')),
                        '\s+antibody$', '', 'i') AS head,
         -- separators: the middle dot, but also "_", ",", ";", "|", " - ", " / " and a plain space
         -- between species and Ig class ("[Rabbit_IgG]", "[Rabbit IgG]") — 13/11/2026
         coalesce((SELECT array_agg(trim(x)) FROM unnest(regexp_split_to_array(
           regexp_replace(substring(name FROM '\[([^\]]+)\]\s*$'),
                          '^\s*(mouse|rabbit|rat|chicken|goat|donkey|sheep|guinea pig|hamster|human|horse|bovine|llama|alpaca)\s+(Ig)', '\1·\2', 'i'),
           '\s*[·•∙‧・_,;|]\s*|\s+[-–/]\s+')) x), '{}'::text[]) AS parts
    FROM reagents
   WHERE antibody IS NULL
     -- secondaries belong to supabase-2026-11-secondary-antibodies.sql (run it first)
     AND NOT (name ~* 'anti-\s?(mouse|rabbit|rat|chicken|goat|donkey|sheep|guinea pig|hamster|human|horse|bovine|llama|alpaca)\M'
              AND name ~* '\mIg[GAMYE]' AND name !~* 'anti-\s?[a-z]+(?: pig)?\s+CD\d')
), prt AS (
  SELECT *,
         (SELECT x FROM unnest(parts) x WHERE x !~* '^clone' AND x ~* '^(alexa|AF-?\d{3}|dylight|CF\s?\d{3}|cy\s?[357]|fitc|tritc|apc|pe\M|hrp|biotin|texas red|pacific blue|brilliant violet|dapi|hoechst)' LIMIT 1) AS p_fluor,
         (SELECT regexp_replace(x, '^clone\s*', '', 'i') FROM unnest(parts) x WHERE x ~* '^clone\M' LIMIT 1)                                                     AS p_clone,
         (SELECT x FROM unnest(parts) x WHERE x ~* '^Ig[GAMYE]' LIMIT 1)                                                                                        AS p_iso,
         -- the species may come in any position ("[OTI2G12_Mouse_IgG1]": the clone first) — 13/11/2026
         (SELECT initcap(x) FROM unnest(parts) x WHERE x ~* '^(mouse|rabbit|rat|chicken|goat|donkey|sheep|guinea pig|hamster|human|horse|bovine|llama|alpaca)$' LIMIT 1)                                                                                AS p_host,
         -- a part that is neither species, Ig class nor fluorophore: the clone, when none is spelled out
         (SELECT x FROM unnest(parts) x WHERE x <> '' AND x !~* '^(mouse|rabbit|rat|chicken|goat|donkey|sheep|guinea pig|hamster|human|horse|bovine|llama|alpaca)$' AND x !~* '^Ig[GAMYE]' AND x !~* '^clone\M' AND x !~* '^(n/a|facs)$'
                                          AND x !~* '^(alexa|AF-?\d{3}|dylight|CF\s?\d{3}|cy\s?[357]|fitc|tritc|apc|pe\M|hrp|biotin|texas red|pacific blue|brilliant violet|dapi|hoechst)' LIMIT 1)                                                                                         AS p_rest,
         -- no suffix, supplier style, antibody categories only: "Keratin 8/18 (C51) Mouse mAb" → antigen, clone, host
         -- (the clone must look like one: no spaces, a digit)
         CASE WHEN category ILIKE '%antibod%' AND name !~ '\[[^\]]+\]\s*$' THEN
           regexp_match(head, '^(.+?)\s*\(([A-Za-z0-9./-]*\d[A-Za-z0-9./-]*)\)\s*(?:XP®?\s*)?(mouse|rabbit|rat|chicken|goat|donkey|sheep|guinea pig|hamster)(?:\s+(?:mAb|pAb|antibody))?\s*$', 'i')
         END AS tail
    FROM src
), cls AS (
  SELECT *,
         CASE
           WHEN head ~* '\m(phalloidin|dapi|hoechst|draq\d|sytox|nucblue|propidium|to-pro|wga)\M' OR upper(parts[1]) = 'N/A' THEN 'dye'
           WHEN upper(parts[1]) = 'FACS' OR name ~* 'anti-\s?[a-z]+(?: pig)?\s+CD\d' THEN 'facs'
           WHEN p_host IS NOT NULL OR tail IS NOT NULL THEN 'primary'
         END AS kind
    FROM prt
), parsed AS (
  SELECT id, kind,
         CASE WHEN kind = 'primary' THEN coalesce(p_host, initcap(tail[3])) ELSE '' END AS host,
         CASE WHEN kind = 'primary' THEN regexp_replace(regexp_replace(coalesce(p_iso, ''), '\s*\mk$', '', 'i'), '\(h\+l\)', '(H+L)', 'i') ELSE '' END AS isotype,
         CASE
           WHEN kind = 'dye' AND p_fluor IS NULL AND head ~* 'phalloidin\s*\d{3}' THEN 'AF-' || substring(head FROM '(?i)phalloidin\s*(\d{3})')
           WHEN kind = 'dye' AND p_fluor IS NULL AND head ~* '\mdapi\M'    THEN 'DAPI'
           WHEN kind = 'dye' AND p_fluor IS NULL AND head ~* '\mhoechst\M' THEN 'Hoechst'
           WHEN kind = 'dye' AND p_fluor IS NULL AND head ~* '\mdraq5\M'   THEN 'DRAQ5'
           WHEN kind = 'dye' AND p_fluor IS NULL AND head ~* '\mdraq7\M'   THEN 'DRAQ7'
           WHEN kind = 'dye' AND p_fluor IS NULL AND head ~* '\mpropidium\M' THEN 'PI'
           WHEN kind = 'facs' AND p_fluor IS NULL THEN coalesce(parts[2], '')
           WHEN coalesce(p_fluor, '') ~* '^(alexa\s*fluor|af)' THEN 'AF-' || substring(p_fluor FROM '(\d{3})')
           ELSE coalesce(p_fluor, '')
         END AS fluorophore,
         CASE
           WHEN kind = 'dye' AND head ~* 'phalloidin' THEN 'F-actin'
           WHEN kind = 'dye' AND head ~* 'dapi|hoechst|draq|sytox|nucblue|propidium|to-pro' THEN 'Nuclei'
           WHEN kind = 'dye' AND head ~* '\mwga\M' THEN 'Membranes (WGA)'
           WHEN kind = 'primary' THEN regexp_replace(trim(CASE WHEN p_host IS NULL THEN tail[1] ELSE head END), '^anti-\s?', '', 'i')
           ELSE head
         END AS antigen,
         CASE WHEN kind = 'primary' THEN coalesce(nullif(p_clone, ''), CASE WHEN p_host IS NULL THEN trim(tail[2]) ELSE p_rest END, '')
              WHEN kind = 'facs' THEN coalesce(p_clone, '') ELSE '' END AS clone
    FROM cls WHERE kind IS NOT NULL
)
UPDATE reagents r
   SET antibody = jsonb_build_object('kind', p.kind, 'host', p.host, 'target', '', 'isotype', p.isotype, 'fluorophore', p.fluorophore, 'antigen', p.antigen, 'clone', p.clone)
  FROM parsed p
 WHERE r.id = p.id;

-- ------------------------------------------------------------
-- Checks — expect: a count per kind (secondary ≈ 31, primary ≈ 45, dye ≈ 7,
-- facs ≈ 18), no row without kind; then the primaries and dyes to eyeball
-- (blank host / isotype on a primary → fix from the app: Edit → Antibody / dye)
-- ------------------------------------------------------------
SELECT antibody ->> 'kind' AS kind, count(*) FROM reagents WHERE antibody IS NOT NULL GROUP BY 1 ORDER BY 1;

SELECT antibody ->> 'kind' AS kind, antibody ->> 'antigen' AS antigen, antibody ->> 'host' AS host, antibody ->> 'isotype' AS isotype,
       antibody ->> 'clone' AS clone, antibody ->> 'fluorophore' AS fluorophore, current_stock, name
  FROM reagents WHERE antibody ->> 'kind' IN ('primary', 'dye')
 ORDER BY 1, 2;

-- Last (the one the SQL Editor shows): everything in the antibody categories,
-- with the rows the IF panel cannot use on top ("NOT in panel": nothing was
-- recognised in the name). Fix those from the app (Stock → Edit → Antibody /
-- dye), or correct the name suffix to "[Host · Ig · clone …]" and re-run.
SELECT CASE WHEN antibody IS NULL THEN 'NOT in panel' ELSE antibody ->> 'kind' END AS panel,
       name, category, antibody ->> 'host' AS host, antibody ->> 'isotype' AS isotype, antibody ->> 'fluorophore' AS fluorophore
  FROM reagents
 WHERE antibody IS NOT NULL OR category ILIKE '%antibod%'
 ORDER BY (antibody IS NULL) DESC, 1, 2;
