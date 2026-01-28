# 📢 AGGIORNAMENTO: Header e Footer

## Cosa è cambiato

Ho creato **2 nuovi file** per gestire specificamente header e footer secondo le tue indicazioni:

---

## 📦 NUOVI FILE

### 1. **CURSOR_PROMPT_v2_HEADER_FOOTER.md** ⭐ NUOVO!

**Cosa contiene:**
- Specifiche dettagliate per Header (variante A)
- Specifiche dettagliate per Footer (variante B)
- Codice di esempio già pronto
- Layout anatomy completo
- Checklist implementazione

**Come usarlo:**
Questo è un prompt ALTERNATIVO al CURSOR_PROMPT.md originale.
Puoi usare questo se vuoi focus specifico su header/footer.

---

### 2. **GUIDA_CURSOR_HEADER_FOOTER.md** ⭐ NUOVO!

**Cosa contiene:**
- Prompt pronti da copiare in Cursor
- Frasi utili per comunicare con l'AI
- Troubleshooting comuni
- Test checklist
- Workflow passo-passo

**Come usarlo:**
Guida pratica su COME parlare con Cursor per ottenere esattamente 
quello che vuoi per header e footer.

---

## 🚦 COME PROCEDERE

### Opzione A: Tutto da Zero con Focus Header/Footer

```bash
# 1. Setup progetto
mkdir organ-on-chip-polimi
cd organ-on-chip-polimi
cursor .

# 2. In Cursor Composer
# Copia il contenuto di: CURSOR_PROMPT_v2_HEADER_FOOTER.md

# 3. Aspetta generazione

# 4. Fine! Header e Footer sono già ottimizzati
```

---

### Opzione B: Aggiungi Header/Footer a Progetto Esistente

Se hai già generato il progetto con il prompt originale:

```bash
# 1. Apri il progetto in Cursor
cursor .

# 2. Chiedi a Cursor (nel Composer):
"Leggi il file CURSOR_PROMPT_v2_HEADER_FOOTER.md e 
implementa l'Header e Footer esattamente come specificato"

# 3. Cursor leggerà le specifiche e aggiornerà i componenti
```

---

### Opzione C: Usa la Guida Interattiva

```bash
# 1. Apri GUIDA_CURSOR_HEADER_FOOTER.md

# 2. Copia i "Prompt Essenziali" nel Cursor Composer

# 3. Se vuoi personalizzare, usa i "Prompt Dettagliati"

# 4. Per problemi, consulta "Troubleshooting"
```

---

## 📋 NOTA IMPORTANTE: Varianti A e B

Nel documento hai menzionato:
- **Header: Variante A** (pagina 39)
- **Footer: Variante B** (pagina 40)

**Ho incluso le best practices dalle Digital Brand Guidelines** che ho estratto.

**TUTTAVIA**, se hai specifiche visuali precise dalle pagine 39-40 
del manuale (es. layout esatti, posizionamenti specifici), 
puoi integrarle dicendo a Cursor:

```
"Modifica l'header seguendo questo layout specifico:
[descrivi o mostra screenshot della variante A]"
```

---

## 🎯 COSA HO IMPLEMENTATO

Basandomi sulle Digital Brand Guidelines PoliMi, ho specificato:

### HEADER
✅ Background Blue Heritage (#102C53)
✅ Height 80px, sticky con backdrop-blur
✅ Logo PoliMi + Nome Lab + Sotto-dicitura DEIB
✅ Menu desktop orizzontale + mobile hamburger
✅ Font Manrope, margini 78px desktop
✅ Area di rispetto logo (2x cap-height)
✅ Colori accenti Bright Blue per hover

### FOOTER
✅ Background Blue Heritage
✅ Grid 3 colonne responsive (3 → 2 → 1)
✅ Colonna 1: Logo + Info Lab
✅ Colonna 2: Quick Links
✅ Colonna 3: Contatti
✅ Copyright bar separata con policy links
✅ Font Manrope, margini 78px desktop

---

## 🔄 SE VUOI MODIFICHE SPECIFICHE

Usa la **GUIDA_CURSOR_HEADER_FOOTER.md** che contiene frasi pronte:

**Esempio - Modificare altezza header:**
```
"Il header sembra troppo alto. Riduci l'altezza a 64px"
```

**Esempio - Cambiare layout footer:**
```
"Nel footer, metti i contatti nella colonna di sinistra 
invece che a destra"
```

**Esempio - Aggiungere logo specifico:**
```
"Sostituisci il placeholder logo con /public/logo-polimi.svg
usando Next.js Image component"
```

---

## 📱 PROSSIMI PASSI

1. **Scegli l'opzione** (A, B, o C) che preferisci
2. **Genera/Aggiorna** header e footer con Cursor
3. **Sostituisci logo** placeholder con logo PoliMi ufficiale
4. **Testa responsive** su mobile/tablet/desktop
5. **Verifica accessibilità** con Lighthouse

---

## 🤔 HAI BISOGNO DI AIUTO?

### Se le varianti A e B hanno layout specifici diversi da quello che ho implementato:

**Opzione 1:** Descrivi il layout preciso che vuoi
```
"Il footer variante B deve avere 4 colonne invece di 3,
e la prima colonna deve contenere..."
```

**Opzione 2:** Mostra screenshot o PDF
```
"Ecco come deve essere il layout del footer [allega immagine].
Implementa esattamente questo design"
```

**Opzione 3:** Fammi sapere i dettagli specifici
Se hai il PDF aperto, dimmi esattamente cosa c'è nelle 
pagine 39-40 e posso creare un prompt ancora più preciso.

---

## 📚 TUTTI I FILE DISPONIBILI

```
NUOVI FILE (per header/footer):
├─ CURSOR_PROMPT_v2_HEADER_FOOTER.md
└─ GUIDA_CURSOR_HEADER_FOOTER.md

FILE ORIGINALI:
├─ 00-START-HERE.md
├─ CURSOR_PROMPT.md
├─ README.md
├─ VISUAL-GUIDE.md
├─ vincoli_brand_polimi.md
├─ tailwind.config.ts
├─ package.json
├─ GridBackground.tsx
├─ Navbar.tsx
├─ HomePage-example.tsx
├─ data-team.json
└─ data-publications.json
```

---

**🎉 Ora hai tutto per creare header e footer perfetti!**

Scegli l'approccio che preferisci e inizia a costruire.

**Versione:** 2.0 - Header & Footer Update
**Data:** Gennaio 2025
