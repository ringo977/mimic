# 🎯 COME DIRE A CURSOR: Header e Footer PoliMi

## Quick Reference per comunicare con Cursor AI

---

## 📝 PROMPT ESSENZIALE (Copia e Incolla in Cursor)

```
Crea un Header e Footer professionali per il sito Next.js seguendo le Digital Brand Guidelines del Politecnico di Milano.

HEADER:
- Background: Blue Heritage (#102C53)
- Height: 80px
- Sticky con backdrop-blur quando si scrolla
- Logo PoliMi (placeholder) + Nome lab "Organ-on-Chip Laboratory"
- Sotto-dicitura: "DEIB · Politecnico di Milano" in Bright Blue (#4DC9FF)
- Menu desktop orizzontale: Home | Team | Research | Publications | Collaborations | News | Join Us | Contact
- Menu mobile: Hamburger che apre overlay full-screen
- Font: Manrope (importa da Google Fonts)
- Margini laterali: 78px desktop, 24px mobile
- Area di rispetto logo: 2x cap-height

FOOTER:
- Background: Blue Heritage (#102C53)
- Grid 3 colonne responsive (3 → 2 → 1)
- Colonna 1: Logo PoliMi + nome lab + tagline breve
- Colonna 2: Quick Links (Home, Research, Team, Publications, Contact)
- Colonna 3: Contatti (Via Golgi 39, 20133 Milano, email)
- Copyright bar in fondo: "© 2025 Politecnico di Milano | Privacy | Cookies"
- Font: Manrope
- Margini laterali: 78px desktop, 24px mobile

COLORI:
- Blue Heritage: #102C53 (background header/footer)
- Bright Blue: #4DC9FF (accenti, hover, sotto-dicitura)
- White: #FFFFFF (testi)

Usa Tailwind CSS per lo styling.
Implementa piena accessibilità (ARIA labels, keyboard navigation).
Responsive perfetto.
```

---

## 🎨 SE VUOI PIÙ CONTROLLO SUL DESIGN

### Prompt Dettagliato per Header

```
Crea il componente Header.tsx in /components con queste specifiche precise:

STRUTTURA:
- Tag <header> con position fixed, top-0, z-50
- Background: bg-polimi-blue-heritage con transizione a backdrop-blur quando scrolled
- Container max-w-screen-2xl centrato con px-6 lg:px-78
- Height: h-20 (80px)
- Flex layout: justify-between items-center

LOGO AREA (sinistra):
- Link href="/"
- Flex con space-x-4
- Logo placeholder: div circolare w-12 h-12, bg-white, con "POLIMI" centrato
- Testo sopra: "Organ-on-Chip Lab", font-serif font-semibold text-lg text-white
- Testo sotto: "DEIB · Politecnico di Milano", text-xs font-light text-polimi-bright-blue

MENU DESKTOP (destra):
- hidden lg:flex
- space-x-1
- Ogni link: px-4 py-2 text-sm font-medium text-white
- Hover: hover:text-polimi-bright-blue hover:bg-white/10 rounded-md
- Menu items: Home, Team, Research, Publications, Collaborations, News, Join Us, Contact

MENU MOBILE:
- button lg:hidden con icona Menu (da lucide-react)
- Al click apre/chiude stato mobileMenuOpen
- Overlay full-screen con bg-polimi-blue-heritage
- Links in colonna verticale

SCROLL BEHAVIOR:
- useState per tracciare scroll position
- useEffect con window.addEventListener('scroll')
- Quando scrolled > 20px: aggiungi backdrop-blur-md e bg-opacity-95

Usa TypeScript, 'use client', Next.js 14 conventions.
```

### Prompt Dettagliato per Footer

