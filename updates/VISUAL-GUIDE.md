# 🎨 VISUAL WORKFLOW GUIDE

## Quick Start Flowchart

```
┌─────────────────────────────────────────────────────────┐
│  📥 HAI RICEVUTO 11 FILE                                │
│                                                          │
│  Inizia da: 00-START-HERE.md                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  🚀 SCEGLI IL TUO PERCORSO                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Opzione A: VELOCE (10 min) ←── RACCOMANDATO           │
│  └─ Usa Cursor + CURSOR_PROMPT.md                      │
│                                                          │
│  Opzione B: MANUALE (2-4 ore)                          │
│  └─ Segui README.md step-by-step                       │
│                                                          │
│  Opzione C: IBRIDA (1-2 ore)                           │
│  └─ Cursor base + personalizza con file forniti        │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Struttura File & Uso

```
📦 FILE RICEVUTI
│
├── 00-START-HERE.md ⭐⭐⭐⭐⭐
│   └── Leggi per primo! Overview completa di tutto
│
├── CURSOR_PROMPT.md ⭐⭐⭐⭐⭐
│   └── Copia in Cursor Composer → Genera tutto
│
├── README.md ⭐⭐⭐⭐⭐
│   ├── Setup manuale completo
│   ├── Roadmap sviluppo
│   ├── Istruzioni deploy
│   └── Checklist pre-launch
│
├── vincoli_brand_polimi.md ⭐⭐⭐⭐
│   ├── Palette colori completa
│   ├── Tipografia (Manrope, Frank Ruhl Libre)
│   └── Regole layout
│
├── tailwind.config.ts ⭐⭐⭐⭐⭐
│   └── Config Tailwind pronta all'uso
│
├── package.json ⭐⭐⭐⭐
│   └── Dipendenze necessarie
│
├── GridBackground.tsx ⭐⭐⭐
│   └── Componente griglia decorativa PoliMi
│
├── Navbar.tsx ⭐⭐⭐⭐
│   └── Navbar completa con brand PoliMi
│
├── HomePage-example.tsx ⭐⭐⭐⭐
│   └── Homepage completa di esempio
│
├── data-team.json ⭐⭐⭐⭐
│   └── Struttura dati membri team
│
└── data-publications.json ⭐⭐⭐⭐
    └── Struttura dati pubblicazioni
```

---

## 🔄 Workflow Completo - Opzione A (Veloce)

```
START
  ↓
┌─────────────────────────────────┐
│ 1. Crea directory progetto      │
│    mkdir organ-on-chip-polimi   │
│    cd organ-on-chip-polimi      │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ 2. Apri con Cursor              │
│    cursor .                     │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ 3. Apri Composer (Cmd/Ctrl+I)  │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ 4. Copia CURSOR_PROMPT.md      │
│    → Incolla nel Composer      │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ 5. Aspetta generazione          │
│    (2-3 minuti)                │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ 6. Installa dipendenze          │
│    npm install                  │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ 7. Avvia dev server            │
│    npm run dev                  │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ 8. Apri browser                │
│    http://localhost:3000        │
└─────────────────────────────────┘
  ↓
✅ SITO FUNZIONANTE!
  ↓
┌─────────────────────────────────┐
│ 9. Personalizza contenuti       │
│    - Sostituisci logo          │
│    - Aggiungi foto team        │
│    - Inserisci testi reali     │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ 10. Deploy su Vercel           │
│     git init && git push       │
│     vercel.com → Import        │
└─────────────────────────────────┘
  ↓
🎉 LIVE!
```

---

## 📊 Timeline Sviluppo

```
SETTIMANA 1
│
├─ Giorno 1-2: Setup & Struttura Base
│  ├─ ✅ Genera progetto con Cursor
│  ├─ ✅ Verifica responsive
│  ├─ ✅ Sostituisci logo PoliMi
│  └─ ✅ Personalizza homepage
│
├─ Giorno 3-4: Contenuti Team & Research
│  ├─ 📝 Popola data-team.json
│  ├─ 📸 Aggiungi foto membri
│  ├─ 📄 Scrivi descrizioni research
│  └─ 🎨 Aggiungi immagini laboratorio
│
└─ Giorno 5-7: Publications & News
   ├─ 📚 Popola data-publications.json
   ├─ 📰 Crea prime 5-10 news
   └─ 🔗 Aggiungi link esterni

