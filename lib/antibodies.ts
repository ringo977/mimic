/**
 * Antibodies and dyes: structured description and emission bands.
 *
 * reagents.antibody (jsonb) describes what the card, the filters and the
 * panel builder need instead of the long commercial name:
 *   secondary  "<host> anti-<target> <Ig type>, <fluorophore>"
 *   primary    "<antigen> [<host> · <Ig type> · clone …]" (+ fluorophore when directly conjugated)
 *   dye        phalloidin, DAPI, Hoechst… (fluorophore only, antigen = what it stains)
 *   facs       flow-cytometry conjugated primaries ("APC anti-human CD34") — never proposed in IF panels
 * Rows written before `kind` existed are secondaries.
 */

export type AntibodyKind = 'primary' | 'secondary' | 'dye' | 'facs';
export interface AntibodyInfo {
  kind?: AntibodyKind;  // missing → 'secondary' (first version of the column)
  host: string;         // species it was raised in: Goat, Donkey, Mouse, Rabbit…
  target: string;       // secondaries: the species they recognise (anti-Mouse…); others: ''
  isotype: string;      // IgG (H+L), IgG1, IgG2a, IgG2b, IgY, IgM…
  fluorophore: string;  // AF-488, DyLight 550, FITC, Cy3, HRP… ('' for an unconjugated primary)
  antigen?: string;     // primaries / dyes: aSMA, Vimentin, F-actin, nuclei…
  clone?: string;       // primaries / facs: 1A4, EP1580Y…
}
/** @deprecated name kept for the first version; same shape. */
export type SecondaryAntibody = AntibodyInfo;
export const abKind = (ab: AntibodyInfo | undefined | null): AntibodyKind => ab?.kind ?? 'secondary';
export const antibodyKindMeta: Record<AntibodyKind, { label: string; short: string }> = {
  primary: { label: 'Primary antibody', short: '1°' }, secondary: { label: 'Secondary antibody', short: '2°' },
  dye: { label: 'Dye / stain', short: 'dye' }, facs: { label: 'FACS conjugate', short: 'FACS' },
};

/** Emission bands as the lab names them (filter cubes / detector channels). */
export type EmissionBand = 'blue' | 'green' | 'red' | 'farred' | 'ultrafarred';
export const EMISSION_BANDS: EmissionBand[] = ['blue', 'green', 'red', 'farred', 'ultrafarred'];
export const emissionBandMeta: Record<EmissionBand, { label: string; short: string; color: string; bg: string; text: string; hint: string }> = {
  blue:        { label: 'Blue',          short: 'Blue',    color: '#3b82f6', bg: '#dbeafe', text: '#1e3a8a', hint: 'DAPI channel · ex ~405 nm' },
  green:       { label: 'Green',         short: 'Green',   color: '#22c55e', bg: '#dcfce7', text: '#14532d', hint: 'FITC channel · ex ~488 nm' },
  red:         { label: 'Red',           short: 'Red',     color: '#ef4444', bg: '#fee2e2', text: '#7f1d1d', hint: 'TRITC / Cy3 channel · ex ~546–594 nm' },
  farred:      { label: 'Far-red',       short: 'Far-red', color: '#9333ea', bg: '#f3e8ff', text: '#581c87', hint: 'Cy5 channel · ex ~633–647 nm' },
  ultrafarred: { label: 'Ultra-far-red', short: 'UFR',     color: '#4b5563', bg: '#e5e7eb', text: '#1f2937', hint: 'Cy7 / NIR channel · ex ≥ 680 nm' },
};

// Ordered: tandem dyes (APC-Cy7, PE-Cy7, Cy5.5) before their base dye.
const NAMED_BAND: [string, EmissionBand][] = [
  ['apc-cy7', 'ultrafarred'], ['apc/cy7', 'ultrafarred'], ['pe-cy7', 'ultrafarred'], ['pe/cy7', 'ultrafarred'], ['cy5.5', 'ultrafarred'], ['cy7', 'ultrafarred'], ['irdye', 'ultrafarred'],
  ['cy5', 'farred'], ['apc', 'farred'], ['draq5', 'farred'], ['draq7', 'farred'], ['to-pro-3', 'farred'],
  ['propidium', 'red'], ['pi', 'red'],
  ['tritc', 'red'], ['cy3', 'red'], ['texas red', 'red'], ['rhodamine', 'red'], ['tamra', 'red'], ['pe', 'red'],
  ['fitc', 'green'], ['gfp', 'green'], ['oregon green', 'green'], ['bodipy', 'green'],
  ['dapi', 'blue'], ['hoechst', 'blue'], ['pacific blue', 'blue'], ['brilliant violet 421', 'blue'], ['bv421', 'blue'], ['amca', 'blue'],
];

