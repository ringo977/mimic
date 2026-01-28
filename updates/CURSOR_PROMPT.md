# PROMPT COMPLETO PER CURSOR - Sito Organ-on-Chip PoliMi

Copia e incolla questo prompt nel Composer di Cursor per generare l'intero progetto.

---

## 🎯 OBIETTIVO

Crea un sito web professionale Next.js 14 (App Router) per il laboratorio di ricerca "Organ-on-Chip" del Dipartimento di Elettronica, Informazione e Bioingegneria (DEIB) del Politecnico di Milano.

Il sito deve essere moderno, accademico, e rispettare rigorosamente la brand identity del Politecnico di Milano.

---

## 🎨 BRAND IDENTITY - VINCOLI OBBLIGATORI

### Colori Principali
```css
/* Colori Istituzionali PoliMi */
--polimi-blue-heritage: #102C53;  /* Colore principale */
--polimi-black: #000000;
--polimi-white: #FFFFFF;
--polimi-gray: #E0DCDC;

/* Colori Ingegneria (accenti) */
--polimi-bright-blue: #4DC9FF;
--polimi-alpha-blue: #2CB7FF;
--polimi-beta-blue: #0BA4FF;

/* Colori Terziaria (accenti secondari) */
--polimi-binary-cyan: #73A2D1;
--polimi-space-blue: #6698FF;
--polimi-photonic-azure: #73A1F7;
```

### Tipografia
- **Font Principale:** Manrope (sans-serif) - weights: 200, 300, 400, 500, 600, 700, 800
- **Font Secondaria:** Frank Ruhl Libre (serif) - weights: 300, 400, 500, 600, 700, 800, 900
- **Fallback:** Arial / Georgia
- Importare da Google Fonts

### Layout & Griglia
- Margini laterali desktop: 78px
- Sistema di griglia con 12 colonne
- Griglia decorativa di sfondo (opacità 5-10%, non deve interferire con leggibilità)
- Responsive: mobile-first approach

---

## 📋 STRUTTURA SITO

### Pagine da Creare

1. **Homepage** (`/`)
   - Hero section con immagine/video organ-on-chip
   - Breve descrizione del laboratorio (3-4 righe)
   - Overview delle aree di ricerca (cards)
   - Ultime news (3 recenti)
   - CTA verso "Join Us"

2. **About / Team** (`/team`)
   - Sezione Principal Investigator
   - Grid di membri del team con:
     - Foto profilo
     - Nome, ruolo (PostDoc, PhD, Master Student)
     - Email, breve bio
     - Modal per bio estesa (click sulla card)
   - Alumni section (opzionale)

3. **Research** (`/research`)
   - Overview delle linee di ricerca
   - Cards per ogni progetto principale:
     - Titolo, descrizione
     - Immagine rappresentativa
     - Link a pagina dettaglio progetto (future implementation)
   - Keywords/Tags delle aree tematiche

4. **Publications** (`/publications`)
   - Lista pubblicazioni organizzata per anno (più recenti prima)
   - Ogni pubblicazione:
     - Autori, titolo, journal, anno
     - DOI link / PDF download
     - Badge colorati per tipo (Journal Article, Conference, Book Chapter)
   - Filtri per anno e tipo
   - Integrazione futura: parsing da BibTeX

5. **Collaborations** (`/collaborations`)
   - Network di collaborazioni internazionali
   - Grid con loghi università/aziende partner
   - Breve descrizione per ogni collaborazione
   - Mappa interattiva (opzionale)

6. **News & Events** (`/news`)
   - Lista cronologica di news, eventi, conferenze
   - Ogni news:
     - Data, titolo, breve testo
     - Immagine (opzionale)
     - Tag (News, Event, Conference, Award)
   - Paginazione

7. **Join Us** (`/join`)
   - Opportunità aperte (PhD, PostDoc, Tesi, Stage)
   - Come candidarsi
   - Requisiti e competenze richieste
   - Form di contatto o email

