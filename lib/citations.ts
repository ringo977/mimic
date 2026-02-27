export interface Publication {
  id: number;
  authors: string[];
  title: string;
  journal: string;
  year: number;
  volume?: string;
  pages?: string;
  doi?: string;
  pdf?: string;
  type: string;
}

function sanitize(s: string): string {
  return s.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, 30);
}

function firstAuthorLastName(pub: Publication): string {
  const first = pub.authors[0] || 'Unknown';
  return first.split(',')[0].trim();
}

function shortTitle(pub: Publication): string {
  return sanitize(pub.title.split(/[:.]/)[0].substring(0, 40));
}

function fileBaseName(pub: Publication): string {
  return `${sanitize(firstAuthorLastName(pub))}_${pub.year}_${shortTitle(pub)}`;
}

export function formatAPA(pub: Publication): string {
  const authors = pub.authors.length > 20
    ? `${pub.authors.slice(0, 19).join(', ')}, ... ${pub.authors[pub.authors.length - 1]}`
    : pub.authors.join(', ');
  
  let ref = `${authors} (${pub.year}). ${pub.title}. *${pub.journal}*`;
  if (pub.volume) ref += `, *${pub.volume}*`;
  if (pub.pages) ref += `, ${pub.pages}`;
  ref += '.';
  if (pub.doi) ref += ` https://doi.org/${pub.doi}`;
  return ref;
}

export function formatIEEE(pub: Publication): string {
  const authorList = pub.authors.map(a => {
    const parts = a.split(',').map(p => p.trim());
    if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
    return a;
  });

  const authors = authorList.length > 6
    ? `${authorList.slice(0, 6).join(', ')} et al.`
    : authorList.join(', ');

  let ref = `${authors}, "${pub.title}," *${pub.journal}*`;
  if (pub.volume) ref += `, vol. ${pub.volume}`;
  if (pub.pages) ref += `, pp. ${pub.pages}`;
  ref += `, ${pub.year}.`;
  if (pub.doi) ref += ` doi: ${pub.doi}.`;
  return ref;
}

export function toBibTeX(pub: Publication): string {
  const key = `${sanitize(firstAuthorLastName(pub))}${pub.year}`;
  const entryType = pub.type === 'Book Chapter' ? 'incollection' : 'article';
  const lines = [
    `@${entryType}{${key},`,
    `  author    = {${pub.authors.join(' and ')}},`,
    `  title     = {${pub.title}},`,
    pub.type === 'Book Chapter'
      ? `  booktitle = {${pub.journal}},`
      : `  journal   = {${pub.journal}},`,
    `  year      = {${pub.year}},`,
  ];
  if (pub.volume) lines.push(`  volume    = {${pub.volume}},`);
  if (pub.pages) lines.push(`  pages     = {${pub.pages}},`);
  if (pub.doi) {
    lines.push(`  doi       = {${pub.doi}},`);
    lines.push(`  url       = {https://doi.org/${pub.doi}},`);
  }
  lines.push('}');
  return lines.join('\n');
}

export function toRIS(pub: Publication): string {
  const ty = pub.type === 'Book Chapter' ? 'CHAP' : 'JOUR';
  const lines = [`TY  - ${ty}`];
  pub.authors.forEach(a => lines.push(`AU  - ${a}`));
  lines.push(`TI  - ${pub.title}`);
  if (pub.type === 'Book Chapter') {
    lines.push(`BT  - ${pub.journal}`);
  } else {
    lines.push(`JO  - ${pub.journal}`);
  }
  lines.push(`PY  - ${pub.year}`);
  if (pub.volume) lines.push(`VL  - ${pub.volume}`);
  if (pub.pages) lines.push(`SP  - ${pub.pages}`);
  if (pub.doi) {
    lines.push(`DO  - ${pub.doi}`);
    lines.push(`UR  - https://doi.org/${pub.doi}`);
  }
  lines.push('ER  - ');
  return lines.join('\n');
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

export function exportAllBibTeX(pubs: Publication[]): void {
  const content = pubs.map(toBibTeX).join('\n\n');
  downloadTextFile('mimic-lab-publications.bib', content);
}

export function exportAllRIS(pubs: Publication[]): void {
  const content = pubs.map(toRIS).join('\n\n');
  downloadTextFile('mimic-lab-publications.ris', content);
}

export function downloadBibTeX(pub: Publication): void {
  downloadTextFile(`${fileBaseName(pub)}.bib`, toBibTeX(pub));
}

export function downloadRIS(pub: Publication): void {
  downloadTextFile(`${fileBaseName(pub)}.ris`, toRIS(pub));
}