/** Excitation wavelength (as written in Alexa Fluor / DyLight names) → band. */
export function wavelengthBand(nm: number): EmissionBand | null {
  if (!Number.isFinite(nm)) return null;
  if (nm < 450) return 'blue';          // 350, 405
  if (nm < 530) return 'green';         // 488, 514
  if (nm < 620) return 'red';           // 532, 546, 555, 568, 594
  if (nm < 680) return 'farred';        // 633, 647, 660
  return 'ultrafarred';                 // 680, 700, 750, 790, 800
}

/** Band of a fluorophore label: "AF-488", "Alexa Fluor™ Plus 647", "DyLight 550", "FITC", "Cy3"… null for HRP / biotin / unknown. */
export function fluorophoreBand(fluorophore: string | undefined | null): EmissionBand | null {
  if (!fluorophore) return null;
  const f = fluorophore.trim().toLowerCase().replace(/[™®]/g, '');
  for (const [k, band] of NAMED_BAND) if (f === k || (k.length > 2 && f.includes(k))) return band;
  const m = f.match(/(\d{3})/);
  if (m) return wavelengthBand(Number(m[1]));
  return null;
}

/** Normalise the fluorophore for display and matching: "Alexa Fluor™ Plus 488" → "AF-488". */
export function normalizeFluorophore(f: string): string {
  const s = f.trim().replace(/[™®]/g, '').replace(/\s+/g, ' ');
  const af = s.match(/^(?:alexa\s*fluor|af)\s*(?:plus\s*)?-?\s*(\d{3})$/i);
  if (af) return `AF-${af[1]}`;
  return s;
}

const SPECIES = ['Mouse', 'Rabbit', 'Rat', 'Chicken', 'Goat', 'Donkey', 'Sheep', 'Guinea Pig', 'Hamster', 'Human', 'Horse', 'Bovine', 'Llama', 'Alpaca'];
function canonSpecies(s: string): string {
  const t = s.trim().toLowerCase().replace(/-/g, ' ');
  const hit = SPECIES.find(x => x.toLowerCase() === t);
  return hit || (s.trim().charAt(0).toUpperCase() + s.trim().slice(1));
}

const FLUOR_RE = /(Alexa\s*Fluor[™®]?\s*(?:Plus\s*)?\d{3}|AF-?\d{3}|DyLight[™®]?\s*\d{3}|CF[™®]?\s*\d{3}|Cy\s?[357](?:\.5)?|FITC|TRITC|APC(?:[-/]Cy7)?|PE(?:[-/]Cy7)?|HRP|Biotin|Texas Red|Pacific Blue|Brilliant Violet \d{3})/i;
const cleanIso = (x: string) => x.replace(/\s*\bk$/i, '').replace(/\(H\+L\)/i, '(H+L)').trim();   // "IgG1 k" → "IgG1"
const cleanAntigen = (x: string) => x.replace(/\s*\((STOCK|sample)\)/gi, '').replace(/\s*(Mono|Poly)clo(?:nal|an) Antibody/gi, '').replace(/\s+/g, ' ').trim().replace(/\s+antibody$/i, '');   // "CD31 Monoclonal Antibody" → "CD31", "CXCR6 Antibody" → "CXCR6"

// "<antigen> (<clone>) <host> [mAb]" at the end of a name without the lab suffix. The clone must
// look like one (no spaces, a digit: C51, D21H3, 1A4), and never Human: that is a reactivity, not a host.
const TAIL_RE = /^(.+?)\s*\(([A-Za-z0-9./-]*\d[A-Za-z0-9./-]*)\)\s*(?:XP®?\s*)?(Mouse|Rabbit|Rat|Chicken|Goat|Donkey|Sheep|Guinea Pig|Hamster)(?:\s+(?:mAb|pAb|antibody))?\s*$/i;

