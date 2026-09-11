# MiMic Lab Website — Politecnico di Milano

Sito web del **MiMic Lab** (Microfluidics and Biomimetic Microsystems Laboratory), DEIB, Politecnico di Milano. Online su **[mimic.polimi.it](https://mimic.polimi.it)**.

Sito statico Next.js 14 (`output: 'export'`): i contenuti pubblici vivono in file JSON (`data/`), il build produce HTML/CSS/JS puri in `out/`. Include il **Lab Manager** (`/lab`), app interna di gestione laboratorio basata su Supabase.

## 📚 Documentazione

| Documento | Contenuto |
|---|---|
| [`MANUALE_SITO.md`](MANUALE_SITO.md) | **Manuale completo** (italiano): architettura, sezioni, dati, deploy, Lab Manager, criticità |
| [`SITE_UPDATE_GUIDE.md`](SITE_UPDATE_GUIDE.md) | Guida operativa rapida (inglese): come aggiornare contenuti e pubblicare |
| [`DEPLOY_FTPS.md`](DEPLOY_FTPS.md) | Dettaglio del deploy FTPS su mimic.polimi.it (lezioni apprese, CI) |

## 🚀 Quick start

```bash
npm install
npm run dev          # sviluppo locale su http://localhost:3000
```

## 📝 Aggiornare i contenuti

Tutti i contenuti pubblici sono in `data/*.json`:

| File | Contenuto |
|---|---|
| `data/publications.json` | Pubblicazioni (le nuove in cima) |
| `data/news.json` | News ed eventi (le nuove in cima) |
| `data/team.json` | Team: PI, membri, alumni |
| `data/grants.json` | Grant correnti e passati |
| `data/network.json` | Collaborazioni, società, spin-off, mappa |
| `data/research.json` | Topic di ricerca (con pagine di dettaglio) |

Le immagini vanno in `public/images/` (team 800×800 <200 KB, news ~1200 px <300 KB). Le foto originali ad alta risoluzione vanno in `assets-originals/` (fuori da git e dal deploy), **mai** in `public/`.

Dopo ogni modifica, valida il JSON:

```bash
node -e "JSON.parse(require('fs').readFileSync('data/news.json','utf8')); console.log('OK')"
```

## 🌍 Pubblicazione (3 canali)

**Polimi FTPS è il canale di produzione primario.**

```bash
# 1. Backup sorgente su GitHub
git add … && git commit -m "…" && git push origin main

# 2. Mirror su GitLab Polimi (Pages di backup)
bash scripts/sync-gitlab.sh "messaggio"

# 3. Produzione: mimic.polimi.it via FTPS (~1-3 min, richiede rete Polimi o VPN GlobalProtect)
npm run deploy:polimi
```

| Canale | URL | basePath | Note |
|---|---|---|---|
| **Polimi FTPS** | `mimic.polimi.it` | *(vuoto)* | **Produzione.** Credenziali in `deploy.polimi.env` (gitignored) |
| GitLab Pages | `mimic-XXXXXX.pages.gitlab.polimi.it` | *(vuoto)* | Mirror, build via CI. Sync **solo** con `scripts/sync-gitlab.sh` |
| GitHub Pages | — | `/mimic` | Backup sorgente (`origin`, branch `main`) |

## 🛠️ Tech stack

Next.js 14 (App Router, static export) · TypeScript · Tailwind CSS · Framer Motion · Lucide React · Leaflet (mappa network) · Supabase (solo Lab Manager, auth + PostgreSQL + storage)

## 🔍 SEO e statistiche

- `sitemap.xml` e `robots.txt` generati al build (`app/sitemap.ts`, `app/robots.ts`)
- Proprietà verificata su Google Search Console (meta tag in `app/layout.tsx`)
- Statistiche visite first-party (Supabase `page_views`, con consenso cookie) — dashboard in Lab Manager → Site Stats

## 📄 License

© 2026 MiMic Lab, Politecnico di Milano. All rights reserved.