```
Crea il componente Footer.tsx in /components:

STRUTTURA:
- Tag <footer> con role="contentinfo"
- Background: bg-polimi-blue-heritage text-white
- Container max-w-screen-2xl centrato con px-6 lg:px-78
- Padding: pt-16 pb-8

GRID PRINCIPALE:
- grid md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12
- 3 colonne che diventano 2 su tablet e 1 su mobile

COLONNA 1 - Lab Info:
- Logo placeholder (div w-10 h-10 bg-white rounded-full mb-4)
- H3: "Organ-on-Chip Laboratory", font-semibold text-base
- P: Tagline breve 2-3 righe, text-sm text-white/80

COLONNA 2 - Quick Links:
- H4: "Quick Links", text-sm font-semibold text-polimi-bright-blue mb-4
- UL con space-y-2
- Link items: text-sm text-white/90 hover:text-polimi-bright-blue
- Links: Home, Research, Team, Publications, Contact

COLONNA 3 - Contatti:
- H4: "Contatti", text-sm font-semibold text-polimi-bright-blue mb-4
- Address tag (not-italic) text-sm text-white/90
- Via Golgi 39, 20133 Milano
- Email cliccabile: <a href="mailto:lab@deib.polimi.it">

COPYRIGHT BAR:
- Border-top border-white/10 pt-6
- Flex: justify-between items-center
- Sinistra: "© {currentYear} Politecnico di Milano"
- Destra: Links "Privacy Policy | Cookie Policy"
- Text: text-xs text-white/70

Usa TypeScript, semantic HTML, accessibilità completa.
```

---

## 💬 FRASI UTILI PER CURSOR

### Durante lo Sviluppo

**Se il design non ti piace:**
```
"Il header sembra troppo alto. Riduci l'altezza a 64px e rendi il logo più piccolo (40px invece di 48px)"
```

**Se vuoi modificare i colori hover:**
```
"Cambia il colore hover dei link del menu da bright-blue a alpha-blue (#2CB7FF) con una transizione più smooth (300ms)"
```

**Per aggiungere animazioni:**
```
"Aggiungi un'animazione slide-down al header quando la pagina carica, usando Framer Motion"
```

**Per il menu mobile:**
```
"Il menu mobile deve aprirsi da destra con animazione slide, non da sopra. Usa Framer Motion per l'animazione"
```

**Per migliorare responsive:**
```
"Su tablet (768px-1024px) il footer deve avere 2 colonne: Lab Info + Quick Links nella prima riga, Contatti full-width sotto"
```

### Per Fix e Debugging

**Se il logo non si vede bene:**
```
"Il placeholder logo non ha abbastanza contrasto. Aggiungi un bordo sottile polimi-bright-blue e aumenta il font size a text-base"
```

**Se lo scroll behavior non funziona:**
```
"Lo scroll listener non aggiorna lo stato. Aggiungi cleanup nel useEffect e verifica che scrolled sia correttamente passato alle classi"
```

**Per problemi di spacing:**
```
"I margini laterali su mobile sono troppo stretti. Usa px-6 invece di px-4, e aumenta lo spacing verticale tra le sezioni del footer"
```

---

## 🎨 PERSONALIZZAZIONI COMUNI

### Cambiare il Logo Placeholder

```
"Sostituisci il div placeholder logo con un Next.js Image component.
Il logo sarà in /public/logo-polimi.svg
Dimensioni: width={48} height={48}
Alt text: Logo Politecnico di Milano"
```

### Aggiungere Social Icons nel Footer

```
"Nella colonna Contatti del footer, aggiungi una riga di social icons sotto l'email:
- LinkedIn, Twitter, YouTube
- Usa icone da lucide-react
- Dimensione: w-5 h-5
- Colore: text-white/80, hover: text-polimi-bright-blue
- Flex con space-x-4"
```

### Modificare i Menu Items

```
"Rimuovi 'Collaborations' dal menu e aggiungi 'Blog' dopo 'News'.
Il link Blog deve puntare a /blog"
```

### Sticky Sidebar nel Layout

```
"Il header deve rimanere sopra tutto. Verifica che abbia z-50.
Se c'è una sidebar, deve avere z-40 per stare sotto il header"
```

---

## 🔧 TROUBLESHOOTING

### Problema: "Il header copre il contenuto"

**Soluzione:**
```
"Il contenuto della pagina viene coperto dal header sticky.
Aggiungi pt-20 (padding-top: 80px) al <main> element nel layout.tsx
per compensare l'altezza del header fisso"
```

### Problema: "I colori non corrispondono"

**Soluzione:**
```
"I colori non corrispondono al brand PoliMi.
Verifica che stai usando:
- bg-polimi-blue-heritage (non bg-blue-900)
- text-polimi-bright-blue (non text-sky-400)
Controlla che tailwind.config.ts abbia i colori custom definiti"
```

### Problema: "Il menu mobile non si chiude"