/**
 * Split the lab suffix "[Host · Ig · clone …]". The separator is meant to be
 * the middle dot, but people also type "_", ",", ";", "|", " - ", " / " or
 * just a space ("[Rabbit_IgG]", "[Rabbit IgG]"). Not split: "/", "-" and "."
 * without spaces, which occur inside clone and dye names (JC/70A, DECMA-1, 9.2.27, AF-488, N/A).
 */
function splitSuffix(inner: string): string[] {
  const parts = inner.split(/\s*[·•∙‧・_,;|]\s*|\s+[-–/]\s+/).map(x => x.trim());
  const first = (parts[0] || '').toLowerCase();
  const sp = SPECIES.find(x => first.startsWith(x.toLowerCase() + ' '));
  if (sp) parts.splice(0, 1, parts[0].slice(0, sp.length), parts[0].slice(sp.length).trim());   // "Rabbit IgG" → Rabbit, IgG
  return parts;
}

/**
 * Best-effort parse of a commercial name, e.g.
 *   "Goat anti-Mouse IgG1 Cross-Adsorbed Secondary Antibody, Alexa Fluor™ 488 [Goat · IgG1 k · AF-488]"   → secondary
 *   "Alfa Smooth Muscle Actin (aSMA) [Mouse · IgG2a k · clone 1A4]"                                     → primary
 *   "N-cadherin [Mouse · IgG1 k · AF-647 · clone D4]"                                                    → conjugated primary
 *   "Phalloidin 546 [N/A · N/A · AF-546]", "DAPI", "Hoechst 33342"                                       → dye
 *   "APC anti-human CD34 [FACS · APC · clone 581]"                                                        → facs
 *   "CD163 [OTI2G12_Mouse_IgG1]", "Keratin 8/18 (C51) Mouse"                                             → primary
 * Returns null when nothing is recognised.
 */
export function parseAntibody(name: string): AntibodyInfo | null {
  const n = name.replace(/\s+/g, ' ').trim();
  const br = n.match(/\[([^\]]+)\]\s*$/);
  const parts = br ? splitSuffix(br[1]) : [];
  const head = cleanAntigen(br ? n.slice(0, br.index) : n);
  const partFluor = parts.find(x => FLUOR_RE.test(x) && !/^clone/i.test(x)) || '';
  const partClone = (parts.find(x => /^clone\b/i.test(x)) || '').replace(/^clone\s*/i, '');
  const partIso = parts.find(x => /^Ig[GAMYE]/i.test(x)) || '';

  // Dyes: phalloidin / nuclear stains, with or without the "[N/A · N/A · AF-546]" suffix
  if (/\b(phalloidin|dapi|hoechst|draq\d|sytox|nucblue|propidium|to-pro|wga)\b/i.test(head) || (parts[0] || '').toUpperCase() === 'N/A') {
    const f = partFluor || (head.match(FLUOR_RE) || [])[1] || (head.match(/\b(dapi|hoechst|draq\d)\b/i) ? head.match(/\b(dapi|hoechst|draq\d)\b/i)![1].toUpperCase().replace('HOECHST', 'Hoechst') : /propidium/i.test(head) ? 'PI' : '') || (/phalloidin\s*(\d{3})/i.test(head) ? `AF-${head.match(/phalloidin\s*(\d{3})/i)![1]}` : '');
    const antigen = /phalloidin/i.test(head) ? 'F-actin' : /dapi|hoechst|draq|sytox|nucblue|propidium|to-pro/i.test(head) ? 'Nuclei' : /wga/i.test(head) ? 'Membranes (WGA)' : head;
    return { kind: 'dye', host: '', target: '', isotype: '', fluorophore: f ? normalizeFluorophore(f) : '', antigen, clone: '' };
  }
  // FACS conjugates: our suffix starts with "FACS", or an anti-<species> CDxx marker
  if ((parts[0] || '').toUpperCase() === 'FACS' || /anti-\s?[A-Za-z]+(?: Pig)?\s+CD\d/i.test(n)) {
    const f = partFluor || parts[1] || (n.match(FLUOR_RE) || [])[1] || '';
    return { kind: 'facs', host: '', target: '', isotype: '', fluorophore: f ? normalizeFluorophore(f) : '', antigen: head, clone: partClone };
  }
  const anti = n.match(/anti-\s?([A-Za-z]+(?: Pig)?)/i);
  const antiSpecies = anti ? canonSpecies(anti[1]) : '';
  const hasIg = /\bIg[GAMYE]\b|\bIg[GAMYE]\d/i.test(n);
  // Secondary: anti-<species> with an Ig class
  if (anti && SPECIES.includes(antiSpecies) && hasIg) {
    let host = parts[0] || '';
    if (!host) { const h = n.match(/\b([A-Za-z]+(?: Pig)?)\s+anti-/i); host = h ? canonSpecies(h[1]) : ''; } else host = canonSpecies(host);   // "Alexa Fluor 647 goat anti-mouse IgG2b" → Goat
    let isotype = partIso || parts[1] || '';
    if (!isotype) { const iso = n.match(/\b(Ig[GAMYE](?:\d[ab]?)?(?:\s*\(H\+L\))?)/i); isotype = iso ? iso[1] : ''; }
    const fluor = partFluor || parts[2] || (n.match(FLUOR_RE) || [])[1] || '';
    if (!host && !isotype && !fluor) return null;
    return { kind: 'secondary', host, target: antiSpecies, isotype: cleanIso(isotype), fluorophore: fluor ? normalizeFluorophore(fluor) : '', antigen: '', clone: '' };
  }
  // Primary: "[Host · Ig · clone …]" suffix, or at least a species somewhere in it
  // ("[OTI2G12_Mouse_IgG1]": the clone first). A part that is neither species,
  // Ig class nor fluorophore is taken as the clone when none is spelled out.
  const isSpecies = (x: string) => SPECIES.includes(canonSpecies(x));
  const partHost = parts.find(isSpecies);
  if (partHost) {
    const rest = parts.find(x => x && x !== partFluor && !isSpecies(x) && !/^Ig[GAMYE]/i.test(x) && !/^clone\b/i.test(x) && !/^(n\/a|facs)$/i.test(x)) || '';
    return { kind: 'primary', host: canonSpecies(partHost), target: '', isotype: cleanIso(partIso), fluorophore: partFluor ? normalizeFluorophore(partFluor) : '', antigen: head.replace(/^anti-\s?/i, ''), clone: partClone || rest };
  }
  // No suffix, supplier style: "Keratin 8/18 (C51) Mouse mAb" → host and clone, Ig class unknown
  const tail = br ? null : head.match(TAIL_RE);
  if (tail) return { kind: 'primary', host: canonSpecies(tail[3]), target: '', isotype: '', fluorophore: '', antigen: tail[1].trim().replace(/^anti-\s?/i, ''), clone: tail[2].trim() };
  return null;
}
/** @deprecated use parseAntibody */
export const parseSecondaryAntibody = parseAntibody;

