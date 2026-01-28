# 🚀 TEMPLATE COMPLETO SITO ORGAN-ON-CHIP POLIMI

## 📦 Cosa hai ricevuto

Un template completo Next.js 14 pronto all'uso con brand identity Politecnico di Milano integrata.

---

## 📋 FILE INCLUSI

### 1. **CURSOR_PROMPT.md** ⭐ INIZIA DA QUI
   - **Cosa contiene:** Prompt completo da copiare in Cursor Composer
   - **Come usare:** Apri Cursor → Composer → Incolla tutto il contenuto
   - **Cosa genera:** Progetto Next.js completo con tutte le pagine e componenti

### 2. **README.md**
   - **Cosa contiene:** Documentazione completa del progetto
   - **Include:**
     - Quick start guide
     - Setup manuale (alternativa a Cursor)
     - Roadmap sviluppo
     - Checklist pre-launch
     - Istruzioni deploy

### 3. **vincoli_brand_polimi.md**
   - **Cosa contiene:** Sintesi completa vincoli brand identity PoliMi
   - **Include:**
     - Palette colori con codici HEX/RGB
     - Tipografia (Manrope, Frank Ruhl Libre)
     - Regole layout e griglia
     - Do's and Don'ts

### 4. **tailwind.config.ts**
   - **Cosa contiene:** Configurazione Tailwind con colori e font PoliMi
   - **Come usare:** Sostituisci il file generato da Next.js con questo
   - **Include:** Tutti i colori custom, spacing, shadows

### 5. **GridBackground.tsx**
   - **Cosa contiene:** Componente React per griglia decorativa
   - **Come usare:** Copia in `components/GridBackground.tsx`
   - **Features:** 
     - Griglia che non interferisce con leggibilità
     - Opacità configurabile
     - Performance ottimizzata

### 6. **Navbar.tsx**
   - **Cosa contiene:** Componente React navbar completa
   - **Come usare:** Copia in `components/Navbar.tsx`
   - **Features:**
     - Sticky on scroll
     - Mobile responsive
     - Brand PoliMi integrata
     - Effetto trasparenza su scroll

### 7. **HomePage-example.tsx**
   - **Cosa contiene:** Esempio completo homepage già stilizzata
   - **Come usare:** Usa come riferimento per `app/page.tsx`
   - **Include:**
     - Hero section
     - Research areas cards
     - Latest news
     - Stats
     - CTA section

### 8. **data-team.json**
   - **Cosa contiene:** Dati di esempio per pagina Team
   - **Come usare:** Copia in `data/team.json` e personalizza
   - **Include:** PI, PostDoc, PhD, Master students, Alumni

### 9. **data-publications.json**
   - **Cosa contiene:** Dati di esempio per pagina Publications
   - **Come usare:** Copia in `data/publications.json` e personalizza
   - **Include:** Journal articles, conference papers, reviews

---

## 🎯 QUICK START - 3 OPZIONI

### Opzione A: SUPER VELOCE con Cursor (Raccomandato)

```bash
# 1. Crea cartella progetto
mkdir organ-on-chip-polimi
cd organ-on-chip-polimi

# 2. Apri con Cursor
cursor .

# 3. Apri Composer (Cmd/Ctrl + I)
# 4. Copia e incolla TUTTO il contenuto di CURSOR_PROMPT.md
# 5. Aspetta che Cursor generi tutto (2-3 minuti)
# 6. Esegui:
npm install
npm run dev

# 7. Apri http://localhost:3000
```

**Tempo totale: ~10 minuti**

---

### Opzione B: Setup Manuale

