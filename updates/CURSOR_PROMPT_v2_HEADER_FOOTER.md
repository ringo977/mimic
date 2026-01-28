# PROMPT AGGIORNATO PER CURSOR - Header e Footer Specifici

## 🎯 AGGIORNAMENTO IMPORTANTE: Header e Footer

Il laboratorio vuole seguire le linee guida PoliMi per header e footer:
- **Header:** Variante A (specifica da fornire)
- **Footer:** Variante B (specifica da fornire)

---

## 📋 HEADER REQUIREMENTS

### Layout Header (da implementare secondo variante A)

**Struttura base obbligatoria:**
```
┌─────────────────────────────────────────────────────┐
│ [Logo PoliMi] [Nome Lab/Dipartimento]    [Menu]     │
└─────────────────────────────────────────────────────┘
```

### Specifiche Tecniche Header

1. **Background:**
   - Colore: `polimi-blue-heritage` (#102C53)
   - Height: 80px desktop, 64px mobile
   - Sticky: Yes (fixed on scroll)
   - Trasparenza on scroll: backdrop-blur + opacity 95%

2. **Logo:**
   - Posizione: Left aligned
   - Dimensioni: 48px height (logo + ghiera)
   - Area di rispetto: 2x cap-height "Politecnico"
   - File: Placeholder (da sostituire con logo ufficiale PoliMi)

3. **Nome Laboratorio/Dipartimento:**
   - Font: Manrope SemiBold
   - Size: 18px desktop, 16px mobile
   - Colore: White
   - Sotto-dicitura: "DEIB · Politecnico di Milano"
   - Font sotto-dicitura: Manrope Light, 12px
   - Colore sotto-dicitura: `polimi-bright-blue` (#4DC9FF)

4. **Menu di Navigazione:**
   - Desktop: Orizzontale, right aligned
   - Font: Manrope Medium, 14px
   - Colore: White
   - Hover: `polimi-bright-blue` + background white/10
   - Mobile: Hamburger menu → Sidebar overlay

5. **Margini:**
   - Laterali: 78px desktop, 24px mobile (secondo linee guida PoliMi)
   - Interno: 16px top/bottom

---

## 📋 FOOTER REQUIREMENTS

### Layout Footer (da implementare secondo variante B)

**Struttura base obbligatoria:**
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│  [Col 1: Lab Info]  [Col 2: Quick Links]  [Col 3]  │
│                                                      │
│  ─────────────────────────────────────────────────  │
│  Copyright © 2025 · Privacy · Cookies               │
└─────────────────────────────────────────────────────┘
```

### Specifiche Tecniche Footer

1. **Background:**
   - Colore principale: `polimi-blue-heritage` (#102C53)
   - Sezione copyright: `polimi-blue-heritage` 100% opacity

2. **Layout Grid:**
   - Desktop: 3 colonne equal width
   - Tablet: 2 colonne
   - Mobile: 1 colonna stack

3. **Colonna 1 - Informazioni Laboratorio:**
   - Logo PoliMi (white version) - 40px height
   - Nome laboratorio: Manrope SemiBold, 16px, white
   - Tagline/Descrizione breve: Manrope Light, 14px, white/80
   - Max 2-3 righe di testo

4. **Colonna 2 - Quick Links:**
   - Titolo sezione: Manrope SemiBold, 14px, `polimi-bright-blue`
   - Link items:
     - Font: Manrope Regular, 14px
     - Colore: white/90
     - Hover: `polimi-bright-blue`
     - Line-height: 2rem
   - Links: Home, Research, Team, Publications, Contact

5. **Colonna 3 - Contatti:**
   - Titolo: "Contatti" - Manrope SemiBold, 14px, `polimi-bright-blue`
   - Indirizzo:
     - Via Golgi 39, 20133 Milano
     - Font: Manrope Regular, 14px, white/90
   - Email: Link cliccabile, hover `polimi-bright-blue`
   - Social icons (se applicabili): Outline style, white

6. **Sezione Copyright (Bottom bar):**
   - Background: `polimi-blue-heritage` (più scuro 5%)
   - Height: 48px
   - Font: Manrope Regular, 12px
   - Colore: white/70
   - Layout: Left aligned copyright, right aligned policy links
   - Border-top: 1px solid white/10

7. **Margini e Padding:**
   - Laterali: 78px desktop, 24px mobile
   - Padding top: 64px
   - Padding bottom: 32px (prima del copyright bar)
   - Gap tra colonne: 48px desktop, 32px tablet

---

## 🎨 DESIGN SYSTEM COMPLETO

### Colori (come da brand guidelines)
```css
--polimi-blue-heritage: #102C53;  /* Background header/footer */
--polimi-bright-blue: #4DC9FF;    /* Accenti e hover */
--polimi-alpha-blue: #2CB7FF;     /* Hover secondario */
--polimi-white: #FFFFFF;          /* Testi principali */
--polimi-gray: #E0DCDC;           /* Bordi sottili */
```

### Tipografia
```css
/* Header & Footer usano principalmente Manrope */
font-family: 'Manrope', Arial, sans-serif;

/* Weights disponibili */
font-weight: 300; /* Light - per sotto-diciture */
font-weight: 400; /* Regular - testi standard */
font-weight: 500; /* Medium - menu items */
font-weight: 600; /* SemiBold - titoli sezioni */
font-weight: 700; /* Bold - nomi principali */
```

### Responsive Breakpoints
```css
/* Mobile First */
sm: 640px   /* Tablet portrait */
md: 768px   /* Tablet landscape */
lg: 1024px  /* Desktop small */
xl: 1280px  /* Desktop standard */
2xl: 1536px /* Desktop large */
```

---

## 🚀 IMPLEMENTAZIONE IN NEXT.JS

### File da Creare/Modificare

1. **`components/Header.tsx`**
```tsx
'use client';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Gestione scroll per effetto trasparenza
  // Sticky positioning
  // Menu desktop + hamburger mobile
  // Area di rispetto logo
}
```

2. **`components/Footer.tsx`**
```tsx
export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  // Grid layout 3 colonne → responsive
  // Sezione copyright separata
  // Quick links + contatti
  // Social icons (opzionali)
}
```

3. **`app/layout.tsx`**
```tsx
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import GridBackground from '@/components/GridBackground'

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <GridBackground opacity={0.06} />
        <Header />
        <main className="min-h-screen pt-20"> {/* pt-20 per compensare header sticky */}
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
```

---

## 📐 LAYOUT ANATOMY

### Struttura Completa Pagina

```
┌──────────────────────────────────────────────┐
│  HEADER (sticky, 80px)                       │ ← Blue Heritage
│  [Logo] [Lab Name]           [Menu]          │
└──────────────────────────────────────────────┘
│
│  GridBackground (decorative, z-index: -10)
│
┌──────────────────────────────────────────────┐
│                                               │
│  CONTENT AREA                                │
│  (padding-top: 80px per compensare header)   │
│                                               │
│  78px │   Content Max-width: 1400px   │ 78px│
│                                               │
└──────────────────────────────────────────────┘
│
┌──────────────────────────────────────────────┐
│  FOOTER                                       │ ← Blue Heritage
│  ┌──────────────────────────────────────┐   │
│  │ [Lab Info] [Quick Links] [Contacts]  │   │
│  └──────────────────────────────────────┘   │
│  ──────────────────────────────────────────  │
│  Copyright © 2025 │ Privacy │ Cookies        │
└──────────────────────────────────────────────┘
```

---

## ✨ FEATURES OBBLIGATORIE

### Header
- ✅ Sticky on scroll
- ✅ Backdrop blur + trasparenza quando scrollato
- ✅ Logo PoliMi con area di rispetto
- ✅ Nome lab + sotto-dicitura DEIB
- ✅ Menu responsive (desktop orizzontale, mobile hamburger)
- ✅ Smooth transitions
- ✅ Accessibile (ARIA labels, keyboard navigation)

### Footer
- ✅ Grid responsive (3 col → 2 col → 1 col)
- ✅ Quick links funzionanti
- ✅ Email cliccabile (mailto:)
- ✅ Copyright dinamico (anno corrente)
- ✅ Policy links (Privacy, Cookies)
- ✅ Logo PoliMi versione white
- ✅ Spacing secondo linee guida (78px laterali)

---

## 🎯 ACCESSIBILITY REQUIREMENTS

### Header
```tsx
<nav aria-label="Main navigation">
  <a href="/" aria-label="Homepage Organ-on-Chip Lab">
    <img src="/logo.svg" alt="Logo Politecnico di Milano" />
  </a>
  {/* Menu items con focus states chiari */}