/** Stock categories whose items are expected to carry antibody data (and so to show up in the IF panel). */
export const isAntibodyCategory = (category: string | undefined | null) => /antibod/i.test(category || '');

/**
 * What the IF panel builder can do with an item. `missing` lists the fields
 * without which it is left out (or cannot be matched to a secondary).
 *  - primary:   needs the host species (or a conjugate with a known band)
 *  - secondary: needs the target species and a fluorophore with a known band
 *  - dye:       needs a fluorophore with a known band
 *  - FACS:      never proposed, by design
 */
export function panelStatus(ab: AntibodyInfo | null | undefined): { ok: boolean; missing: string[]; note: string } {
  if (!ab) return { ok: false, missing: ['antibody details'], note: 'No antibody details: not in the IF panel.' };
  const k = abKind(ab); const band = fluorophoreBand(ab.fluorophore);
  const missing: string[] = [];
  if (k === 'facs') return { ok: true, missing, note: 'FACS conjugate: left out of IF panels on purpose.' };
  if (k === 'primary') { if (!ab.host && !band) missing.push('host species'); }
  else if (k === 'secondary') { if (!ab.target) missing.push('target species (anti-…)'); if (!band) missing.push(ab.fluorophore ? 'a fluorophore with a known colour' : 'fluorophore'); }
  else if (!band) missing.push(ab.fluorophore ? 'a fluorophore with a known colour' : 'fluorophore');
  if (missing.length) return { ok: false, missing, note: `Not usable in the IF panel: missing ${missing.join(' and ')}.` };
  const what = k === 'primary' ? `primary${ab.host ? ` (${[ab.host, ab.isotype].filter(Boolean).join(' ')})` : ''}${band ? `, conjugated ${ab.fluorophore}` : ''}`
    : k === 'secondary' ? `secondary (${antibodyShortLabel(ab)})` : `dye (${ab.fluorophore})`;
  return { ok: true, missing, note: `In the IF panel as ${what}.` };
}

