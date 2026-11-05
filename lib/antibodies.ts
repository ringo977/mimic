/**
 * Secondary antibodies: structured description and emission bands.
 *
 * A secondary is "<host> anti-<target> <Ig type>, <fluorophore>". The card
 * shows those four things instead of the long commercial name, the list
 * filters on them, and the panel builder combines them by emission band.
 * Server column: reagents.antibody (jsonb, same shape as SecondaryAntibody).
 */

export interface SecondaryAntibody {
  host: string;        // Goat, Donkey…
  target: string;      // Mouse, Rabbit, Rat, Chicken, Goat, Human…
  isotype: string;     // IgG (H+L), IgG1, IgG2a, IgG2b, IgY, IgM…
  fluorophore: string; // AF-488, Alexa Fluor 647, FITC, Cy3, HRP…
}

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
  ['cy5', 'farred'], ['apc', 'farred'],
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

/**
 * Best-effort parse of a commercial name, e.g.
 *   "Goat anti-Mouse IgG1 Cross-Adsorbed Secondary Antibody, Alexa Fluor™ 488 [Goat · IgG1 k · AF-488]"
 *   "Donkey anti-Rat IgG (H+L) Highly Cross-Adsorbed, Alexa Fluor™ 647"
 * Returns null when it does not look like a secondary (no "anti-<species>").
 */
export function parseSecondaryAntibody(name: string): SecondaryAntibody | null {
  const n = name.replace(/\s+/g, ' ').trim();
  const anti = n.match(/anti-\s?([A-Za-z]+(?: Pig)?)/i);
  if (!anti) return null;
  const target = canonSpecies(anti[1]);
  if (!SPECIES.includes(target)) return null;   // "Anti-CD31" is a primary, not a secondary
  // Conjugated primaries for FACS ("APC anti-human CD34", "Rat anti-Mouse CD45"): a marker, no Ig class → not a secondary
  if (!/\bIg[GAMYE]\b|\bIg[GAMYE]\d/i.test(n) || /anti-\s?[A-Za-z]+(?: Pig)?\s+CD\d/i.test(n)) return null;
  // Lab suffix "[Host · Isotype · Fluorophore]" when present
  const br = n.match(/\[([^\]]+)\]\s*$/);
  const parts = br ? br[1].split('·').map(x => x.trim()) : [];
  let host = parts[0] || '';
  if (!host) {
    const h = n.match(/\b([A-Za-z]+(?: Pig)?)\s+anti-/i);   // "Alexa Fluor 647 goat anti-mouse IgG2b" → Goat
    host = h ? canonSpecies(h[1]) : '';
  } else host = canonSpecies(host);
  let isotype = parts[1] || '';
  if (!isotype) {
    const iso = n.match(/\b(Ig[GAMYE](?:\d[ab]?)?(?:\s*\(H\+L\))?)/i);
    isotype = iso ? iso[1] : '';
  }
  isotype = isotype.replace(/\s*\bk\b$/i, '').replace(/\(H\+L\)/i, '(H+L)').trim();   // "IgG1 k" → "IgG1"
  let fluor = parts[2] || '';
  if (!fluor) {
    const f = n.match(/(Alexa\s*Fluor[™®]?\s*(?:Plus\s*)?\d{3}|DyLight[™®]?\s*\d{3}|CF[™®]?\s*\d{3}|Cy\s?[357](?:\.5)?|FITC|TRITC|APC(?:[-/]Cy7)?|PE(?:[-/]Cy7)?|HRP|Biotin|Texas Red|Pacific Blue|Brilliant Violet \d{3})/i);
    fluor = f ? f[1] : '';
  }
  if (!host && !isotype && !fluor) return null;
  return { host, target, isotype, fluorophore: fluor ? normalizeFluorophore(fluor) : '' };
}

export function antibodyShortLabel(ab: SecondaryAntibody): string {
  return [ab.host && ab.target ? `${ab.host} anti-${ab.target}` : ab.target ? `anti-${ab.target}` : ab.host, ab.isotype, ab.fluorophore].filter(Boolean).join(' · ');
}

/** Does this antibody match the filter (empty / undefined = any)? */
export function antibodyMatches(ab: SecondaryAntibody | undefined, f: { host?: string; target?: string; isotype?: string; band?: EmissionBand | '' }): boolean {
  if (!ab) return false;
  if (f.host && ab.host !== f.host) return false;
  if (f.target && ab.target !== f.target) return false;
  if (f.isotype && ab.isotype !== f.isotype) return false;
  if (f.band && fluorophoreBand(ab.fluorophore) !== f.band) return false;
  return true;
}

/** Distinct values for the dropdowns, sorted. */
export function antibodyOptions(list: (SecondaryAntibody | undefined)[]): { hosts: string[]; targets: string[]; isotypes: string[] } {
  const hosts = new Set<string>(), targets = new Set<string>(), isotypes = new Set<string>();
  for (const ab of list) { if (!ab) continue; if (ab.host) hosts.add(ab.host); if (ab.target) targets.add(ab.target); if (ab.isotype) isotypes.add(ab.isotype); }
  const s = (x: Set<string>) => Array.from(x).sort((a, b) => a.localeCompare(b));
  return { hosts: s(hosts), targets: s(targets), isotypes: s(isotypes) };
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