</nav>
```

### Footer
```tsx
<footer role="contentinfo" aria-label="Site footer">
  {/* Links con focus states */}
  {/* Email con aria-label descrittivo */}
</footer>
```

### Requisiti Generali
- Contrasto minimo WCAG AA: 4.5:1 per testi
- Focus indicators visibili
- Skip to main content link (opzionale ma raccomandato)
- Keyboard navigation completa

---

## 📱 RESPONSIVE BEHAVIOR

### Header Responsive

**Desktop (≥1024px):**
- Menu orizzontale inline
- Logo + nome full size
- Spacing completo

**Tablet (768px - 1023px):**
- Menu orizzontale compatto
- Logo leggermente ridotto
- Margini 32px

**Mobile (<768px):**
- Hamburger menu
- Logo + nome verticalmente centrati
- Menu overlay full-screen
- Margini 24px

### Footer Responsive

**Desktop (≥1024px):**
- 3 colonne equal width
- Spacing 48px tra colonne

**Tablet (768px - 1023px):**
- 2 colonne (Lab Info + Quick Links)
- Contacts in colonna separata sotto
- Spacing 32px

**Mobile (<768px):**
- 1 colonna stack
- Ordine: Lab Info → Quick Links → Contacts
- Spacing 32px tra sezioni

---

## 💡 BEST PRACTICES

1. **Performance:**
   - Lazy load logo images
   - Use Next.js Image component
   - Minimize re-renders con React.memo se necessario

2. **SEO:**
   - Semantic HTML (<header>, <nav>, <footer>)
   - Structured data (Organization schema)
   - Breadcrumbs nel header (opzionale)

3. **UX:**
   - Smooth scroll to anchors
   - Visual feedback on interactions
   - Loading states se necessario
   - Mobile menu close on route change

4. **Consistency:**
   - Use design tokens da tailwind.config.ts
   - Spacing system 8px base
   - Colori SEMPRE dalla palette PoliMi

---

## 🔧 ESEMPIO CODICE

### Header con Logo Placeholder

```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-polimi-blue-heritage">
  <nav className="max-w-screen-2xl mx-auto px-6 lg:px-78">
    <div className="flex items-center justify-between h-20">
      
      {/* Logo + Nome Lab */}
      <Link href="/" className="flex items-center space-x-4">
        {/* Placeholder logo - sostituire con logo PoliMi ufficiale */}
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
          <span className="text-polimi-blue-heritage font-bold text-sm">
            POLIMI
          </span>
        </div>
        
        <div>
          <div className="text-white font-semibold text-lg font-serif">
            Organ-on-Chip Lab
          </div>
          <div className="text-polimi-bright-blue text-xs font-light">
            DEIB · Politecnico di Milano
          </div>
        </div>
      </Link>
      
      {/* Menu Desktop */}
      <div className="hidden lg:flex items-center space-x-1">
        {menuItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="px-4 py-2 text-sm font-medium text-white
                     hover:text-polimi-bright-blue hover:bg-white/10
                     rounded-md transition-colors"
          >
            {item.name}
          </Link>
        ))}
      </div>
      
      {/* Hamburger Mobile */}
      <button className="lg:hidden p-2 text-white">
        <Menu className="h-6 w-6" />
      </button>
    </div>
  </nav>