SETTIMANA 2
│
├─ Giorno 8-10: Rifinitura & Testing
│  ├─ ♿ Test accessibilità
│  ├─ 📱 Test mobile/tablet
│  ├─ ⚡ Ottimizza performance
│  └─ 🔍 SEO metadata
│
├─ Giorno 11-12: Deploy Staging
│  ├─ 🚀 Deploy su Vercel
│  ├─ 👀 Review con team
│  └─ 🐛 Bug fixes
│
└─ Giorno 13-14: Production
   ├─ 🌐 Setup dominio PoliMi
   ├─ 📊 Google Analytics
   ├─ 📧 Form contatto
   └─ ✅ LAUNCH!
```

---

## 🎨 Componenti Visivi

### Palette Colori PoliMi

```
┌─────────────────────────┬──────────────┐
│ Blue Heritage (Main)    │  #102C53     │ ██████
├─────────────────────────┼──────────────┤
│ Bright Blue (Accent)    │  #4DC9FF     │ ██████
├─────────────────────────┼──────────────┤
│ Alpha Blue (Accent)     │  #2CB7FF     │ ██████
├─────────────────────────┼──────────────┤
│ Beta Blue (Accent)      │  #0BA4FF     │ ██████
├─────────────────────────┼──────────────┤
│ Gray (Neutral)          │  #E0DCDC     │ ██████
└─────────────────────────┴──────────────┘
```

### Tipografia

```
MANROPE (Sans-Serif)
├─ ExtraLight 200
├─ Light 300
├─ Regular 400      ← Body text
├─ Medium 500
├─ SemiBold 600
├─ Bold 700         ← Headings
└─ ExtraBold 800

FRANK RUHL LIBRE (Serif)
├─ Light 300
├─ Regular 400
├─ Medium 500
├─ SemiBold 600
├─ Bold 700         ← H1, H2
├─ ExtraBold 800
└─ Black 900
```

### Spacing System

```
Base: 8px

8px  ▪
16px ▪▪
24px ▪▪▪
32px ▪▪▪▪
48px ▪▪▪▪▪▪
64px ▪▪▪▪▪▪▪▪
78px ▪▪▪▪▪▪▪▪▪▪  ← Margini laterali PoliMi
96px ▪▪▪▪▪▪▪▪▪▪▪▪
```

---

## 🖼️ Layout Anatomy

```
┌─────────────────────────────────────────────────┐
│  NAVBAR (sticky, bg: blue-heritage)            │
│  Logo + Lab Name | Menu items                  │
└─────────────────────────────────────────────────┘
│
├── GridBackground (decorative, z-index: -10) ───┤
│   └── Opacity: 0.05-0.1, non interferisce      │
│
┌─────────────────────────────────────────────────┐
│  CONTENT AREA                                   │
│                                                 │
│  ┌──────────────────────────┐                 │
│  │  78px  │  Content  │ 78px │  Desktop       │
│  └──────────────────────────┘                 │
│                                                 │
│  ┌─────────────────────────────┐              │
│  │ 24px │  Content  │ 24px │     Mobile       │
│  └─────────────────────────────┘              │
│                                                 │
│  Max-width: 1400px (screen-2xl)               │
│  Centered with mx-auto                         │
└─────────────────────────────────────────────────┘
│
┌─────────────────────────────────────────────────┐
│  FOOTER (bg: blue-heritage, text: white)       │
│  Quick Links | Contacts | Logo                 │
└─────────────────────────────────────────────────┘
```

---

## 🔧 File Modifications Guide

### Quando modificare ogni file:

```
tailwind.config.ts
├─ Aggiungi nuovi colori
├─ Modifica spacing custom
└─ Aggiungi font personalizzati

GridBackground.tsx
├─ Cambia opacità griglia (default: 0.08)
├─ Modifica numero colonne (default: 12)
└─ Abilita/disabilita linee orizzontali

