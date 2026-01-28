# Organ-on-Chip Laboratory Website
## Politecnico di Milano - DEIB

Sito web del laboratorio di ricerca Organ-on-Chip del Dipartimento di Elettronica, Informazione e Bioingegneria (DEIB).

---

## 🚀 Quick Start con Cursor

### 1. Preparazione

```bash
# Crea la directory del progetto
mkdir organ-on-chip-polimi
cd organ-on-chip-polimi
```

### 2. Apri con Cursor

```bash
cursor .
```

### 3. Usa il Composer di Cursor

**Copia e incolla il contenuto completo di `CURSOR_PROMPT.md` nel Composer.**

Questo genererà automaticamente:
- Setup completo Next.js 14
- Tutte le pagine
- Componenti riutilizzabili
- Configurazione Tailwind con colori PoliMi
- Font Manrope e Frank Ruhl Libre
- Dati di esempio in JSON

---

## 📁 File Pronti da Usare

Nella cartella principale hai già questi file pronti:

### `tailwind.config.ts`
Configurazione Tailwind con:
- ✅ Colori PoliMi (blue-heritage, bright-blue, etc.)
- ✅ Font Manrope e Frank Ruhl Libre
- ✅ Spacing custom (78px margini)
- ✅ Shadow e border-radius PoliMi

**Copia questo file nella root del progetto Next.js dopo il setup iniziale.**

### `data-team.json`
Dati di esempio per la pagina Team:
- Principal Investigator
- PostDoc Researchers
- PhD Students
- Master Students
- Alumni

**Copia in `/data/team.json` nel progetto.**

### `data-publications.json`
Dati di esempio per la pagina Publications:
- Journal Articles
- Conference Papers
- Book Chapters
- Reviews

**Copia in `/data/publications.json` nel progetto.**

### `GridBackground.tsx`
Componente React per la griglia decorativa PoliMi.

**Copia in `/components/GridBackground.tsx` nel progetto.**

### `Navbar.tsx`
Componente React per la navbar con brand identity PoliMi.

**Copia in `/components/Navbar.tsx` nel progetto.**

---

## 🎨 Brand Identity PoliMi - Riferimento Rapido

### Colori Principali

```css
--polimi-blue-heritage: #102C53;  /* Principale */
--polimi-bright-blue: #4DC9FF;    /* Accenti Ingegneria */
--polimi-alpha-blue: #2CB7FF;     /* Accenti Ingegneria */
--polimi-gray: #E0DCDC;           /* Neutro */
```

### Tipografia

- **Principale:** Manrope (sans-serif)
- **Secondaria:** Frank Ruhl Libre (serif)
- **Fallback:** Arial / Georgia

### Spacing

- Margini laterali desktop: 78px (custom spacing in Tailwind)
- Sistema 8px base: 8, 16, 24, 32, 48, 64, 96

---

## 📦 Setup Manuale (Alternativa a Cursor)

Se preferisci setup manuale invece di usare Cursor:

### 1. Crea progetto Next.js

```bash
npx create-next-app@latest organ-on-chip-polimi
# Seleziona:
# ✅ TypeScript
# ✅ Tailwind CSS
# ✅ App Router
# ❌ src/ directory
# ✅ Import alias (@/*)
cd organ-on-chip-polimi
```

### 2. Installa dipendenze

```bash
npm install framer-motion lucide-react
```

### 3. Sostituisci `tailwind.config.ts`

Sostituisci il file generato con quello fornito (`tailwind.config.ts`).

