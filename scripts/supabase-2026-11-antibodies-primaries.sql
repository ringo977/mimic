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
  SELECT id, name,
         regexp_replace(regexp_replace(regexp_replace(name, '\s*\[[^\]]*\]\s*$', ''), '\s*\((STOCK|sample)\)', '', 'gi'), '\s*(Mono|Poly)clo(nal|an) Antibody', '', 'gi') AS head,
         coalesce((SELECT array_agg(trim(x)) FROM unnest(string_to_array(substring(name FROM '\[([^\]]+)\]\s*$'), '·')) x), '{}'::text[]) AS parts
    FROM reagents
   WHERE antibody IS NULL
), cls AS (
  SELECT *,
         (SELECT x FROM unnest(parts) x WHERE x !~* '^clone' AND x ~* '^(alexa|AF-?\d{3}|dylight|CF\s?\d{3}|cy\s?[357]|fitc|tritc|apc|pe\M|hrp|biotin|texas red|pacific blue|brilliant violet|dapi|hoechst)' LIMIT 1) AS p_fluor,
         (SELECT regexp_replace(x, '^clone\s*', '', 'i') FROM unnest(parts) x WHERE x ~* '^clone\M' LIMIT 1)                                                     AS p_clone,
         (SELECT x FROM unnest(parts) x WHERE x ~* '^Ig[GAMYE]' LIMIT 1)                                                                                        AS p_iso,
         CASE
           WHEN head ~* '\m(phalloidin|dapi|hoechst|draq\d|sytox|nucblue|propidium|to-pro|wga)\M' OR upper(parts[1]) = 'N/A' THEN 'dye'
           WHEN upper(parts[1]) = 'FACS' OR name ~* 'anti-\s?[a-z]+(?: pig)?\s+CD\d' THEN 'facs'
           WHEN parts[1] ~* '^(mouse|rabbit|rat|chicken|goat|donkey|sheep|guinea pig|hamster|human|horse|bovine|llama|alpaca)$' THEN 'primary'
         END AS kind
    FROM src
), parsed AS (
  SELECT id, kind,
         CASE WHEN kind = 'primary' THEN initcap(parts[1]) ELSE '' END AS host,
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
           WHEN kind = 'primary' THEN regexp_replace(head, '^anti-\s?', '', 'i')
           ELSE head
         END AS antigen,
         CASE WHEN kind IN ('primary', 'facs') THEN coalesce(p_clone, '') ELSE '' END AS clone
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