```bash
# 1. Crea progetto Next.js
npx create-next-app@latest organ-on-chip-polimi
cd organ-on-chip-polimi

# 2. Installa dipendenze extra
npm install framer-motion lucide-react

# 3. Sostituisci tailwind.config.ts con quello fornito

# 4. Crea struttura cartelle
mkdir -p components data public/images/{team,research,news}

# 5. Copia i file forniti:
# - GridBackground.tsx → components/
# - Navbar.tsx → components/
# - data-team.json → data/team.json
# - data-publications.json → data/publications.json

# 6. Configura font in app/layout.tsx (vedi README.md)

# 7. Crea le pagine seguendo gli esempi

# 8. Run
npm run dev
```

**Tempo totale: ~2-4 ore** (dipende dall'esperienza)

---

### Opzione C: Ibrida (Cursor + Personalizzazione)

```bash
# 1. Usa Cursor per generare struttura base (Opzione A)

# 2. Personalizza componenti e pagine con i file forniti:
# - Sostituisci Navbar generata con quella fornita
# - Usa HomePage-example.tsx come riferimento
# - Popola dati con JSON forniti

# 3. Aggiungi GridBackground al layout

# 4. Testa e raffina
```

**Tempo totale: ~1-2 ore**

---

## 🎨 PERSONALIZZAZIONE

### Colori

Già configurati in `tailwind.config.ts`. Per usarli:

```tsx
// Text
className="text-polimi-blue-heritage"
className="text-polimi-bright-blue"

// Background
className="bg-polimi-blue-heritage"
className="bg-polimi-bright-blue/10"  // con opacità

// Border
className="border-polimi-gray"
```

### Tipografia

```tsx
// Sans-serif (Manrope)
className="font-sans"  // Default

// Serif (Frank Ruhl Libre)
className="font-serif"  // Per titoli

// Weights
font-light (300)
font-normal (400)
font-medium (500)
font-semibold (600)
font-bold (700)
font-extrabold (800)
```

### Spacing PoliMi

```tsx
// Margini laterali desktop (78px)
className="px-78"

// O usa max-width custom
className="max-w-screen-2xl mx-auto px-6 lg:px-12"
```

---

## 📊 STRUTTURA PROGETTO GENERATA

```
organ-on-chip-polimi/
├── app/
│   ├── layout.tsx              # Layout con font
│   ├── page.tsx                # Homepage
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
│   ├── GridBackground.tsx
│   ├── TeamCard.tsx
│   ├── PublicationCard.tsx
│   └── ui/
├── data/
│   ├── team.json
│   ├── publications.json
│   ├── research.json
│   └── news.json
├── public/
│   ├── images/
│   └── logo/
├── tailwind.config.ts
└── package.json
```

---

## ✅ CHECKLIST POST-SETUP

### Immediate (Giorno 1)
- [ ] Sostituisci placeholder logo con logo PoliMi ufficiale
- [ ] Personalizza testi homepage
- [ ] Aggiungi foto PI e primi membri team
- [ ] Verifica responsive su mobile

### Settimana 1
- [ ] Completa dati team.json con info reali
- [ ] Aggiungi prime 10-20 pubblicazioni
- [ ] Crea contenuti pagina Research
- [ ] Setup Google Analytics

### Settimana 2
- [ ] Aggiungi tutte le foto laboratorio
- [ ] Completa tutte le pubblicazioni
- [ ] Implementa pagina News
- [ ] Form contatto funzionante

### Pre-Launch
- [ ] Test accessibilità (WCAG 2.1 AA)
- [ ] Ottimizza immagini
- [ ] SEO: metadata tutte le pagine
- [ ] Privacy policy
- [ ] Deploy staging per review

---

## 🌐 DEPLOY

### Vercel (Raccomandato - 5 minuti)

```bash
# 1. Push su GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/organ-on-chip-polimi.git
git push -u origin main

# 2. Vai su vercel.com
# 3. Click "Import Project"
# 4. Seleziona il repository
# 5. Deploy! (automatico)

# URL temporaneo: organ-on-chip-polimi.vercel.app
```

### Dominio Custom PoliMi

Quando ottieni `organ-on-chip.polimi.it`:

1. Vai su Vercel → Settings → Domains
2. Aggiungi dominio custom
3. Configura DNS record forniti da Vercel
4. Attendi propagazione (5-60 min)

---

## 🎓 RISORSE

### Documentazione
- [Next.js 14](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

### Ispirazione Design
- Sito riferimento: https://www.organ-on-chip.uni-tuebingen.de/
- MIT Media Lab
- ETH Zurich research groups

### Supporto Brand PoliMi
- Email: brandidentity@polimi.it
- Per loghi ufficiali e consulenza

---

## 🔥 PRO TIPS

1. **Usa Cursor AI liberamente:**
   ```
   "Aggiungi animazioni fade-in on scroll a questa sezione"
   "Crea un componente card per le pubblicazioni con questi dati"
   "Rendi questa navbar sticky con effetto blur"
   ```

2. **Ottimizza immagini:**
   - Usa sempre `next/image` component
   - Formato WebP per web
   - Dimensioni: max 1920px width

3. **Accessibilità:**
   - Sempre `alt` text su immagini
   - Contrasto minimo 4.5:1
   - Navigazione da tastiera funzionante

4. **Performance:**
   - Lazy load immagini fuori viewport
   - Code splitting automatico con Next.js
   - Lighthouse score obiettivo: >90

5. **SEO:**
   - Metadata univoci per ogni pagina
   - Open Graph images per social
   - Sitemap.xml generato automaticamente

---

## 💡 MODIFICHE COMUNI

### Cambiare colori accenti

In `tailwind.config.ts`:
```typescript
colors: {
  polimi: {
    // ... colori base ...
    'accent': '#TUO_COLORE',  // Aggiungi qui
  }
}
```

### Aggiungere una pagina

```bash
# 1. Crea file
mkdir app/nuova-pagina
touch app/nuova-pagina/page.tsx

# 2. Aggiungi link in Navbar.tsx
{ name: 'Nuova Pagina', href: '/nuova-pagina' }
```

### Cambiare font

In `app/layout.tsx`:
```typescript
import { Altra_Font } from 'next/font/google'

const altraFont = Altra_Font({ 
  subsets: ['latin'],
  variable: '--font-altra'
})
```

---

## 📞 SUPPORTO

**Hai domande?**

1. Consulta il README.md completo
2. Chiedi a Cursor AI (è molto bravo!)
3. Contatta brandidentity@polimi.it per brand
4. Issues su GitHub per problemi tecnici

---

## 🎉 HAI TUTTO IL NECESSARIO!

Con questi file hai:
- ✅ Template professionale Next.js 14
- ✅ Brand identity PoliMi 100% rispettata
- ✅ Componenti riutilizzabili pronti
- ✅ Dati di esempio strutturati
- ✅ Documentazione completa
- ✅ Guide deploy e personalizzazione

**Buon lavoro! 🚀**

---

## 🗂️ FILES QUICK REFERENCE

| File | Uso | Priorità |
|------|-----|----------|
| CURSOR_PROMPT.md | Genera tutto il progetto | ⭐⭐⭐⭐⭐ |
| README.md | Documentazione principale | ⭐⭐⭐⭐⭐ |
| vincoli_brand_polimi.md | Riferimento brand | ⭐⭐⭐⭐ |
| tailwind.config.ts | Config Tailwind | ⭐⭐⭐⭐⭐ |
| Navbar.tsx | Navbar pronta | ⭐⭐⭐⭐ |
| GridBackground.tsx | Griglia decorativa | ⭐⭐⭐ |
| HomePage-example.tsx | Esempio homepage | ⭐⭐⭐⭐ |
| data-team.json | Dati team | ⭐⭐⭐⭐ |
| data-publications.json | Dati pubblicazioni | ⭐⭐⭐⭐ |

---

**Versione:** 1.0  
**Data:** Gennaio 2025  
**Creato per:** Organ-on-Chip Lab, DEIB, Politecnico di Milano