/** Empty record of a given kind (form default). */
export const emptyAntibody = (kind: AntibodyKind = 'secondary'): AntibodyInfo => ({ kind, host: '', target: '', isotype: '', fluorophore: '', antigen: '', clone: '' });

export function antibodyShortLabel(ab: AntibodyInfo): string {
  switch (abKind(ab)) {
    case 'primary': return [ab.antigen, [ab.host, ab.isotype].filter(Boolean).join(' '), ab.clone ? `clone ${ab.clone}` : '', ab.fluorophore].filter(Boolean).join(' · ');
    case 'dye': return [ab.antigen, ab.fluorophore].filter(Boolean).join(' · ');
    case 'facs': return [ab.antigen, ab.fluorophore, ab.clone ? `clone ${ab.clone}` : ''].filter(Boolean).join(' · ');
    default: return [ab.host && ab.target ? `${ab.host} anti-${ab.target}` : ab.target ? `anti-${ab.target}` : ab.host, ab.isotype, ab.fluorophore].filter(Boolean).join(' · ');
  }
}

export interface AntibodyFilter { kind?: AntibodyKind | ''; host?: string; target?: string; isotype?: string; band?: EmissionBand | '' }
/** Does this antibody match the filter (empty / undefined = any)? */
export function antibodyMatches(ab: AntibodyInfo | undefined, f: AntibodyFilter): boolean {
  if (!ab) return false;
  if (f.kind && abKind(ab) !== f.kind) return false;
  if (f.host && ab.host !== f.host) return false;
  if (f.target && ab.target !== f.target) return false;
  if (f.isotype && ab.isotype !== f.isotype) return false;
  if (f.band && fluorophoreBand(ab.fluorophore) !== f.band) return false;
  return true;
}

/** Distinct values for the dropdowns, sorted. */
export function antibodyOptions(list: (AntibodyInfo | undefined)[]): { hosts: string[]; targets: string[]; isotypes: string[]; kinds: AntibodyKind[] } {
  const hosts = new Set<string>(), targets = new Set<string>(), isotypes = new Set<string>(), kinds = new Set<AntibodyKind>();
  for (const ab of list) { if (!ab) continue; kinds.add(abKind(ab)); if (ab.host) hosts.add(ab.host); if (ab.target) targets.add(ab.target); if (ab.isotype) isotypes.add(ab.isotype); }
  const s = (x: Set<string>) => Array.from(x).sort((a, b) => a.localeCompare(b));
  return { hosts: s(hosts), targets: s(targets), isotypes: s(isotypes), kinds: (['primary', 'secondary', 'dye', 'facs'] as AntibodyKind[]).filter(k => kinds.has(k)) };
}

/**
 * Secondary ↔ primary compatibility. A secondary recognises the primary when
 * it is anti-<primary host> and its Ig specificity covers the primary's class:
 *   exact subclass (IgG1 ↔ IgG1)                → 'subclass'
 *   generic IgG / IgG (H+L) for any IgG subclass → 'generic'  (also binds the light chain of IgM / IgA)
 *   IgY ↔ IgY, IgM ↔ IgM                          → 'subclass'
 */
export type SecondaryFit = 'subclass' | 'generic' | null;
export function secondaryFits(secondary: AntibodyInfo, primary: AntibodyInfo): SecondaryFit {
  if (abKind(secondary) !== 'secondary' || !primary.host || secondary.target !== primary.host) return null;
  const p = primary.isotype.replace(/\s/g, '').toLowerCase();   // igg2a, igg, igy, igm, ''
  const sIso = secondary.isotype.replace(/\s/g, '').toLowerCase(); // igg(h+l), igg1, igy…
  const sGeneric = sIso === '' || sIso === 'igg' || sIso === 'igg(h+l)' || sIso === 'ig(h+l)';
  if (!p) return sGeneric ? 'generic' : null;                       // unknown primary class: only the generic ones
  if (sIso === p) return 'subclass';
  if (p.startsWith('igg') && sGeneric) return p === 'igg' ? 'subclass' : 'generic';
  if ((p === 'igm' || p === 'iga') && sGeneric) return 'generic';   // via the light chain
  return null;
}