### 4. Setup Font in `app/layout.tsx`

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

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={`${manrope.variable} ${frankRuhl.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

### 5. Crea struttura cartelle

```bash
mkdir -p components/ui data public/images/{team,research,news}
```

### 6. Copia i file forniti

- `GridBackground.tsx` → `components/GridBackground.tsx`
- `Navbar.tsx` → `components/Navbar.tsx`
- `data-team.json` → `data/team.json`
- `data-publications.json` → `data/publications.json`

### 7. Crea le pagine

Segui la struttura in `CURSOR_PROMPT.md` per creare:
- `app/page.tsx` (Home)
- `app/team/page.tsx`
- `app/research/page.tsx`
- `app/publications/page.tsx`
- `app/collaborations/page.tsx`
- `app/news/page.tsx`
- `app/join/page.tsx`
- `app/contact/page.tsx`

---

## 🎯 Roadmap Sviluppo

### Fase 1 - MVP (1-2 settimane)
- [x] Setup progetto e brand identity
- [ ] Navbar e Footer
- [ ] Homepage con Hero
- [ ] Pagina Team
- [ ] Pagina Publications
- [ ] Pagina Research
- [ ] Responsive design completo

### Fase 2 - Content (1 settimana)
- [ ] Popolamento dati reali Team
- [ ] Popolamento pubblicazioni reali
- [ ] Immagini e foto laboratorio
- [ ] Contenuti Research projects

### Fase 3 - Features (1-2 settimane)
- [ ] Filtri e search Publications
- [ ] Animations (Framer Motion)
- [ ] News/Blog system
- [ ] Contact form
- [ ] SEO optimization

### Fase 4 - Polish (1 settimana)
- [ ] Testing accessibilità
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Deploy su Vercel/Netlify

---

## 🌐 Deploy

### Deploy su Vercel (Raccomandato)

```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Oppure:
1. Push su GitHub
2. Vai su vercel.com
3. "Import Project" → seleziona repo
4. Deploy automatico!

### Deploy su Netlify

```bash
# Installa Netlify CLI
npm i -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod
```

---

## 📧 Configurazione Dominio PoliMi

Per ottenere `organ-on-chip.polimi.it` o `organonchip.deib.polimi.it`:

1. **Contatta ICT PoliMi:**
   - Email: contactcenter@polimi.it
   - Richiedi sottodominio per laboratorio di ricerca

2. **Fornisci informazioni:**
   - Nome laboratorio
   - Dipartimento (DEIB)
   - Responsabile (PI del laboratorio)
   - Hosting: Vercel/Netlify (esterno)

3. **Configurazione DNS:**
   - Richiedi record CNAME verso Vercel/Netlify
   - Oppure record A con IP specifici

4. **Tempo stimato:** 2-6 settimane per approvazione

### Alternativa temporanea

Mentre aspetti il dominio PoliMi:
- Usa `organonchip-polimi.vercel.app`
- Poi fai redirect quando ottieni dominio ufficiale

---

## 📚 Documentazione di Riferimento

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Brand Guidelines PoliMi](brandidentity@polimi.it)

---

## ✅ Checklist Pre-Launch

### Content
- [ ] Logo PoliMi ufficiale
- [ ] Foto team membri
- [ ] Immagini laboratorio/progetti
- [ ] Testi biografici completi
- [ ] Lista pubblicazioni aggiornata
- [ ] Descrizioni progetti di ricerca

### Technical
- [ ] Metadata SEO tutte le pagine
- [ ] Open Graph images
- [ ] Robots.txt
- [ ] Sitemap.xml
- [ ] Google Analytics / Plausible
- [ ] Form contatto funzionante
- [ ] HTTPS attivo

### Legal & Compliance
- [ ] Privacy Policy
- [ ] Cookie banner (se necessario)
- [ ] Accessibilità WCAG 2.1 AA
- [ ] GDPR compliance

### Performance
- [ ] Lighthouse score > 90
- [ ] Images ottimizzate (Next.js Image)
- [ ] Lazy loading
- [ ] Core Web Vitals ok

---

## 🤝 Supporto

Per domande sulla brand identity PoliMi:
- **Email:** brandidentity@polimi.it
- **Area:** Public Engagement and Communication

Per supporto tecnico sul sito:
- Consulta la documentazione Next.js
- Usa Cursor AI per debugging
- GitHub Issues nel repository del progetto

---

## 📄 License

Questo template è fornito per uso interno del Politecnico di Milano.
La brand identity è proprietà del Politecnico di Milano.

---

**Buon lavoro! 🚀**
