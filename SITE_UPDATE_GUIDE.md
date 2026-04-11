# MiMic Lab Website — Operations Guide

> Complete reference for updating content, deploying, and maintaining the site.
> Last updated: April 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Files Reference](#2-data-files-reference)
3. [Complete Update & Deploy Workflow](#3-complete-update--deploy-workflow)
4. [Deploy Channels](#4-deploy-channels)
5. [Add / Edit a Team Member](#5-add--edit-a-team-member)
6. [Add / Edit a Publication](#6-add--edit-a-publication)
7. [Add / Edit a News Entry](#7-add--edit-a-news-entry)
8. [Add / Edit a Grant](#8-add--edit-a-grant)
9. [Add / Edit a Network Collaborator](#9-add--edit-a-network-collaborator)
10. [Add / Edit a Research Topic](#10-add--edit-a-research-topic)
11. [Images: Rules, Sizes & Limits](#11-images-rules-sizes--limits)
12. [BasePath Configuration](#12-basepath-configuration)
13. [Lab App (Supabase)](#13-lab-app-supabase)
14. [Credentials & Secret Files](#14-credentials--secret-files)
15. [Troubleshooting](#15-troubleshooting)
16. [Appendix: Key Counters](#appendix-key-counters)

---

## 1. Architecture Overview

### Tech stack

- **Framework:** Next.js 14 with App Router, static export (`output: 'export'`)
- **Styling:** Tailwind CSS + PoliMi brand identity (CSS variables in `app/globals.css`)
- **Fonts:** Manrope (body) + Frank Ruhl Libre (headings), loaded via `next/font/google`
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Map:** Leaflet + react-leaflet (network page)
- **Lab backend:** Supabase (auth, database, storage)

### Project structure

```
mimic/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (nav, footer, fonts, metadata)
│   ├── page.tsx                  # Homepage
│   ├── globals.css               # Global styles + PoliMi CSS variables
│   ├── team/page.tsx
│   ├── research/page.tsx
│   ├── research/[slug]/page.tsx  # Dynamic: one page per research topic
│   ├── publications/page.tsx
│   ├── grants/page.tsx
│   ├── news/page.tsx
│   ├── network/page.tsx
│   ├── technology-facilities/page.tsx
│   ├── contact/page.tsx
│   ├── join/page.tsx
│   ├── privacy/page.tsx
│   ├── cookie-policy/page.tsx
│   └── lab/                      # Lab Manager app
│       ├── page.tsx
│       ├── layout.tsx
│       └── reset-password/page.tsx
│
├── data/                         # ALL SITE CONTENT (JSON + TS)
│   ├── team.json                 # 2 PIs + 20 members
│   ├── publications.json         # ~105 publications
│   ├── news.json                 # ~29 news items
│   ├── grants.json               # 5 current + 21 past grants
│   ├── network.json              # Projects, societies, spinoff, collaborators
│   ├── research.json             # 12 research topics + 20 keywords
│   ├── collaborations.json       # Legacy (unused by code)
│   └── lab-data.ts               # Lab types, mock data, utilities
│
├── components/                   # React components
│   ├── Navbar.tsx, Footer.tsx, Hero.tsx, GridBackground.tsx, ...
│   ├── TeamCard.tsx, PICard.tsx, PublicationCard.tsx, NewsCard.tsx, ...
│   ├── NetworkMap.tsx            # Leaflet map
│   ├── CookieConsent.tsx
│   └── lab/                      # Lab Manager components
│       ├── LabApp.tsx            # Main shell (auth, tabs)
│       ├── LabContext.tsx        # React context + Supabase sync
│       └── ...Page.tsx           # Dashboard, Instruments, Reagents, etc.
│
├── lib/                          # Utilities
│   ├── site-base-path.ts         # Exports basePath from env
│   ├── citations.ts              # Publication type + APA/IEEE/BibTeX formatters
│   ├── supabase.ts               # Supabase client
│   ├── supabase-users.ts         # User CRUD
│   ├── supabase-data.ts          # Lab data CRUD
│   ├── supabase-storage.ts       # File upload/download
│   ├── lab-auth.ts               # Auth helpers
│   └── backup.ts                 # Database backup/restore
│
├── public/images/                # Static assets
│   ├── team/                     # Team photos (~800x800)
│   ├── news/                     # News images (~1200px wide)
│   ├── partners/                 # Project/partner logos
│   ├── research/                 # Research images + videos
│   ├── technology/facilities/    # Facility photos
│   ├── home/                     # Homepage assets
│   └── logos/                    # Site logos
│
├── scripts/
│   ├── sync-gitlab.sh            # Sync to GitLab monorepo
│   └── deploy-polimi-ftp.sh      # FTP deploy to Polimi server
│
├── next.config.js                # Static export + basePath logic
├── tailwind.config.ts            # PoliMi colors + fonts
├── package.json                  # Scripts: dev, build, deploy, sync
├── .gitignore
├── deploy.polimi.env.example     # FTP credentials template
└── deploy.gitlab.env.example     # GitLab token template
```

### How data flows to pages

Pages import JSON files from `data/` directly. The site is fully static (no server at runtime).

| Page | Data source(s) |
|------|----------------|
| `/` (Homepage) | `publications.json`, `grants.json`, `team.json`, `network.json`, `research.json`, `news.json` |
| `/team` | `team.json` |
| `/publications` | `publications.json`, `team.json` (for author highlighting) |
| `/research` | `research.json` |
| `/research/[slug]` | `research.json`, `publications.json` (filtered by `pubKeywords`) |
| `/news` | `news.json` |
| `/grants` | `grants.json` |
| `/network` | `network.json` |
| `/lab` | `lab-data.ts` + Supabase (runtime) |

---

## 2. Data Files Reference

### Summary table

| File | Root key | Entries | Key fields |
|------|----------|---------|------------|
| `team.json` | `pis`, `members`, `alumni` | 2 + 20 + 0 | `name`, `role`, `email`, `bio`, `image`, `scopusId`, `orcid` |
| `publications.json` | `publications` | ~105 | `id`, `authors[]`, `title`, `journal`, `year`, `doi`, `type` |
| `news.json` | `news` | ~29 | `id`, `date`, `title`, `excerpt`, `tag`, `image`, `gallery[]`, `captions[]` |
| `grants.json` | `current`, `past` | 5 + 21 | `id`, `acronym`, `title`, `program`, `role`, `period`, `abstract` |
| `network.json` | `projects`, `societies`, `spinoff`, `collaborators` | 4 + 2 + 1 + 19 | Varies per section |
| `research.json` | `projects`, `keywords` | 12 + 20 | `slug`, `title`, `sections[]`, `pubKeywords[]` |
| `lab-data.ts` | TypeScript exports | N/A | Types, mock data, utilities for `/lab` |

### Cross-file relationships

- **Publications <-> Team:** author surnames are matched to team member names for highlighting on the publications page.
- **Publications <-> Research:** each research topic has `pubKeywords` (e.g. `["cardiac", "heart"]`) that filter publications on `/research/[slug]`.
- **Grants <-> Network:** project acronyms (PHOENIX, BuonMarrow, etc.) appear in both `grants.json` and `network.json`.
- **News:** references project names and team members by text (no foreign keys).

### ID conventions

- `publications.json`: integer IDs, not strictly sequential (some gaps exist). Use next available.
- `news.json`: integer IDs, not sequential. Use next available.
- `grants.json`: integer IDs per section (`current` and `past` have separate numbering).
- `team.json`: `members` have integer IDs; `pis` have no ID field.
- `network.json` projects: string slug IDs (e.g. `"phoenix"`).

---

## 3. Complete Update & Deploy Workflow

### Quick reference (most common case)

```bash
# 1. Edit JSON file(s) in data/
# 2. Validate JSON
node -e "JSON.parse(require('fs').readFileSync('data/FILE.json','utf8')); console.log('OK')"

# 3. Commit and push to GitHub
git add data/FILE.json public/images/...
git commit -m "Description of what changed"
git push origin main

# 4. Sync to GitLab (triggers automatic Pages deploy)
bash scripts/sync-gitlab.sh "Same description"

# 5. (Optional) Deploy to Polimi FTP
npm run deploy:polimi
```

### Step-by-step

1. **Edit content** — modify the relevant JSON file in `data/`. If adding images, place them in the correct `public/images/` subfolder and optimize them (see [Images](#11-images-rules-sizes--limits)).

2. **Validate JSON** — always validate before committing:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('data/news.json','utf8')); console.log('Valid')"
   ```

3. **Preview locally** (optional but recommended):
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

4. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Add new publication: Author et al. (Journal)"
   git push origin main
   ```

5. **Sync to GitLab** (pushes source files to `mimic-website/` subfolder in the GitLab monorepo; GitLab CI then builds and deploys to Pages automatically):
   ```bash
   bash scripts/sync-gitlab.sh "Add new publication: Author et al. (Journal)"
   ```

6. **Deploy to Polimi FTP** (optional — builds with root basePath and uploads via FTPS):
   ```bash
   npm run deploy:polimi
   ```

7. **Or do everything at once:**
   ```bash
   npm run publish:all
   ```

---

## 4. Deploy Channels

The site is deployed to **3 independent channels**. Each can be updated separately.

### 4.1 GitHub (source repo)

- **Repo:** `https://github.com/ringo977/mimic.git` (remote `origin`)
- **Branch:** `main`
- **Push:** `git push origin main`
- **GitHub Pages:** available at `https://ringo977.github.io/mimic/` (basePath `/mimic`)
- **Deploy Pages:** `npm run publish:github` (builds + pushes `out/` to `gh-pages` branch)

### 4.2 GitLab (monorepo + Pages)

- **Repo:** `https://gitlab.polimi.it/DEIB/mimic.git`
- **Structure:** monorepo with `mimic-website/` (site) and `cardiac-video/` (separate tool)
- **Sync script:** `bash scripts/sync-gitlab.sh "commit message"`
  - Clones/updates the GitLab repo in `.gitlab-clone/` (cached)
  - Rsyncs website files into `mimic-website/` subfolder
  - Commits and pushes
- **CI/CD:** `.gitlab-ci.yml` builds the site and deploys to GitLab Pages automatically
  - Build: `BASE_PATH= NODE_ENV=production npm run build` (root basePath)
  - Artifact: `out/` moved to `public/`
- **CRITICAL LIMIT: artifact size must be under 100 MB.** See [Images](#11-images-rules-sizes--limits).
- **Credentials:** `deploy.gitlab.env` (Personal Access Token with `read_repository` + `write_repository` scopes)

### 4.3 Polimi FTP

- **Target:** Polimi web server via FTPS (explicit TLS)
- **Script:** `scripts/deploy-polimi-ftp.sh` (or `npm run deploy:polimi`)
- **Requires:** `lftp` (`brew install lftp`) + `deploy.polimi.env`
- **Build:** `npm run build:polimi` (basePath empty — root URL)
- **Smart deploy:** by default uploads only changed files:
  - Step 1: force-upload HTML/txt/json/xml (reference chunk hashes)
  - Step 2: upload static assets only if size differs (JS/CSS have content hashes in filenames)
- **Full sync:** `FTP_FULL_SYNC=1 npm run deploy:polimi`
- **Skip rebuild:** `SKIP_BUILD=1 npm run sync:polimi` (uses existing `out/`)

### npm scripts summary

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Build for GitHub Pages (basePath `/mimic`) |
| `npm run build:polimi` | Build for Polimi/GitLab (basePath empty) |
| `npm run deploy` | Push `out/` to GitHub Pages `gh-pages` branch |
| `npm run publish:github` | `build` + `deploy` |
| `npm run deploy:polimi` | Build Polimi + FTP upload |
| `npm run sync:polimi` | FTP upload only (skip build, use existing `out/`) |
| `npm run sync:gitlab` | Sync source to GitLab monorepo |
| `npm run publish:all` | `publish:github` + `deploy:polimi` + `sync:gitlab` |

---

## 5. Add / Edit a Team Member

**File:** `data/team.json`

### Structure

The file has three arrays: `pis` (Principal Investigators), `members`, and `alumni`.

### Add a new member

Add a new object to the `members` array. Place it in order of seniority/role.

```json
{
  "id": 99,
  "name": "Name Surname",
  "role": "PhD Student",
  "email": "name.surname@polimi.it",
  "bio": "Short bio (1-2 sentences, shown on card).",
  "bioFull": "Full bio (shown in 'Read more' modal). Use \\n for line breaks between paragraphs.",
  "image": "/images/team/name-surname.jpg",
  "scopusId": "12345678900",
  "orcid": "0000-0000-0000-0000"
}
```

**Required:** `name`, `role`, `bio`, `image`
**Optional:** `id`, `email`, `bioFull`, `scopusId`, `orcid`, `linkedin` (PIs only)

### Photo preparation

1. Resize to ~800x800px (square)
2. Name: `firstname-lastname.jpg` (lowercase, hyphens)
3. Place in `public/images/team/`
4. Optimize: `sips -Z 800 public/images/team/firstname-lastname.jpg`

### Notes

- The `bio` field is shown on the card; keep to 1-2 sentences.
- The `bioFull` field supports `\n` for paragraph breaks.
- Author matching on the Publications page uses **last name**, so ensure the `name` matches how it appears in publications.

---

## 6. Add / Edit a Publication

**File:** `data/publications.json`

### Add a publication

Add a new object at the **beginning** of the `publications` array (newest first).

```json
{
  "id": 106,
  "authors": [
    "Surname, A.B.",
    "Surname, C.",
    "Rasponi, M."
  ],
  "title": "Full Title of the Paper",
  "journal": "Journal Name",
  "year": 2026,
  "volume": "12(3)",
  "pages": "123-456",
  "doi": "10.1234/example.2026.12345",
  "type": "Journal Article"
}
```

**Required:** `id`, `authors`, `title`, `journal`, `year`, `type`
**Optional:** `volume`, `pages`, `doi`, `pdf`

### Field formats

| Field | Format | Example |
|-------|--------|---------|
| `id` | Next available integer (current max: ~105) | `106` |
| `authors` | Array of `"Surname, Initials."` | `["Rasponi, M.", "Occhetta, P."]` |
| `title` | Full paper title | `"A Novel Gut-on-Chip..."` |
| `journal` | Journal or book name | `"Nature Biomedical Engineering"` |
| `year` | Integer | `2026` |
| `volume` | String, can include issue | `"12(3)"` |
| `pages` | String | `"123-456"` or `"e02080"` |
| `doi` | DOI without `https://doi.org/` prefix | `"10.1038/s41551-024-01318-z"` |
| `type` | `"Journal Article"` or `"Book Chapter"` | `"Journal Article"` |

### Notes

- Author format must be `"Surname, Initials."` (not `"Marco Rasponi"`)
- The homepage counter rounds down to the nearest 5 (e.g., 107 shows as "105+")
- The "Cite" button auto-generates APA, IEEE, BibTeX, and RIS from these fields

---

## 7. Add / Edit a News Entry

**File:** `data/news.json`

### Add a news entry

Add at the **beginning** of the `news` array (newest first).

```json
{
  "id": 30,
  "date": "2026-04-15",
  "title": "Short Descriptive Title",
  "excerpt": "Longer description. Shown in the expanded modal. Can be several sentences.",
  "tag": "News",
  "image": "/images/news/my-image.jpg",
  "link": "https://external-link-if-any.com"
}
```

**Required:** `id`, `date`, `title`, `excerpt`, `tag`
**Optional:** `image`, `link`, `gallery`, `captions`

### Available tags

| Tag | Use for |
|-----|---------|
| `"News"` | General news, updates |
| `"Award"` | Awards, prizes, recognitions |
| `"Conference"` | Conference participation, talks, posters |
| `"Event"` | Events organized by the lab |
| `"Outreach"` | Media, press, outreach activities |

### News with photo gallery

```json
{
  "id": 30,
  "date": "2026-06-01",
  "title": "Conference Name",
  "excerpt": "Description...",
  "tag": "Conference",
  "image": "/images/news/main-photo.jpg",
  "gallery": [
    "/images/news/photo1.jpg",
    "/images/news/photo2.jpg"
  ],
  "captions": [
    "Caption for photo 1",
    "Caption for photo 2"
  ]
}
```

### Notes

- `date` format: `"YYYY-MM-DD"`
- Homepage "Latest News" pulls the 3 most recent entries by date
- `gallery` and `captions` arrays must have the same length
- Images should be ~1200px wide, optimized to under 300KB each

---

## 8. Add / Edit a Grant

**File:** `data/grants.json`

Two arrays: `current` and `past`.

### Add a current grant

```json
{
  "id": 99,
  "acronym": "PROJECT",
  "title": "Full Project Title",
  "program": "European",
  "call": "HORIZON-XXX-2026",
  "role": "Coordinator",
  "period": "2026-2030",
  "website": "https://project-website.eu",
  "cordisUrl": "https://cordis.europa.eu/project/id/123456",
  "abstract": "Project abstract text..."
}
```

| Field | Required | Values |
|-------|----------|--------|
| `program` | Yes | `"European"`, `"National"`, `"Regional"`, `"Industrial"` |
| `role` | Yes | `"Coordinator"`, `"Partner"`, `"PI"` |
| `website`, `cordisUrl` | No | URL or `null` |

### Move grant from current to past

Cut the object from `current` and paste into `past`.

---

## 9. Add / Edit a Network Collaborator

**File:** `data/network.json`

### Sections

- `projects` — funded projects shown as cards
- `societies` — scientific societies
- `spinoff` — spin-off company (BiomimX)
- `collaborators` — map pins on the Leaflet map

### Add a collaborator

```json
{
  "name": "Collaborator Name",
  "affiliation": "Institution Name",
  "location": "City, Country",
  "lat": 45.4642,
  "lng": 9.1900,
  "project": "PHOENIX",
  "url": "https://lab-page-url.com"
}
```

**Required:** `name`, `affiliation`, `location`, `lat`, `lng`
**Optional:** `project`, `url`

**Finding coordinates:** Google Maps, right-click -> "What's here?"

### Add a project

```json
{
  "id": "project-slug",
  "name": "PROJECT",
  "fullTitle": "Full Title",
  "program": "Horizon Europe",
  "period": "2025-2028",
  "role": "Coordinator",
  "logo": "/images/partners/project-logo.png",
  "description": "Short description...",
  "website": "https://project.eu",
  "cordisUrl": null
}
```

---

## 10. Add / Edit a Research Topic

**File:** `data/research.json`

Research topics generate individual pages at `/research/[slug]`.

```json
{
  "id": 13,
  "slug": "topic-slug",
  "title": "Topic Title",
  "description": "Short description for the Research page card.",
  "tags": ["Tag1", "Tag2"],
  "image": "/images/research/topic-image.jpg",
  "sections": [
    {
      "title": "Section Title",
      "text": "Section content...",
      "image": "/images/research/section-image.jpg"
    }
  ],
  "pubKeywords": ["keyword1", "keyword2"]
}
```

- `pubKeywords` filter publications shown on the topic's detail page (substring match on title/journal/authors).
- Images and videos in `sections` are auto-detected from `public/images/research/` via filename convention.

---

## 11. Images: Rules, Sizes & Limits

### Size guidelines

| Type | Location | Max size | Format |
|------|----------|----------|--------|
| Team photos | `public/images/team/` | ~800x800px, <200KB | `.jpg` |
| News images | `public/images/news/` | ~1200px wide, <300KB | `.jpg` |
| Partner logos | `public/images/partners/` | ~400px wide | `.png` `.jpg` |
| Research images | `public/images/research/` | ~1200px wide, <300KB | `.jpg` `.png` |

### Optimize (macOS)

```bash
sips -Z 1200 public/images/news/my-photo.jpg   # resize to max 1200px
sips -Z 800 public/images/team/name.jpg         # resize to max 800px
```

### Naming

- Lowercase with hyphens: `marco-rasponi.jpg` (not `Marco Rasponi.jpg`)
- Galleries: `event-name-1.jpg`, `event-name-2.jpg`, etc.

### CRITICAL: GitLab Pages 100 MB artifact limit

The total build output (`out/` directory) must stay **under 100 MB**. Currently ~33 MB.

**Rules to stay under the limit:**
- Never commit original uncompressed photos (multi-MB PNGs from phones/cameras)
- Always optimize images before committing
- The following are excluded from git (`.gitignore`):
  - `public/images/news/Post/` (original source photos)
  - `Pennati_MPS2025_award.jpg`, `Bianca Aterini EUROTOX2025 Ecopa.jpg`, `sofia_belardinelli_originale.jpg`
- The sync script (`sync-gitlab.sh`) also excludes these via `--exclude` flags

**Check build size:**
```bash
npm run build && du -sh out/
```

---

## 12. BasePath Configuration

The site uses different base paths depending on the deployment target.

| Target | basePath | How to build |
|--------|----------|-------------|
| GitHub Pages | `/mimic` | `npm run build` (default) |
| GitLab Pages | `` (empty) | `BASE_PATH= npm run build` |
| Polimi FTP | `` (empty) | `npm run build:polimi` |
| Local dev | `` (empty) | `npm run dev` |

This is configured in `next.config.js`:
- Production default: `basePath = '/mimic'`
- Override: set `BASE_PATH` environment variable (e.g., `BASE_PATH=` for empty)
- `NEXT_PUBLIC_BASE_PATH` is derived from the same value and used by `lib/site-base-path.ts`

All image/asset references in components use `siteBasePath` from `lib/site-base-path.ts` to prepend the correct prefix.

---

## 13. Lab App (Supabase)

The `/lab` route hosts an internal lab management tool, completely separate from the public site.

- **Frontend:** `components/lab/LabApp.tsx` (client-only, `ssr: false`)
- **Data types & mock data:** `data/lab-data.ts`
- **Backend:** Supabase (auth, PostgreSQL, storage)
- **Features:** instruments, reagents, cryo storage, bookings, wishlist, manuals, activity log, admin panel
- **Auth:** email/password + optional TOTP MFA via Supabase

The lab app does **not** affect public site content. It uses `localStorage` for offline state and syncs with Supabase when configured.

Supabase credentials are set via environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — not committed to the repo.

---

## 14. Credentials & Secret Files

These files contain secrets and are **never committed** (listed in `.gitignore`):

| File | Purpose | Template |
|------|---------|----------|
| `deploy.polimi.env` | FTP credentials for Polimi server | `deploy.polimi.env.example` |
| `deploy.gitlab.env` | GitLab Personal Access Token | `deploy.gitlab.env.example` |
| `mimic passwd.txt` | Lab passwords (local reference) | N/A |
| `.env.local` | Supabase keys (if using lab) | N/A |

### Setup from scratch

```bash
# Polimi FTP
cp deploy.polimi.env.example deploy.polimi.env
# Edit: FTP_HOST, FTP_USER, FTP_PASS

# GitLab
cp deploy.gitlab.env.example deploy.gitlab.env
# Edit: GITLAB_TOKEN (from gitlab.polimi.it -> Preferences -> Access Tokens)
# Required scopes: read_repository, write_repository
```

---

## 15. Troubleshooting

### JSON syntax errors

The #1 cause of build failures.

| Error | Fix |
|-------|-----|
| Missing comma between objects | Add `,` after `}` before the next `{` |
| Trailing comma after last item | Remove the last `,` before `]` or `}` |
| Unescaped quotes in text | Use `\"` inside strings |
| Line breaks in strings | Use `\n` instead of actual line breaks |

**Validate all data files:**
```bash
node -e "JSON.parse(require('fs').readFileSync('data/team.json','utf8')); console.log('OK')"
node -e "JSON.parse(require('fs').readFileSync('data/publications.json','utf8')); console.log('OK')"
node -e "JSON.parse(require('fs').readFileSync('data/news.json','utf8')); console.log('OK')"
node -e "JSON.parse(require('fs').readFileSync('data/grants.json','utf8')); console.log('OK')"
node -e "JSON.parse(require('fs').readFileSync('data/network.json','utf8')); console.log('OK')"
node -e "JSON.parse(require('fs').readFileSync('data/research.json','utf8')); console.log('OK')"
```

### GitLab Pages deploy fails: "Artifacts too large"

The `out/` directory exceeds 100 MB. Fix:
1. Check which images are too large: `find public/images -size +500k -exec ls -lhS {} +`
2. Optimize or remove large files
3. Make sure `public/images/news/Post/` is not tracked (it's in `.gitignore`)
4. Verify: `npm run build && du -sh out/` (must be < 100 MB)

### Image not showing

1. Check the path in JSON matches the actual file path (case-sensitive)
2. File must be in `public/images/...` (not just `images/...`)
3. Hard-refresh: Cmd+Shift+R

### Changes not visible after deploy

- GitHub Pages: wait 1-2 minutes, then hard-refresh (Cmd+Shift+R)
- GitLab Pages: wait for CI pipeline to complete (~1 min), check pipeline status at `gitlab.polimi.it/DEIB/mimic/-/pipelines`
- Polimi FTP: changes are immediate, but browser cache may need clearing
- Try incognito/private window

### GitLab sync fails

```bash
# Check if token is valid
cat deploy.gitlab.env

# Check if .gitlab-clone exists and is healthy
ls -la .gitlab-clone/.git

# Reset the clone if corrupted
rm -rf .gitlab-clone
bash scripts/sync-gitlab.sh "message"
```

### Polimi FTP fails

```bash
# Check lftp is installed
which lftp || brew install lftp

# Check credentials
cat deploy.polimi.env

# Try full sync if smart deploy behaves oddly
FTP_FULL_SYNC=1 npm run deploy:polimi
```

---

## Appendix: Key Counters

These values update automatically from data files:

| Counter | Source | Where shown |
|---------|--------|-------------|
| Publications | `publications.json` length | Homepage hero, Publications page |
| Team members | `team.json` (pis + members) | Homepage hero |
| Grants | `grants.json` (current + past) | Homepage hero |
| Partners | `network.json` collaborators | Homepage hero |
| Journal Articles | filtered by `type` | Publications stats |
| Book Chapters | filtered by `type` | Publications stats |
| Years Active | `current year - oldest publication year` | Publications stats |

All homepage counters are rounded down to the nearest 5 (e.g., 107 -> "105+").