/**
 * Panel: one slot per band. Two slots clash when they would light up the same
 * channel (same band) or when the same secondary would bind both primaries
 * (same target species and the same, or an overlapping "(H+L)", isotype).
 */
export interface PanelSlot { band: EmissionBand; target: string; isotype: string }
export function panelWarnings(slots: PanelSlot[], picked: (SecondaryAntibody | undefined)[]): string[] {
  const w: string[] = [];
  const bands = slots.map(s => s.band);
  if (new Set(bands).size !== bands.length) w.push('Two slots use the same band: they cannot be told apart.');
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    const a = slots[i], b = slots[j];
    if (!a.target || !b.target || a.target !== b.target) continue;
    const hl = (x: string) => /\(H\+L\)/i.test(x) || x === '';
    if (a.isotype === b.isotype || hl(a.isotype) || hl(b.isotype)) {
      w.push(`Slots ${i + 1} and ${j + 1} both target ${a.target}${a.isotype === b.isotype && a.isotype ? ` ${a.isotype}` : ''}: an (H+L) secondary would bind both primaries — use subclass-specific secondaries (IgG1 / IgG2a…).`);
    }
  }
  const hosts = new Set(picked.filter(Boolean).map(p => p!.host).filter(Boolean));
  if (hosts.size > 1) w.push(`Mixed hosts (${Array.from(hosts).join(', ')}): secondaries raised in different species may cross-react — prefer one host for the whole panel.`);
  const hostTargets = picked.filter(Boolean).map(p => p!.host);
  slots.forEach((s, i) => { if (s.target && hostTargets.some(h => h && h === s.target)) w.push(`Slot ${i + 1} targets ${s.target}, which is also the host of another secondary in the panel: it would bind it.`); });
  return Array.from(new Set(w));
}

/**
 * Panel from targets: the user picks primaries (and dyes) from the stock list;
 * each unconjugated primary gets a compatible secondary on a free band.
 * Dyes and directly-conjugated primaries have a fixed band.
 */
export interface PanelItem { id: string; antibody?: AntibodyInfo; currentStock: number; alertThreshold?: number }
export interface PanelCandidate<T extends PanelItem> { item: T; fit: SecondaryFit; band: EmissionBand }
export interface PanelEntry<T extends PanelItem> {
  item: T;                         // primary or dye
  band: EmissionBand | null;       // null when nothing fits
  secondary?: T;                   // chosen secondary (unconjugated primaries only)
  fit?: SecondaryFit;
  candidates: PanelCandidate<T>[]; // every compatible secondary with a known band
  fixed: boolean;                  // dye or conjugated primary: band comes from its own fluorophore
}
const BAND_PREFERENCE: EmissionBand[] = ['green', 'red', 'farred', 'blue', 'ultrafarred'];

export function assignPanel<T extends PanelItem>(items: T[], secondaries: T[], overrides: Record<string, string> = {}): PanelEntry<T>[] {
  const entries: PanelEntry<T>[] = items.map(item => {
    const ab = item.antibody!;
    const own = fluorophoreBand(ab.fluorophore);
    const fixed = abKind(ab) === 'dye' || (abKind(ab) === 'primary' && !!own);
    const candidates: PanelCandidate<T>[] = fixed ? [] : secondaries.flatMap(s => {
      const fit = s.antibody ? secondaryFits(s.antibody, ab) : null; const band = fluorophoreBand(s.antibody?.fluorophore);
      return fit && band ? [{ item: s, fit, band }] : [];
    });
    return { item, band: fixed ? own : null, candidates, fixed };
  });
  const used = new Set<EmissionBand>(entries.filter(e => e.fixed && e.band).map(e => e.band!));
  // Primaries sharing a host need subclass-specific secondaries
  const hostCount = new Map<string, number>();
  entries.filter(e => !e.fixed).forEach(e => hostCount.set(e.item.antibody!.host, (hostCount.get(e.item.antibody!.host) ?? 0) + 1));
  const chosenHosts = new Set<string>();
  // Hardest first: fewest candidates
  const order = entries.map((e, i) => i).filter(i => !entries[i].fixed).sort((a, b) => entries[a].candidates.length - entries[b].candidates.length);
  for (const i of order) {
    const e = entries[i];
    const shared = (hostCount.get(e.item.antibody!.host) ?? 0) > 1;
    const forced = overrides[e.item.id] ? e.candidates.find(c => c.item.id === overrides[e.item.id]) : undefined;
    const score = (c: PanelCandidate<T>) =>
      (used.has(c.band) ? -1000 : 0)
      + (shared && c.fit === 'subclass' ? 300 : 0) + (!shared && c.fit === 'generic' ? 50 : 0)
      + (c.item.currentStock > 0 ? 100 : 0) + (c.item.alertThreshold != null && c.item.currentStock <= c.item.alertThreshold ? -20 : 0)
      + (chosenHosts.size === 0 || chosenHosts.has(c.item.antibody!.host) ? 40 : 0)
      + (4 - BAND_PREFERENCE.indexOf(c.band));
    const best = forced ?? [...e.candidates].sort((a, b) => score(b) - score(a))[0];
    if (best) { e.secondary = best.item; e.fit = best.fit; e.band = best.band; used.add(best.band); chosenHosts.add(best.item.antibody!.host); }
  }
  return entries;
}