Navbar.tsx
├─ Aggiungi/rimuovi voci menu
├─ Cambia comportamento scroll
└─ Modifica logo/brand

data-team.json
├─ Aggiungi nuovi membri
├─ Aggiorna info esistenti
└─ Gestisci alumni

data-publications.json
├─ Aggiungi nuove pubblicazioni
├─ Aggiorna citation counts
└─ Gestisci featured papers
```

---

## 📋 Pre-Launch Checklist

```
CONTENT
☐ Logo PoliMi ufficiale
☐ Foto tutti membri team
☐ Immagini laboratorio (min 10)
☐ Testi completi tutte le pagine
☐ Pubblicazioni aggiornate
☐ Almeno 5 news/articoli

TECHNICAL
☐ Metadata SEO complete
☐ Open Graph images
☐ Favicon
☐ Robots.txt
☐ Sitemap.xml
☐ Google Analytics setup
☐ Form contatto funzionante

QUALITY
☐ Test su Chrome, Firefox, Safari
☐ Test mobile (iOS + Android)
☐ Lighthouse score > 90
☐ Nessun link rotto
☐ Spelling check
☐ Accessibilità WCAG 2.1 AA

LEGAL
☐ Privacy Policy
☐ Cookie banner (se necessario)
☐ GDPR compliance
☐ Disclaimer ricerca
```

---

## 🚀 Deploy Options Comparison

```
┌──────────┬────────┬──────────┬──────────┐
│ Platform │ Speed  │ Price    │ Ease     │
├──────────┼────────┼──────────┼──────────┤
│ Vercel   │ ⚡⚡⚡ │ FREE     │ ⭐⭐⭐  │ ← BEST
├──────────┼────────┼──────────┼──────────┤
│ Netlify  │ ⚡⚡   │ FREE     │ ⭐⭐⭐  │
├──────────┼────────┼──────────┼──────────┤
│ GitHub   │ ⚡     │ FREE     │ ⭐⭐    │
│ Pages    │        │          │          │
└──────────┴────────┴──────────┴──────────┘

Vercel Pro:
✅ Automatic HTTPS
✅ Global CDN
✅ Git integration
✅ Preview deployments
✅ Analytics
✅ Perfect for Next.js
```

---

## 💡 Pro Tips Visual

```
1. CURSOR AI
   ┌────────────────────────────────────┐
   │ "Aggiungi animazioni fade-in      │
   │  on scroll a questa sezione"       │
   └────────────────────────────────────┘
        ↓
   Cursor genera tutto il codice!

2. COMPONENT REUSE
   TeamCard → ResearchCard → ProjectCard
   └─ Same structure, different data

3. DATA-DRIVEN
   JSON files → Easy to update
   No code changes needed for content

4. RESPONSIVE FIRST
   Mobile → Tablet → Desktop
   Test on actual devices, not just browser
```

---

## 🎯 Success Metrics

```
LAUNCH GOALS
├─ Lighthouse Performance: > 90
├─ Accessibility Score: > 95
├─ SEO Score: > 90
├─ Best Practices: > 95
└─ Page Load Time: < 2s

POST-LAUNCH (3 months)
├─ Monthly Visitors: 500+
├─ Avg Session Duration: > 2min
├─ Pages per Session: > 3
└─ Bounce Rate: < 60%
```

---

## 📞 Support Decision Tree

```
Hai un problema?
│
├─ Brand Identity?
│  └─ brandidentity@polimi.it
│
├─ Cursor/Coding?
│  └─ Chiedi a Cursor AI nel Composer
│
├─ Deploy/Hosting?
│  └─ Vercel/Netlify docs
│
├─ Next.js/React?
│  └─ nextjs.org/docs
│
└─ General web dev?
   └─ README.md + questo file
```

---

**🎉 HAI TUTTO IL NECESSARIO PER PARTIRE!**

**Next steps:**
1. Leggi 00-START-HERE.md
2. Scegli il tuo workflow (A/B/C)
3. Inizia a costruire!

**Buon lavoro! 🚀**