**Soluzione:**
```
"Il menu mobile rimane aperto quando clicco su un link.
Aggiungi onClick={() => setMobileMenuOpen(false)} su ogni Link
del menu mobile"
```

### Problema: "Il footer è troppo alto su mobile"

**Soluzione:**
```
"Il footer occupa troppo spazio su mobile.
Riduci:
- pt-16 → pt-12
- gap-12 → gap-8
- mb-12 → mb-8
Solo sui breakpoint mobile (< md)"
```

---

## 📱 TEST CHECKLIST

Dopo che Cursor ha generato header e footer, verifica:

```
HEADER:
☐ Logo visibile e centrato verticalmente
☐ Nome lab leggibile su tutti i device
☐ Menu desktop funziona (tutti i link)
☐ Menu mobile si apre/chiude correttamente
☐ Sticky scroll funziona con effetto blur
☐ Hover states sui link sono visibili
☐ Colori corrispondono al brand PoliMi
☐ Margini 78px desktop, 24px mobile

FOOTER:
☐ 3 colonne su desktop, responsive su mobile
☐ Logo placeholder presente
☐ Quick links tutti funzionanti
☐ Email cliccabile (apre client email)
☐ Copyright mostra anno corrente
☐ Privacy/Cookie links presenti
☐ Colori corretti (Blue Heritage background)
☐ Spaziatura corretta tra sezioni

GENERALE:
☐ Nessun content viene coperto dall'header
☐ Scrolling smooth senza jump
☐ Accessibilità: tab navigation funziona
☐ Responsive: test su mobile reale
☐ Performance: no layout shift
```

---

## 🚀 WORKFLOW CONSIGLIATO

1. **Setup Iniziale:**
   ```
   "Genera il progetto base Next.js con le dipendenze nel package.json fornito"
   ```

2. **Header Prima:**
   ```
   "Crea prima il componente Header.tsx seguendo le specifiche nel prompt"
   ```

3. **Test Header:**
   - Verifica visivamente
   - Testa menu mobile
   - Controlla scroll behavior

4. **Footer Dopo:**
   ```
   "Ora crea il componente Footer.tsx con la struttura a 3 colonne"
   ```

5. **Integrazione Layout:**
   ```
   "Integra Header e Footer nel layout.tsx principale, 
   aggiungendo padding-top al main per compensare header sticky"
   ```

6. **Refinement:**
   ```
   "Ottimizza il responsive, verifica i margini, e aggiungi 
   animazioni smooth alle transizioni"
   ```

7. **Final Polish:**
   ```
   "Verifica accessibilità, aggiungi ARIA labels mancanti, 
   e ottimizza performance"
   ```

---

## 💡 BEST PRACTICES

### DO ✅

- **Usa i colori dalla palette PoliMi** (mai colori custom)
- **Testa su device reali** (non solo browser responsive mode)
- **Verifica accessibilità** (keyboard navigation, screen readers)
- **Mantieni coerenza** (stesso spacing ovunque)
- **Commenta il codice** (Cursor genera meglio con context)

### DON'T ❌

- **Non modificare i colori PoliMi** (sono vincolanti!)
- **Non usare font diverse** (solo Manrope e Frank Ruhl Libre)
- **Non ignorare i margini** (78px desktop è obbligatorio)
- **Non dimenticare mobile** (mobile-first sempre)
- **Non skippare l'accessibilità** (è parte del brand PoliMi)

---

## 📚 RIFERIMENTI RAPIDI

### Colori PoliMi
```
Blue Heritage: #102C53 (header/footer background)
Bright Blue:   #4DC9FF (accenti, hover, sotto-diciture)
Alpha Blue:    #2CB7FF (hover secondario)
White:         #FFFFFF (testi principali)
Gray:          #E0DCDC (bordi sottili)
```

### Font PoliMi
```
Manrope:           Sans-serif, per UI e corpo testo
Frank Ruhl Libre:  Serif, per titoli (opzionale in header/footer)
```

### Spacing PoliMi
```
Margini laterali: 78px desktop, 24px mobile
Sistema base:     8px (8, 16, 24, 32, 48, 64)
```

---

**🎯 Ora sei pronto per comunicare efficacemente con Cursor!**

Usa i prompt qui sopra come template e personalizzali per le tue esigenze specifiche.

**Versione:** 1.0  
**Per:** Organ-on-Chip Lab, DEIB, Politecnico di Milano