export function panelEntryWarnings<T extends PanelItem>(entries: PanelEntry<T>[], label: (t: T) => string): string[] {
  const w: string[] = [];
  const bands = entries.filter(e => e.band).map(e => e.band!);
  const dup = EMISSION_BANDS.filter(b => bands.filter(x => x === b).length > 1);
  dup.forEach(b => w.push(`${emissionBandMeta[b].label}: ${entries.filter(e => e.band === b).map(e => label(e.item)).join(' and ')} would light up the same channel.`));
  entries.filter(e => !e.fixed && !e.secondary).forEach(e => w.push(`${label(e.item)}: no secondary in the stock list recognises ${e.item.antibody!.host || 'its host'} ${e.item.antibody!.isotype}${e.candidates.length ? ' on a free band' : ''}.`));
  // Same host: a generic (H+L) secondary binds every primary of that species
  const prim = entries.filter(e => !e.fixed && e.item.antibody);
  for (let i = 0; i < prim.length; i++) for (let j = i + 1; j < prim.length; j++) {
    const a = prim[i], b = prim[j];
    if (!a.item.antibody!.host || a.item.antibody!.host !== b.item.antibody!.host) continue;
    const gen = [a, b].filter(e => e.secondary && e.fit === 'generic');
    if (gen.length) w.push(`${label(a.item)} and ${label(b.item)} are both ${a.item.antibody!.host}: ${gen.map(e => label(e.secondary!)).join(' and ')} would bind both — use subclass-specific secondaries (${[a, b].map(e => e.item.antibody!.isotype || '?').join(' / ')}) or a different host for one primary.`);
    else if (a.item.antibody!.isotype === b.item.antibody!.isotype) w.push(`${label(a.item)} and ${label(b.item)} are both ${a.item.antibody!.host} ${a.item.antibody!.isotype}: no secondary can tell them apart — stain sequentially or change one primary.`);
    else if (!a.item.antibody!.isotype || !b.item.antibody!.isotype) w.push(`${label(a.item)} / ${label(b.item)}: same host and one Ig class unknown — check that the secondaries do not cross-bind.`);
  }
  const secs = entries.filter(e => e.secondary).map(e => e.secondary!);
  const hosts = new Set(secs.map(s => s.antibody!.host).filter(Boolean));
  if (hosts.size > 1) w.push(`Secondaries from different hosts (${Array.from(hosts).join(', ')}): prefer a single host for the whole panel.`);
  secs.forEach(s => { entries.forEach(e => { if (e.item.antibody!.host && e.item.antibody!.host === s.antibody!.host && !e.fixed && !e.secondary) w.push(`${label(s)} is raised in ${s.antibody!.host}, the host of ${label(e.item)}: the anti-${s.antibody!.host} secondary of the panel would bind it.`); }); });
  secs.forEach(s => { secs.forEach(t => { if (s !== t && s.antibody!.target && s.antibody!.target === t.antibody!.host) w.push(`${label(s)} would bind ${label(t)} (raised in ${t.antibody!.host}).`); }); });
  [...entries.map(e => e.item), ...secs].forEach(x => { if (x.currentStock <= 0) w.push(`${label(x)} is out of stock.`); else if (x.alertThreshold != null && x.alertThreshold > 0 && x.currentStock <= x.alertThreshold) w.push(`${label(x)} is below its stock threshold.`); });
  return Array.from(new Set(w));
}