</header>
```

### Footer 3 Colonne

```tsx
<footer className="bg-polimi-blue-heritage text-white">
  <div className="max-w-screen-2xl mx-auto px-6 lg:px-78 pt-16 pb-8">
    
    {/* Grid 3 colonne */}
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
      
      {/* Col 1: Lab Info */}
      <div>
        <div className="w-10 h-10 bg-white rounded-full mb-4" />
        <h3 className="font-semibold text-base mb-2">
          Organ-on-Chip Laboratory
        </h3>
        <p className="text-sm text-white/80 leading-relaxed">
          Developing advanced microfluidic platforms for drug screening 
          and disease modeling.
        </p>
      </div>
      
      {/* Col 2: Quick Links */}
      <div>
        <h4 className="font-semibold text-sm text-polimi-bright-blue mb-4">
          Quick Links
        </h4>
        <ul className="space-y-2">
          {links.map(link => (
            <li key={link.href}>
              <Link 
                href={link.href}
                className="text-sm text-white/90 hover:text-polimi-bright-blue
                         transition-colors"
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Col 3: Contatti */}
      <div>
        <h4 className="font-semibold text-sm text-polimi-bright-blue mb-4">
          Contatti
        </h4>
        <address className="not-italic text-sm text-white/90 space-y-2">
          <p>Via Golgi 39</p>
          <p>20133 Milano, Italia</p>
          <p>
            <a 
              href="mailto:lab@deib.polimi.it"
              className="hover:text-polimi-bright-blue transition-colors"
            >
              lab@deib.polimi.it
            </a>
          </p>
        </address>
      </div>
    </div>
    
    {/* Copyright Bar */}
    <div className="border-t border-white/10 pt-6">
      <div className="flex flex-col md:flex-row justify-between 
                    items-center text-xs text-white/70 space-y-2 md:space-y-0">
        <p>© {new Date().getFullYear()} Politecnico di Milano</p>
        <div className="flex space-x-4">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/cookies" className="hover:text-white transition-colors">
            Cookie Policy
          </Link>
        </div>
      </div>
    </div>
  </div>
</footer>
```

---

## 📝 CHECKLIST IMPLEMENTAZIONE

### Header
- [ ] Struttura HTML semantica con <header> e <nav>
- [ ] Logo placeholder (da sostituire)
- [ ] Nome laboratorio + sotto-dicitura DEIB
- [ ] Menu desktop orizzontale
- [ ] Hamburger menu mobile con overlay
- [ ] Sticky positioning con backdrop-blur
- [ ] Area di rispetto logo rispettata
- [ ] Colori PoliMi corretti
- [ ] Margini 78px desktop
- [ ] Transizioni smooth
- [ ] Accessibilità (ARIA, keyboard nav)

### Footer
- [ ] Struttura HTML semantica con <footer>
- [ ] Grid 3 colonne responsive
- [ ] Logo PoliMi white version
- [ ] Quick links funzionanti
- [ ] Sezione contatti completa
- [ ] Email cliccabile (mailto:)
- [ ] Copyright dinamico
- [ ] Policy links (Privacy, Cookies)
- [ ] Border-top su copyright bar
- [ ] Colori PoliMi corretti
- [ ] Margini corretti
- [ ] Responsive stack mobile

---

## 🚀 PROSSIMI STEP

1. **Implementa Header e Footer** con le specifiche qui sopra
2. **Sostituisci logo placeholder** con logo ufficiale PoliMi quando disponibile
3. **Testa responsive** su tutti i breakpoints
4. **Verifica accessibilità** con Lighthouse
5. **Personalizza contenuti** (link, indirizzo, email reali)

---

**NOTA IMPORTANTE:**  
Questo prompt include le best practices dalle Digital Brand Guidelines PoliMi.  
Per implementazioni specifiche delle varianti A e B menzionate, fornire ulteriori dettagli dal manuale.

---

**Versione:** 2.0 - Header & Footer Focus  
**Data:** Gennaio 2025  
**Per:** Organ-on-Chip Lab, DEIB, Politecnico di Milano
