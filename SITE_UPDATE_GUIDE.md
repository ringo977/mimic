# MiMic Lab Website — Update Guide

> How to update the website content without Cursor.  
> Last updated: January 2026

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Development Workflow](#3-development-workflow)
4. [Add / Edit a Team Member](#4-add--edit-a-team-member)
5. [Add / Edit a Publication](#5-add--edit-a-publication)
6. [Add / Edit a News Entry](#6-add--edit-a-news-entry)
7. [Add / Edit a Grant](#7-add--edit-a-grant)
8. [Add / Edit a Network Collaborator](#8-add--edit-a-network-collaborator)
9. [Add / Edit a Research Topic](#9-add--edit-a-research-topic)
10. [Add Images](#10-add-images)
11. [Common Mistakes & Troubleshooting](#11-common-mistakes--troubleshooting)

---

## 1. Prerequisites

**Software needed:**
- [Node.js](https://nodejs.org/) v18 or later
- A text editor (VS Code recommended)
- Git
- A terminal (Terminal.app on macOS)

**First-time setup:**
```bash
cd /Users/marco/Local\ Sites/mimic
npm install
```

---

## 2. Project Structure

All website content lives in **JSON data files** under `data/`. You almost never need to touch code files.

```
mimic/
├── data/                     ← ALL CONTENT LIVES HERE
│   ├── team.json             ← Team members (PIs + members)
│   ├── publications.json     ← Publications list
│   ├── news.json             ← News & events
│   ├── grants.json           ← Grants (current + past)
│   ├── network.json          ← Collaborators, projects, societies
│   └── research.json         ← Research topics
├── public/images/            ← ALL IMAGES
│   ├── team/                 ← Team member photos (square, ~400×400px)
│   ├── news/                 ← News images (~1200px wide)
│   ├── partners/             ← Partner/project logos
│   ├── research/             ← Research topic images/videos
│   └── technology/facilities/← Facility photos
├── app/                      ← Pages (rarely need editing)
├── components/               ← UI components (rarely need editing)
└── lib/                      ← Utility functions
```

---

## 3. Development Workflow

### Preview locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser. Changes to data files update automatically.

### Build & Deploy

```bash
npm run build && npm run deploy
```

This builds the static site and pushes to GitHub Pages. Wait 1–2 minutes, then hard-refresh (Cmd+Shift+R) on the live site.

### Quick edit cycle

1. Edit a JSON file in `data/`
2. Save the file
3. Check http://localhost:3000 (if dev server is running)
4. When satisfied: `npm run build && npm run deploy`

---

## 4. Add / Edit a Team Member

**File:** `data/team.json`

### Structure

The file has two arrays: `pis` (Principal Investigators) and `members`.

### Add a new member

Add a new object to the `members` array. Place it in order of seniority/role.

```json
{
  "id": 99,
  "name": "Name Surname",
  "role": "PhD Student",
  "email": "name.surname@polimi.it",
  "bio": "Short bio (1–2 sentences, shown on card).",
  "bioFull": "Full bio (shown in 'Read more' modal). Use \\n for line breaks between paragraphs.",
  "image": "/images/team/name-surname.jpg",
  "scopusId": "12345678900",
  "orcid": "0000-0000-0000-0000"
}
```

**Required fields:** `name`, `role`, `bio`, `image`  
**Optional fields:** `id`, `email`, `bioFull`, `scopusId`, `orcid`

### PI-specific fields

PIs also support:
```json
"linkedin": "https://www.linkedin.com/in/username/"
```

### Photo preparation

1. Resize to ~800×800px (or at least square-ish)
2. Name it `firstname-lastname.jpg` (lowercase, hyphens)
3. Place in `public/images/team/`
4. Optimize: `sips -Z 800 public/images/team/firstname-lastname.jpg`

### Important notes

- The `bio` field is shown on the card; keep it to 1–2 sentences
- The `bioFull` field is shown when clicking "Read more"; can be several paragraphs separated by `\n`
- Titles like "Dr." or "Prof." go in the `name` field
- The author filter on Publications matches team members by **last name + first initial**, so make sure the name matches how it appears in publications

---

## 5. Add / Edit a Publication

**File:** `data/publications.json`

### Add a publication

Add a new object to the `publications` array. Keep them ordered by year (newest first).

```json
{
  "id": 104,
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

**Required fields:** `id`, `authors`, `title`, `journal`, `year`, `type`  
**Optional fields:** `volume`, `pages`, `doi`, `pdf`

### Field details

| Field | Format | Example |
|-------|--------|---------|
| `id` | Unique integer (use next available) | `104` |
| `authors` | Array of `"Surname, Initials."` | `["Rasponi, M.", "Occhetta, P."]` |
| `title` | Full paper title | `"A Novel Gut-on-Chip..."` |
| `journal` | Journal or book name | `"Nature Biomedical Engineering"` |
| `year` | Integer | `2026` |
| `volume` | String, can include issue | `"12(3)"` |
| `pages` | String | `"123-456"` or `"e02080"` |
| `doi` | DOI without `https://doi.org/` prefix | `"10.1038/s41551-024-01318-z"` |
| `type` | `"Journal Article"` or `"Book Chapter"` | `"Journal Article"` |

### Important notes

- Author format must be `"Surname, Initials."` (e.g., `"Rasponi, M."`, not `"Marco Rasponi"`)
- The `type` field affects the filter and stats; use only `"Journal Article"` or `"Book Chapter"`
- The homepage counter rounds down to the nearest 5 (e.g., 102 shows as "100+")
- The "Cite" button auto-generates APA, IEEE, BibTeX, and RIS from these fields

---

## 6. Add / Edit a News Entry

**File:** `data/news.json`

### Add a news entry

Add a new object to the `news` array. **Order matters**: newest entries go first.

```json
{
  "id": 29,
  "date": "2026-03-15",
  "title": "Short Descriptive Title",
  "excerpt": "Longer description text. This is shown in the expanded modal. Can be several sentences.",
  "tag": "News",
  "image": "/images/news/my-image.jpg",
  "link": "https://external-link-if-any.com"
}
```

**Required fields:** `id`, `date`, `title`, `excerpt`, `tag`  
**Optional fields:** `image`, `link`, `gallery`, `captions`

### Available tags

| Tag | Use for |
|-----|---------|
| `"News"` | General news, updates |
| `"Award"` | Awards, prizes, recognitions |
| `"Conference"` | Conference participation, talks, posters |
| `"Event"` | Events organized by the lab |
| `"Outreach"` | Media, press, outreach activities |

### News with photo gallery

For entries with multiple photos:

```json
{
  "id": 30,
  "date": "2026-06-01",
  "title": "Conference Name — Lab Participation",
  "excerpt": "Description...",
  "tag": "Conference",
  "image": "/images/news/main-photo.jpg",
  "gallery": [
    "/images/news/photo1.jpg",
    "/images/news/photo2.jpg",
    "/images/news/photo3.jpg"
  ],
  "captions": [
    "Caption for photo 1",
    "Caption for photo 2",
    "Caption for photo 3"
  ]
}
```

### Important notes

- The `date` format must be `"YYYY-MM-DD"`
- News on the homepage ("Latest News") pulls the 3 most recent entries by date
- The `id` must be unique; use the next available number
- Images should be ~1200px wide; optimize with `sips -Z 1200 image.jpg`

---

## 7. Add / Edit a Grant

**File:** `data/grants.json`

The file has two arrays: `current` and `past`.

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

### Move a grant from current to past

1. Cut the grant object from the `current` array
2. Paste it into the `past` array
3. Optionally remove `cordisUrl`/`website` if no longer active

### Field details

| Field | Required | Notes |
|-------|----------|-------|
| `id` | Yes | Unique integer |
| `acronym` | Yes | Short name (e.g., "PHOENIX") |
| `title` | Yes | Full title |
| `program` | Yes | `"European"`, `"National"`, `"Regional"`, or `"Industrial"` |
| `call` | No | Funding call identifier |
| `role` | Yes | `"Coordinator"`, `"Partner"`, or `"PI"` |
| `period` | Yes | `"2025-2028"` format |
| `website` | No | Project website URL |
| `cordisUrl` | No | CORDIS page URL |
| `abstract` | No | Project abstract |

---

## 8. Add / Edit a Network Collaborator

**File:** `data/network.json`

### Add a collaborator

Add to the `collaborators` array. **Maintain the order**: universities/research centers first, then companies.

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

**Required fields:** `name`, `affiliation`, `location`, `lat`, `lng`  
**Optional fields:** `project`, `url`

### Finding coordinates

Search "[Institution name] coordinates" on Google, or use Google Maps (right-click → "What's here?").

### Add a project to the Network page

Add to the `projects` array:

```json
{
  "id": "project-slug",
  "name": "PROJECT",
  "fullTitle": "Full Title",
  "program": "Horizon Europe",
  "period": "2025–2028",
  "role": "Coordinator",
  "logo": "/images/partners/project-logo.png",
  "description": "Short description...",
  "website": "https://project.eu",
  "cordisUrl": null
}
```

### Ordering

1. **Universities** (Basel, Lund, TU Delft, IBEC, Imperial, NUS, etc.)
2. **Research centers / Hospitals** (Humanitas, CNR, IEO, Human Technopole)
3. **Companies** (NMI, Micronit, MCS, BiomimX, Chiesi)

---

## 9. Add / Edit a Research Topic

**File:** `data/research.json`

Research topics generate individual pages at `/research/[slug]`. Each topic has sub-topics.

```json
{
  "slug": "topic-slug",
  "title": "Topic Title",
  "description": "Short description for the card on Research page.",
  "icon": "Heart",
  "image": "/images/research/topic-image.jpg",
  "content": "Longer description for the individual topic page.",
  "subtopics": [
    {
      "title": "Sub-topic Name",
      "description": "Description of this sub-topic.",
      "image": "/images/research/subtopic-image.jpg"
    }
  ]
}
```

### Available icons

Icons come from `lucide-react`. Common ones used:
`Heart`, `Brain`, `Bone`, `Microscope`, `Droplets`, `Dna`, `Layers`, `Zap`, `FlaskConical`, `Cpu`

---

## 10. Add Images

### General rules

| Type | Location | Recommended size | Format |
|------|----------|-----------------|--------|
| Team photos | `public/images/team/` | ~800×800px | `.jpg` |
| News images | `public/images/news/` | ~1200px wide | `.jpg` `.png` |
| Partner logos | `public/images/partners/` | ~400px wide | `.png` `.jpg` `.webp` |
| Research images | `public/images/research/` | ~1200px wide | `.jpg` `.png` |
| Facility photos | `public/images/technology/facilities/` | ~1200px wide | `.jpg` `.jpeg` |

### Optimize images (macOS)

```bash
# Resize to max 1200px width (preserves aspect ratio)
sips -Z 1200 public/images/news/my-photo.jpg

# Resize to max 800px (for team photos)
sips -Z 800 public/images/team/name-surname.jpg
```

### Naming conventions

- Use lowercase with hyphens: `marco-rasponi.jpg`, not `Marco Rasponi.jpg`
- For news: `descriptive-name.jpg` (e.g., `phoenix-kickoff.jpg`)
- For galleries: `event-name-1.jpg`, `event-name-2.jpg`, etc.

---

## 11. Common Mistakes & Troubleshooting

### JSON syntax errors

The #1 cause of build failures. Common issues:

| Error | Fix |
|-------|-----|
| Missing comma between objects | Add `,` after `}` before the next `{` |
| Trailing comma after last item | Remove the last `,` before `]` or `}` |
| Unescaped quotes in text | Use `\"` inside strings |
| Line breaks in strings | Use `\n` instead of actual line breaks |

**Tip:** Use a JSON validator (https://jsonlint.com/) to check your edits before building.

### Build fails

```bash
# Check for JSON errors
node -e "require('./data/team.json')"
node -e "require('./data/publications.json')"
node -e "require('./data/news.json')"
# If any of these throws an error, there's a syntax issue in that file
```

### Image not showing

1. Check the path in the JSON matches the actual file path (case-sensitive!)
2. Make sure the file is in `public/images/...` (not just `images/...`)
3. Hard-refresh the browser (Cmd+Shift+R)

### Changes not visible after deploy

- Wait 1–2 minutes for GitHub Pages cache to clear
- Hard-refresh: Cmd+Shift+R
- Try incognito/private window
- Make sure you ran `npm run build` before `npm run deploy`

### Dev server not updating

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

### Quick reference: complete update cycle

```bash
# 1. Start dev server (if not running)
npm run dev

# 2. Edit the JSON file(s) in data/

# 3. Check at http://localhost:3000

# 4. Build and deploy
npm run build && npm run deploy
```

---

## Appendix: Contact Form (Formspree)

The contact form uses [Formspree](https://formspree.io). The form ID is configured in:

```
components/ContactForm.tsx → const FORMSPREE_ID = 'xkgrbjnq';
```

To change the receiving email or manage submissions, log in at https://formspree.io.

---

## Appendix: Key Counters (Auto-calculated)

These values update automatically from the data files:

| Counter | Source | Where shown |
|---------|--------|-------------|
| Publications | `publications.json` length | Homepage hero, Publications page |
| Team members | `team.json` (pis + members) | Homepage hero |
| Grants | `grants.json` (current + past) | Homepage hero |
| Partners | `network.json` collaborators | Homepage hero |
| Journal Articles | filtered by `type` | Publications stats |
| Book Chapters | filtered by `type` | Publications stats |
| Years Active | `current year − oldest publication year` | Publications stats |

All homepage counters are rounded down to the nearest 5 (e.g., 102 → "100+").