8. **Contact** (`/contact`)
   - Informazioni di contatto laboratorio
   - Indirizzo: Dipartimento DEIB, Politecnico di Milano
   - Email, telefono
   - Google Maps embed
   - Social links (opzionali)

---

## 🎨 DESIGN SYSTEM

### Navbar
- Logo PoliMi + Nome laboratorio a sinistra
- Menu orizzontale desktop: Home | Team | Research | Publications | Collaborations | News | Join Us | Contact
- Hamburger menu mobile
- Sticky on scroll
- Background: polimi-blue-heritage con leggera trasparenza su scroll
- Testo: white

### Footer
- Background: polimi-blue-heritage
- Testo: white
- Colonne:
  - Informazioni laboratorio
  - Quick links
  - Contatti
  - Logo PoliMi
- Copyright e privacy (minimal)

### Components Style
- **Cards:** Shadow sottile, hover elevation, border-radius 8-12px
- **Buttons:** 
  - Primary: polimi-bright-blue con hover polimi-alpha-blue
  - Secondary: outline con polimi-blue-heritage
- **Typography:**
  - H1-H3: Frank Ruhl Libre Bold
  - Body, paragraphs: Manrope Regular/Light
  - Links: polimi-bright-blue con underline on hover
- **Images:** Border-radius 8px, aspect-ratio 16:9 per coerenza
- **Spacing:** Sistema 8px base (8, 16, 24, 32, 48, 64, 96)

### Griglia Decorativa
- Background pattern con linee verticali/orizzontali sottili
- Colore: polimi-gray con opacity 0.05-0.1
- Non deve mai interferire con la leggibilità del testo
- Usare `pointer-events: none` e `z-index` basso

---

## 🛠️ TECH STACK

- **Framework:** Next.js 14 con App Router
- **Styling:** Tailwind CSS
- **Fonts:** Google Fonts (Manrope, Frank Ruhl Libre)
- **Icons:** Lucide React
- **Animations:** Framer Motion (fade-in on scroll, smooth transitions)
- **Data:** 
  - Inizialmente: JSON files in `/data` folder
  - Struttura per futura integrazione CMS/database

---

## 📦 STRUTTURA FILE

```
organ-on-chip-polimi/
├── app/
│   ├── layout.tsx          # Layout principale con font e metadata
│   ├── page.tsx            # Homepage
│   ├── team/
│   │   └── page.tsx
│   ├── research/
│   │   └── page.tsx
│   ├── publications/
│   │   └── page.tsx
│   ├── collaborations/
│   │   └── page.tsx
│   ├── news/
│   │   └── page.tsx
│   ├── join/
│   │   └── page.tsx
│   └── contact/
│       └── page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── TeamCard.tsx
│   ├── PublicationCard.tsx
│   ├── NewsCard.tsx
│   ├── ResearchCard.tsx
│   ├── GridBackground.tsx  # Griglia decorativa
│   └── ui/                 # Componenti riutilizzabili base
├── data/
│   ├── team.json
│   ├── publications.json
│   ├── research.json
│   ├── news.json
│   └── collaborations.json
├── public/
│   ├── images/
│   └── logo/
├── styles/
│   └── globals.css
├── lib/
│   └── utils.ts
└── tailwind.config.ts
```

---

## 🎬 STEP-BY-STEP IMPLEMENTATION

### 1. Setup Iniziale
```bash
npx create-next-app@latest organ-on-chip-polimi
# Seleziona: TypeScript, Tailwind, App Router, No src/, Yes import alias
cd organ-on-chip-polimi
npm install framer-motion lucide-react
```

### 2. Configurazione Tailwind
Nel file `tailwind.config.ts`, aggiungi i colori custom:

```typescript
colors: {
  polimi: {
    'blue-heritage': '#102C53',
    'bright-blue': '#4DC9FF',
    'alpha-blue': '#2CB7FF',
    'beta-blue': '#0BA4FF',
    'gray': '#E0DCDC',
    'binary-cyan': '#73A2D1',
    'space-blue': '#6698FF',
  }
}
```

### 3. Importare Font
Nel `app/layout.tsx`, importa Manrope e Frank Ruhl Libre da Google Fonts:

```typescript
import { Manrope, Frank_Ruhl_Libre } from 'next/font/google'

const manrope = Manrope({ 
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['200', '300', '400', '500', '600', '700', '800']
})

const frankRuhl = Frank_Ruhl_Libre({ 
  subsets: ['latin'],
  variable: '--font-frank',
  weight: ['300', '400', '500', '600', '700', '800', '900']
})
```

### 4. Layout Principale
Crea il layout con Navbar, GridBackground, e Footer.

### 5. Componenti Riutilizzabili
Crea tutti i componenti UI base (cards, buttons, etc.)

### 6. Pagine
Implementa le pagine una alla volta, partendo dalla homepage.

### 7. Dati Mock
Crea file JSON con dati di esempio per team, publications, research, etc.

---

## 📊 DATI DI ESEMPIO (JSON)

### data/team.json
```json
{
  "pi": {
    "name": "Prof. Marco Rossi",
    "role": "Principal Investigator",
    "email": "marco.rossi@polimi.it",
    "bio": "Brief bio...",
    "bioFull": "Extended bio...",
    "image": "/images/team/marco-rossi.jpg"
  },
  "members": [
    {
      "id": 1,
      "name": "Dr. Maria Bianchi",
      "role": "PostDoc Researcher",
      "email": "maria.bianchi@polimi.it",
      "bio": "Research focus: microfluidics...",
      "bioFull": "Extended bio...",
      "image": "/images/team/maria-bianchi.jpg"
    }
  ]
}
```

### data/publications.json
```json
{
  "publications": [
    {
      "id": 1,
      "authors": ["Rossi M.", "Bianchi M.", "et al."],
      "title": "Advanced microfluidic systems for organ-on-chip applications",
      "journal": "Lab on a Chip",
      "year": 2024,
      "doi": "10.1039/xxxxx",
      "type": "Journal Article",
      "pdf": "/publications/rossi-2024.pdf"
    }
  ]
}
```

---

## ✨ FEATURES AGGIUNTIVE (Opzionali)

1. **Dark Mode:** Toggle con persistenza localStorage
2. **Search:** Barra di ricerca globale per publications/news
3. **Internazionalizzazione:** i18n per Italiano/Inglese
4. **Analytics:** Google Analytics / Plausible
5. **SEO:** Metadata dinamici, sitemap, robots.txt
6. **Animations:** Scroll-triggered fade-ins con Framer Motion
7. **Contact Form:** Implementare con Formspree o servizio simile

---

## 🎯 PRIORITÀ

**MUST HAVE (MVP):**
- ✅ Struttura completa delle pagine
- ✅ Navbar e Footer funzionanti
- ✅ Homepage con Hero + Overview
- ✅ Team page con grid membri
- ✅ Publications page con lista e filtri
- ✅ Responsive design perfetto
- ✅ Brand identity PoliMi rispettata al 100%

**NICE TO HAVE:**
- Animations avanzate
- Dark mode
- Search functionality
- Contact form working

---

## 🚀 DEPLOYMENT

Quando pronto, deploy su:
- **Vercel** (raccomandato per Next.js)
- **Netlify**
- **GitHub Pages** (con export statico)

---

## 📝 NOTE FINALI

- **Accessibilità:** WCAG 2.1 AA compliance
- **Performance:** Lighthouse score > 90
- **SEO:** Metadata completi per ogni pagina
- **Images:** Ottimizzare con Next.js Image component
- **Mobile:** Touch-friendly (min 44x44px per touch targets)

---

## 🎨 ISPIRAZIONE DESIGN

Siti di riferimento per layout e struttura:
- https://www.organ-on-chip.uni-tuebingen.de/ (struttura base)
- MIT Media Lab (per sezione research)
- ETH Zurich lab sites (per professionalità)

Ma con identità visiva 100% Politecnico di Milano.

---

**IMPORTANTE:** Genera tutto il codice necessario per un sito funzionante. Usa placeholder text/images dove necessario. Commenta bene il codice. Segui best practices Next.js 14.
