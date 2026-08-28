# Manuale completo — Sito web MiMic Lab

> Manuale operativo e tecnico completo del sito `mimic.polimi.it`.
> Copre: architettura, come funziona ogni sezione, come aggiornarlo, come pubblicarlo, il Lab Manager, e i potenziali miglioramenti / criticità.
>
> Ultimo aggiornamento: giugno 2026.
> Documenti collegati: [`SITE_UPDATE_GUIDE.md`](SITE_UPDATE_GUIDE.md) (riferimento rapido contenuti) · [`DEPLOY_FTPS.md`](DEPLOY_FTPS.md) (dettaglio deploy FTPS).

---

## Indice

1. [Cos'è questo sito (in breve)](#1-cosè-questo-sito-in-breve)
2. [Architettura e stack tecnologico](#2-architettura-e-stack-tecnologico)
3. [Struttura delle cartelle](#3-struttura-delle-cartelle)
4. [Come funziona il sito (flusso dei dati)](#4-come-funziona-il-sito-flusso-dei-dati)
5. [Le sezioni pubbliche, una per una](#5-le-sezioni-pubbliche-una-per-una)
6. [I file di dati (il "CMS" del sito)](#6-i-file-di-dati-il-cms-del-sito)
7. [Immagini: regole, dimensioni, limiti](#7-immagini-regole-dimensioni-limiti)
8. [Il sistema basePath (perché esistono 2 build)](#8-il-sistema-basepath-perché-esistono-2-build)
9. [Il Lab Manager (`/lab`) e Supabase](#9-il-lab-manager-lab-e-supabase)
10. [Mantenere Supabase attivo (keep-alive)](#10-mantenere-supabase-attivo-keep-alive)
11. [I tre canali di pubblicazione](#11-i-tre-canali-di-pubblicazione)
12. [Workflow completo di aggiornamento](#12-workflow-completo-di-aggiornamento)
13. [Credenziali e file segreti](#13-credenziali-e-file-segreti)
14. [Troubleshooting](#14-troubleshooting)
15. [Criticità attuali (da tenere d'occhio)](#15-criticità-attuali-da-tenere-docchio)
16. [Potenziali miglioramenti](#16-potenziali-miglioramenti)
17. [Glossario](#17-glossario)

---

## 1. Cos'è questo sito (in breve)

Il sito del **MiMic Lab** (Politecnico di Milano, Dipartimento DEIB) è un **sito statico** che presenta team, ricerca, pubblicazioni, news, grant e collaborazioni del laboratorio. Include inoltre un'app interna riservata, il **Lab Manager** (`/lab`), per la gestione di strumenti, reagenti, storage criogenico, prenotazioni, ecc.

Due nature ben distinte convivono nello stesso progetto:

| | Sito pubblico | Lab Manager (`/lab`) |
|---|---|---|
| Tipo | Pagine statiche (HTML pre-generato) | App React lato client (SPA) |
| Dati | File JSON in `data/` | Database Supabase (cloud) |
| Aggiornamento | Modifichi JSON → ricompili → pubblichi | Si modifica a runtime dal browser |
| Accesso | Pubblico | Login + 2FA, solo membri autorizzati |

**Concetto chiave:** il sito pubblico **non ha un backend**. Tutto il contenuto vive in file JSON dentro `data/`. Per cambiare un testo o aggiungere una pubblicazione si modifica un file JSON, si ricompila e si ricarica online. Non c'è un pannello "wordpress-style" per il sito pubblico (il pannello esiste solo per il Lab Manager, che però è una cosa separata).

---

## 2. Architettura e stack tecnologico

- **Framework:** Next.js 14 (App Router) con **export statico** (`output: 'export'` in `next.config.js`). Il build produce solo HTML/CSS/JS statici nella cartella `out/`: nessun server Node gira in produzione.
- **Styling:** Tailwind CSS + identità visiva PoliMi (variabili CSS in `app/globals.css`, colori in `tailwind.config.ts`).
- **Font:** Manrope (testo) + Frank Ruhl Libre (titoli), caricati via `next/font/google`.
- **Animazioni:** Framer Motion.
- **Icone:** Lucide React.
- **Mappa:** Leaflet + react-leaflet (pagina Network).
- **Backend del Lab Manager:** Supabase (autenticazione, database PostgreSQL, storage file).
- **Linguaggio:** TypeScript.

### Versioni principali (da `package.json`)

| Pacchetto | Ruolo |
|---|---|
| `next` | Framework |
| `react`, `react-dom` | UI |
| `@supabase/supabase-js` | Client Supabase (solo lab) |
| `framer-motion` | Animazioni |
| `lucide-react` | Icone |
| `leaflet`, `react-leaflet`, `@types/leaflet` | Mappa Network |
| `jszip` | Export/backup (lab) |
| `tailwindcss`, `postcss`, `autoprefixer` | Stile |
| `gh-pages` | Deploy su GitHub Pages |

---

## 3. Struttura delle cartelle

```
mimic/
├── app/                       # Pagine (Next.js App Router)
│   ├── layout.tsx             # Layout radice: navbar, footer, font, metadata
│   ├── page.tsx               # Homepage
│   ├── globals.css            # Stili globali + variabili colore PoliMi
│   ├── icon.svg               # Favicon
│   ├── team/page.tsx
│   ├── research/page.tsx
│   ├── research/[slug]/page.tsx   # Pagina dinamica: una per ogni topic di ricerca
│   ├── publications/page.tsx
│   ├── grants/page.tsx
│   ├── news/page.tsx
│   ├── network/page.tsx
│   ├── technology-facilities/page.tsx
│   ├── contact/page.tsx
│   ├── join/page.tsx
│   ├── privacy/page.tsx
│   ├── cookie-policy/page.tsx
│   └── lab/                   # Lab Manager
│       ├── page.tsx
│       ├── layout.tsx
│       └── reset-password/page.tsx
│
├── data/                      # TUTTO IL CONTENUTO del sito pubblico
│   ├── team.json              # PI + membri + alumni
│   ├── publications.json      # Pubblicazioni
│   ├── news.json              # News
│   ├── grants.json            # Grant correnti + passati
│   ├── network.json           # Progetti, società, spinoff, collaboratori (mappa)
│   ├── research.json          # Topic di ricerca + keyword
│   ├── collaborations.json    # LEGACY (non usato dal codice)
│   └── lab-data.ts            # Tipi, ruoli, dati mock e utilità del Lab Manager
│
├── components/                # Componenti React
│   ├── Navbar.tsx, Footer.tsx, Hero.tsx, GridBackground.tsx, ScrollToTop.tsx
│   ├── TeamCard.tsx, PICard.tsx, PublicationCard.tsx, NewsCard.tsx, ResearchCard.tsx
│   ├── NetworkMap.tsx         # Mappa Leaflet
│   ├── CiteButton.tsx         # Genera citazioni (APA/IEEE/BibTeX/RIS)
│   ├── ContactForm.tsx, FacilityGallery.tsx, FooterLinks.tsx, CookieConsent.tsx
│   ├── ui/Button.tsx, ui/Card.tsx
│   └── lab/                   # Componenti del Lab Manager
│       ├── LabApp.tsx         # Shell principale (login, MFA, navigazione)
│       ├── LabContext.tsx     # Context React + sync con Supabase
│       └── *Page.tsx          # Dashboard, Instruments, Reagents, Cryo, Wishlist, Manuals, Log, Admin
│
├── lib/                       # Utilità
│   ├── site-base-path.ts      # Espone il basePath in base all'ambiente
│   ├── citations.ts           # Tipi pubblicazione + formattatori citazioni
│   ├── supabase.ts            # Client Supabase (URL + anon key)
│   ├── supabase-users.ts      # CRUD utenti lab
│   ├── supabase-data.ts       # CRUD dati lab (strumenti, reagenti, ...)
│   ├── supabase-storage.ts    # Upload/download file (manuali, ecc.)
│   ├── lab-auth.ts            # Helper di autenticazione/sessione
│   └── backup.ts              # Backup/restore del database lab
│
├── public/images/             # Asset statici
│   ├── team/  news/  partners/  research/  technology/  home/  logos/
│
├── scripts/
│   ├── deploy-polimi-ftp.sh   # Deploy FTPS → mimic.polimi.it (PRIMARIO)
│   ├── sync-gitlab.sh         # Sync verso il monorepo GitLab
│   ├── supabase-rls-policies.sql        # Policy di sicurezza (RLS) del database lab
│   ├── supabase-booking-settings.sql    # Migrazione app_settings + mezz'ore
│   ├── supabase-security-hardening.sql  # Hardening: is_lab_member, anti-escalation, no-overlap
│   ├── supabase-reagent-stock-rpc.sql   # RPC atomica per lo stock reagenti (no lost update)
│   ├── supabase-schema-reference.sql    # Schema completo delle tabelle (disaster recovery)
│   ├── supabase-user-profile-fields.sql # Campi profilo utente: status/alumni, codice persona, supervisor, training
│   └── supabase-absences.sql            # Tabella absences + RLS + trigger anti self-approval + soglie policy
│
├── .github/workflows/
│   └── keep-supabase-alive.yml  # Ping giornaliero per non far andare Supabase in pausa
│
├── next.config.js             # Export statico + logica basePath + trailingSlash
├── tailwind.config.ts         # Colori e font PoliMi
├── package.json               # Script npm
├── deploy.polimi.env(.example) # Credenziali FTP (segreto)
├── deploy.gitlab.env(.example) # Token GitLab (segreto)
└── out/                       # Output del build (generato, non versionato)
```

---

## 4. Come funziona il sito (flusso dei dati)

Le pagine **importano direttamente** i file JSON da `data/` in fase di build. Quando lanci il build, Next.js legge i JSON e "cuoce" il contenuto dentro l'HTML finale. In produzione non ci sono query né API: tutto è già scritto nelle pagine.

| Pagina | Fonte dati |
|---|---|
| `/` (Homepage) | `publications`, `grants`, `team`, `network`, `research`, `news` |
| `/team` | `team.json` |
| `/publications` | `publications.json` + `team.json` (per evidenziare gli autori del lab) |
| `/research` | `research.json` |
| `/research/[slug]` | `research.json` + `publications.json` (filtrate per `pubKeywords`) |
| `/news` | `news.json` |
| `/grants` | `grants.json` |
| `/network` | `network.json` |
| `/lab` | `lab-data.ts` (tipi/mock) + **Supabase a runtime** |

### Relazioni tra i dati

- **Pubblicazioni ↔ Team:** il cognome degli autori viene confrontato con i nomi del team per evidenziare i membri del lab nella pagina pubblicazioni.
- **Pubblicazioni ↔ Research:** ogni topic di ricerca ha dei `pubKeywords` (es. `["cardiac","heart"]`) che filtrano le pubblicazioni mostrate in `/research/[slug]`.
- **Grant ↔ Network:** gli acronimi dei progetti (PHOENIX, ecc.) compaiono sia in `grants.json` sia in `network.json`.
- **News:** cita progetti e persone solo come testo libero (nessuna chiave di collegamento).

> Conseguenza pratica: se rinomini una persona o cambi il modo in cui un autore è scritto nelle pubblicazioni, l'evidenziazione automatica potrebbe smettere di funzionare. Mantieni i nomi coerenti.

---

## 5. Le sezioni pubbliche, una per una

Conteggi aggiornati a giugno 2026 tra parentesi.

### Homepage (`/`)
Hero con statistiche (contatori auto-calcolati dai dati), panoramica della ricerca, ultime 3 news, loghi partner. I contatori in hero sono **arrotondati per difetto al multiplo di 5** (es. 104 pubblicazioni → "100+").

### Team (`/team`) — (2 PI + 20 membri)
Tre gruppi: `pis`, `members`, `alumni`. Ogni persona è una card con foto, ruolo, bio breve e un "Read more" con bio estesa, email, link Scopus/ORCID. Ordina per anzianità/ruolo.

### Research (`/research`) — (12 topic + 20 keyword)
Elenco dei topic di ricerca come card. Ogni topic ha uno **slug** e genera una pagina dedicata `/research/<slug>` (es. `cardiac-tissue`, `gut-microbiome`, `tumour-models`, `multi-organ`...). La pagina di dettaglio mostra le sezioni del topic e le pubblicazioni correlate (filtrate per parole chiave).

### Publications (`/publications`) — (104 pubblicazioni)
Lista filtrabile (per anno/tipo). Ogni voce ha un pulsante **"Cite"** che genera al volo la citazione in APA, IEEE, BibTeX e RIS a partire dai campi del JSON. Gli autori del lab vengono evidenziati.

### Grants (`/grants`) — (5 correnti + 21 passati)
Due liste: `current` e `past`. Mostra acronimo, titolo, programma di finanziamento, ruolo, periodo, eventuale link al sito/CORDIS, abstract.

### News (`/news`) — (28 voci)
Lista cronologica filtrabile per tag (`News`, `Publication`, `Award`, `Conference`, `Event`, `Outreach`). Ogni voce può avere immagine di copertina e una **gallery** con didascalie. La homepage pesca le 3 più recenti.

### Network (`/network`) — (4 progetti, 2 società, 1 spinoff, 19 collaboratori)
Progetti finanziati, società scientifiche, spinoff (BiomimX) e una **mappa Leaflet** con i collaboratori geolocalizzati (lat/lng).

### Technology & Facilities (`/technology-facilities`)
Galleria delle attrezzature/strutture del laboratorio.

### Contact (`/contact`)
Form di contatto + info + mappa.

### Join Us (`/join`)
Opportunità (PhD, postdoc, tesi) e processo di candidatura.

### Privacy (`/privacy`) e Cookie Policy (`/cookie-policy`)
Pagine legali, collegate al banner cookie (`CookieConsent`).

### Lab Manager (`/lab`)
App riservata — vedi [sezione 9](#9-il-lab-manager-lab-e-supabase).

---

## 6. I file di dati (il "CMS" del sito)

| File | Chiavi principali | Cosa contiene |
|---|---|---|
| `data/publications.json` | `publications` | `id`, `authors[]`, `title`, `journal`, `year`, `volume`, `pages`, `doi`, `type` |
| `data/news.json` | `news` | `id`, `date`, `title`, `excerpt`, `tag`, `image`, `gallery[]`, `captions[]`, `link` |
| `data/team.json` | `pis`, `members`, `alumni` | `name`, `role`, `email`, `bio`, `bioFull`, `image`, `scopusId`, `orcid` |
| `data/grants.json` | `current`, `past` | `id`, `acronym`, `title`, `program`, `call`, `role`, `period`, `website`, `cordisUrl`, `abstract` |
| `data/network.json` | `projects`, `societies`, `spinoff`, `collaborators` | progetti, società, spinoff, pin mappa (lat/lng) |
| `data/research.json` | `projects`, `keywords` | `slug`, `title`, `description`, `tags[]`, `sections[]`, `pubKeywords[]` |
| `data/collaborations.json` | `academic`, `research`, `industry` | **LEGACY — non usato dalle pagine** (vedi criticità) |
| `data/lab-data.ts` | export TS | tipi, ruoli/permessi, dati mock del Lab Manager |

### Regole d'oro per modificare i dati

- **Pubblicazioni e News:** aggiungi in **cima** all'array (più recenti per primi). Usa il prossimo `id` intero libero.
- **Autori:** formato `"Cognome, Iniziali."` (es. `"Rasponi, M."`), **non** `"Marco Rasponi"`.
- **Date news:** formato `"YYYY-MM-DD"`.
- **Gallery + captions:** devono avere la **stessa lunghezza**.
- **DOI:** senza il prefisso `https://doi.org/`.
- **Valida sempre il JSON** dopo ogni modifica:
  ```bash
  node -e "JSON.parse(require('fs').readFileSync('data/FILE.json','utf8')); console.log('OK')"
  ```

> L'errore numero 1 che rompe il build è una **virgola di troppo o mancante** nel JSON. Valida sempre prima di pubblicare.

Per i dettagli campo-per-campo con esempi completi, vedi [`SITE_UPDATE_GUIDE.md`](SITE_UPDATE_GUIDE.md) sezioni 5–10.

---

## 7. Immagini: regole, dimensioni, limiti

| Tipo | Cartella | Dimensione max | Formato |
|---|---|---|---|
| Foto team | `public/images/team/` | ~800×800px, <200KB | `.jpg` |
| News | `public/images/news/` | ~1200px lato lungo, <300KB | `.jpg` |
| Loghi partner | `public/images/partners/` | ~400px | `.png`/`.jpg` |
| Research | `public/images/research/` | ~1200px, <300KB | `.jpg`/`.png` |

**Naming:** minuscolo con trattini (`marco-rasponi.jpg`, non `Marco Rasponi.jpg`). Gallery: `evento-1.jpg`, `evento-2.jpg`, ...

**Ottimizzazione (macOS):**
```bash
sips -Z 1200 public/images/news/foto.jpg   # ridimensiona a max 1200px
sips -Z 800  public/images/team/nome.jpg    # ridimensiona a max 800px
```

### ⚠️ Limite critico: 100 MB su GitLab Pages
L'output del build (`out/`) **deve restare sotto i 100 MB**, altrimenti GitLab Pages rifiuta l'artefatto.

> **STATO ATTUALE: `out/` ≈ 101 MB → siamo al limite / appena oltre.** Vedi [Criticità](#15-criticità-attuali-da-tenere-docchio). Va alleggerito ottimizzando le immagini più pesanti.

Per controllare:
```bash
npm run build && du -sh out/
find public/images -size +500k -exec ls -lhS {} +   # trova le immagini grandi
```

Le foto originali ad alta risoluzione e i documenti interni (programmi congressi ecc.) vanno in `assets-originals/` nella root del progetto, **mai** in `public/`: tutto ciò che sta in `public/` finisce nella build e viene pubblicato sul server. La cartella `assets-originals/` è esclusa da git e dal sync GitLab, e resta solo sul Mac locale.

---

## 8. Il sistema basePath (perché esistono 2 build)

Lo stesso codice viene pubblicato a URL diversi. Cambia solo il **basePath** (il prefisso nell'URL).

| Destinazione | basePath | Come si compila |
|---|---|---|
| Polimi FTPS (`mimic.polimi.it`) | *(vuoto)* | `npm run build:polimi` |
| GitLab Pages (mirror) | *(vuoto)* | la CI GitLab usa `BASE_PATH=` |
| GitHub Pages | `/mimic` | `npm run build` (default in produzione) |
| Sviluppo locale | *(vuoto)* | `npm run dev` |

Logica in `next.config.js`:
- default produzione = `/mimic`;
- override con la variabile d'ambiente `BASE_PATH` (es. `BASE_PATH=` per vuoto);
- `NEXT_PUBLIC_BASE_PATH` viene derivato e usato da `lib/site-base-path.ts`.

Tutti i riferimenti a immagini/asset nei componenti usano `siteBasePath` per anteporre il prefisso giusto.

> **Errore tipico:** pubblicare su `mimic.polimi.it` un build fatto con `npm run build` (basePath `/mimic`). Risultato: il sito cerca asset in `/mimic/_next/...` che non esistono → pagina senza stili/immagini. Per Polimi **devi** usare `build:polimi`.

### `trailingSlash: true`
In `next.config.js` è impostato `trailingSlash: true`. Serve perché su Apache `/lab/` venga servito correttamente da `out/lab/index.html`. Senza questa opzione, l'export crea `lab.html` invece di `lab/index.html` e `/lab/` dà errore 403. **Non rimuoverlo.**

---

## 9. Il Lab Manager (`/lab`) e Supabase

App interna di gestione laboratorio, completamente separata dal sito pubblico. Non influenza i contenuti pubblici.

- **Frontend:** `components/lab/LabApp.tsx` (client-only, `ssr: false`). Context e sync in `LabContext.tsx`.
- **Backend:** Supabase — progetto **`mimic-lab`**, URL `https://vfruyyrpriymhmelgidr.supabase.co` (AWS eu-west-1). Client in `lib/supabase.ts`.
- **Tipi e dati mock:** `data/lab-data.ts`.

### Funzionalità (pagine nel menu)
Dashboard (con **calendario settimanale**) · **Instruments** (strumenti + prenotazioni) · **Reagents** (reagenti, categorie, transazioni) · **Cryo** (storage criogenico: dewar, freezer, vials) · **Wishlist** (richieste d'acquisto) · **Manuals** (manuali/file) · **Activity Log** · **Database** · **Admin Panel**. Le voci compaiono in base ai permessi del ruolo.

### Prenotazione strumenti (aggiornato giugno 2026)
- **Granularità mezz'ora:** gli slot sono da 30 min (configurabile a 60). Internamente l'orario è un decimale (`9.5` = 09:30) salvato nelle colonne `bookings.start_hour`/`end_hour` (tipo `numeric`).
- **Orario lavorativo con codice colore:** default **9:00–19:00**, evidenziato sul calendario; gli slot fuori orario sono prenotabili comunque ma marcati come "extra" (ambra). L'orario lavorativo, l'orario di apertura/chiusura del calendario e la granularità sono **impostabili dall'admin** in **Admin Panel → Hours**.
- **Impostazioni condivise:** salvate nella tabella Supabase `app_settings` (chiave `booking_settings`, valore JSONB), così valgono per tutti gli utenti. Fallback su `localStorage`/default se non raggiungibile.
- **Anti-overlap:** controllo dei conflitti con **ri-verifica sullo stato fresco del server** appena prima di confermare (riduce le doppie prenotazioni in concorrenza).
- **Vincoli:** niente prenotazioni su date/slot già passati; chi prenota può cancellare le proprie, mentre **admin / PI / lab_manager** possono cancellare anche quelle altrui (override).
- **Calendario settimanale (Dashboard):** vista a 7 giorni con le prenotazioni **di tutti**, navigazione tra settimane e **filtro per strumento**; colore per strumento e fuori-orario tratteggiato.
- File principali: `components/lab/InstrumentsPage.tsx`, `components/lab/DashboardPage.tsx` (calendario), `components/lab/AdminPage.tsx` (tab Hours), config in `data/lab-data.ts` (`BookingSettings`, `buildBookingSlots`, `isWorkingHour`).

### Autenticazione e sicurezza
- Login **email + password** (Supabase Auth). Solo email **autorizzate** (presenti nella tabella utenti) possono entrare: `findLabUserByEmail` blocca le altre.
- **2FA TOTP** (Google/Microsoft Authenticator, Authy): obbligatorio per ruoli `admin`, `pi`, `lab_manager` (e admin flag); opzionale ("Skip for now") per gli altri.
- Reset password via `/lab/reset-password`.
- **RLS (Row Level Security): ✅ ATTIVE (eseguite giugno 2026).** Le policy in `scripts/supabase-rls-policies.sql` sono applicate sul progetto live: con la sola anon key e **senza login** tutte le tabelle restituiscono `[]`. Solo gli utenti **autenticati** leggono/scrivono; le mutazioni sensibili (utenti, locations, projects, settings, ecc.) sono ristrette agli **admin/PI** via funzione `is_lab_admin()`. Lo script è **ri-eseguibile** (fa drop delle policy prima di ricrearle, così l'`ENABLE ROW LEVEL SECURITY` non viene annullato dal rollback della transazione dell'SQL Editor).
- **Hardening (luglio 2026):** `scripts/supabase-security-hardening.sql` stringe ulteriormente le policy: tutte richiedono l'**appartenenza al lab** (`is_lab_member()`, non basta un account Supabase qualsiasi creato via sign-up); un **trigger anti-escalation** su `lab_users` impedisce ai non-admin di modificare `role`/`is_admin`/`email` (anche sulla propria riga); un **exclusion constraint** su `bookings` rende impossibili le doppie prenotazioni sovrapposte a livello di database; le funzioni `SECURITY DEFINER` hanno `search_path` fissato. Consigliato inoltre disattivare i sign-up pubblici (Dashboard → Authentication). Lato app: i fetch distinguono "errore di connessione" da "tabella vuota" (i dati demo non risorgono più), le scritture fallite mostrano un **banner rosso** invece di perdere dati in silenzio, e il log attività è limitato alle ultime 500 voci al caricamento.
  - ⚠️ Le policy fanno match su `auth.jwt() ->> 'email'` con `lab_users.email`: se l'email di login di un utente **non coincide** con la sua riga in `lab_users`, quell'utente non vedrà i dati.

### Ruoli (da `data/lab-data.ts`)
`admin`, `pi`, `researcher`, `lab_manager`, `project_manager`, `postdoc`, `phd`, `msc`, `guest`. Ogni ruolo ha un set di permessi (`canRequestOrders`, `canViewLog`, `canViewDatabase`, `canUploadManuals`, `canAdmin`, ...). Esiste anche un set di permessi ridotti per utenti `External`. Per le prenotazioni esiste inoltre `canManageAllBookings` (admin/PI/lab_manager) per l'override di cancellazione.

### Tabelle Supabase usate (da `lib/supabase-data.ts`)
`instruments`, `maintenance_logs`, `locations`, `projects`, `certifications`, `storage_units`, `reagents`, `bookings`, `absences`, `cryo_vials`, `wishlist_items`, `log_entries`, `manuals`, **`app_settings`** (key/value JSONB per le impostazioni, es. orari prenotazione) (+ tabella utenti e storage file). Migrazione dedicata: `scripts/supabase-booking-settings.sql` (crea `app_settings` con RLS e converte `bookings.start_hour`/`end_hour` a `numeric` per le mezz'ore).

### Profili utente e Alumni (luglio 2026)
- Ogni utente ha in più: **codice persona** Polimi, **data di inizio/fine**, **supervisor** (obbligatorio concettualmente per MSc e guest, scelto tra i membri da PhD in su), **training** microfabrication e biological (spunta + data, solo admin). Migrazione: `scripts/supabase-user-profile-fields.sql`.
- **Stato Alumni**: al posto della cancellazione, gli utenti si **archiviano** (Admin → Users → icona archivio). Lo storico resta intatto (prenotazioni passate, log, progetti, date); le prenotazioni future vengono cancellate; il **login è bloccato** (sia client sia a livello RLS: `is_lab_member()`/`is_lab_admin()` richiedono `status='active'`). Ricordarsi di disabilitare l'account auth su Supabase. Riattivabili in ogni momento.
- La tabella admin Users è **snella** (nome, ruolo, affiliazione, admin, data) con **ricerca, filtro per ruolo e toggle Active/Alumni**; tutti i dettagli si aprono **cliccando sul nome** (scheda persona con certificazioni, training, supervisor, codice persona).
- Nuova pagina **Users** nella sidebar, visibile a **tutti i membri**: rubrica del lab con info non sensibili (no codice persona), ricerca/filtri e sezione Alumni. Il trigger anti-escalation ora protegge anche i campi gestionali e le certificazioni.

### Assenze e presenze (luglio 2026)
- Pagina **Absences** nella sidebar, visibile a tutti i membri **tranne MSc students e guest**. Implementa la policy stampabile `docs/policy-assenze.html`. Migrazione: `scripts/supabase-absences.sql` (tabella `absences` + impostazioni in `app_settings`).
- **Tipi**: permesso a ore, giorni off (1–2), ferie (>2 giorni), smart working, malattia, trasferta/conferenza. Ogni tipo ha colore e regole proprie.
- **Approvazione a livelli** (calcolata automaticamente al momento della richiesta, con motivazioni mostrate sia al richiedente sia all'approvatore):
  - ore, trasferta → registrate e basta; malattia → sempre registrata, anche retroattiva;
  - 1–2 giorni con ≥2 giorni lavorativi di preavviso → **auto-approvate**, altrimenti pending;
  - ferie >2 giorni → **sempre** approvazione del supervisor (preavviso consigliato: 2× la durata) + campo **handover** obbligatorio;
  - smart working → pre-approvato se dichiarato **entro il venerdì della settimana precedente**, max **4 giorni/mese**, **1 giorno alla volta** (consecutivi → approvazione); oltre i limiti → pending.
  - Guard-rail: periodi **blackout** (es. scadenze grant) e troppe persone assenti lo stesso giorno ⇒ la richiesta va in approvazione.
- **Chi approva**: admin e PI (`canApproveAbsences`). Vedono la sezione "Awaiting your approval" e un **badge** col numero di pending sulla voce di menu. A livello DB un trigger impedisce ai non-admin di auto-approvarsi (possono solo cancellare le proprie richieste).
- **Vista mensile "Who's out"**: griglia del mese con chip colorati per persona/tipo (tratteggiati se in attesa di approvazione), evidenza dei periodi blackout, navigazione mese per mese.
- **Admin → Absences**: soglie modificabili (giorni auto-approvabili, preavviso, tetto e consecutività smart working, max assenti contemporanei) e gestione dei periodi blackout. Salvate in `app_settings` chiave `absence_settings`.

### Stock reagenti (atomico)
I prelievi/ricariche di stock passano dalla RPC `adjust_reagent_stock` (`scripts/supabase-reagent-stock-rpc.sql`): l'aggiornamento avviene in una singola UPDATE lato server (clampato tra 0 e max), quindi due persone che prelevano lo stesso reagente in contemporanea non si sovrascrivono più. Se la RPC non è installata l'app ricade sul vecchio salvataggio riga intera.

### Calendario settimanale (dashboard)
- Desktop: vista 7 giorni con drag per creare/spostare/ridimensionare le prenotazioni.
- **Smartphone** (≤640px): vista **3 giorni** a partire da oggi, tutto **a tap** (tap su spazio vuoto = nuova prenotazione, tap su un blocco = dettagli); il drag è disattivato perché confligge con lo scroll touch. Le prenotazioni **in corso** si possono allungare/accorciare anche dal popup (menu "Update end"), non solo trascinando il bordo.
- **Google Calendar:** nel popup dei dettagli c'è il pulsante **"Add to Google Calendar"** che apre un evento precompilato (titolo, orario, note). Non è una sincronizzazione automatica: per quella servirebbe un feed ICS servito da un backend (es. Supabase Edge Function), oggi assente perché il sito è statico.

### Backup
`lib/backup.ts` consente backup/restore del database del lab (usa `jszip` per esportare). Per un **disaster recovery completo** (progetto Supabase perso): `scripts/supabase-schema-reference.sql` ricrea tutte le tabelle e nel suo header elenca la procedura passo-passo (schema → RLS → hardening → bucket → restore JSON/PDF → utenti auth).

> **Regola operativa:** non modificare il Lab Manager se non espressamente richiesto. È indipendente dal contenuto pubblico e ha la sua logica di sicurezza.

---

## 10. Mantenere Supabase attivo (keep-alive)

Il piano **free** di Supabase mette in **pausa** un progetto dopo ~7 giorni di inattività. In pausa, il login del lab smette di funzionare e l'host non risponde.

**Soluzione:** workflow GitHub Actions `.github/workflows/keep-supabase-alive.yml` che ogni giorno (cron 08:00 UTC) fa una query reale al database per tenerlo sveglio.

- Usa i **secret GitHub** `SUPABASE_URL` e `SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions).
- ⚠️ Se quei secret sono sbagliati/vuoti, il ping fallisce silenziosamente e il progetto va comunque in pausa. (È esattamente ciò che è successo a giugno 2026: il secret URL era errato; ora è corretto e il workflow è stato irrobustito con retry e log dell'HTTP code.)
- GitHub **disabilita i workflow schedulati dopo 60 giorni senza attività** sul repo: finché si fanno push/deploy regolari resta attivo; altrimenti riattivarlo dalla tab Actions.

**Se il progetto è in pausa:** dashboard Supabase → progetto `mimic-lab` → **Restore/Resume**, attendere qualche minuto, poi hard refresh del lab. Verificare che URL e anon key non siano cambiati (in `lib/supabase.ts` e nei secret GitHub).

---

## 11. I tre canali di pubblicazione

Il sito è pubblicato su **3 canali**. **Polimi FTPS è il canale di produzione primario.**

### 11.1 Polimi FTPS — PRIMARIO (`mimic.polimi.it`)
- **Server:** `131.175.186.58:2121` (host `web462.dmz.polimi.it`), user `mimic`, cartella `htdocs-SSL/`.
- **Comando:** `npm run deploy:polimi` (build `build:polimi` + upload). Solo upload (senza build): `SKIP_BUILD=1 npm run sync:polimi`.
- **Script:** `scripts/deploy-polimi-ftp.sh`.
- **Rete:** richiede **rete PoliMi o VPN GlobalProtect** (copre `131.175.0.0/16`).
- **Credenziali:** `deploy.polimi.env`.
- **Strategia "wipe + reload":** svuota `htdocs-SSL/` e ricarica tutto da zero (~5 min, ~310 KiB/s). È molto più veloce e affidabile del mirror incrementale.
- **Impostazioni FTPS critiche (già nello script, NON cambiare):**
  - `set ftp:ssl-protect-data false` → canale dati in chiaro (login resta cifrato). **È questo che rende il trasferimento veloce.** Con `true` stalla a 60–300 B/s.
  - `set ssl:verify-certificate false` → certificato self-signed del server.
  - `set ftp:passive-mode true` → richiesto dal server.
  - `set ftp:use-site-chmod false`, `set ftp:use-mdtm false` → evitano errori/spam.

> Dettaglio completo, lezioni apprese e script CI in [`DEPLOY_FTPS.md`](DEPLOY_FTPS.md).

> **Possibile redirect Apache:** storicamente `mimic.polimi.it` faceva un 301 verso GitLab Pages. Se dopo l'upload vedi ancora il sito di GitLab, gli IT PoliMi devono rimuovere il redirect dal VirtualHost e puntare il `DocumentRoot` su `htdocs-SSL/`.

### 11.2 GitLab Pages (mirror)
- **Repo:** monorepo `gitlab.polimi.it/DEIB/mimic`, il sito sta nel sottocartella `mimic-website/`.
- **Sync:** `bash scripts/sync-gitlab.sh "messaggio"` (NON fare `git push` diretto). Clona/aggiorna `.gitlab-clone/`, rsync dei file nel sottoprogetto, commit e push. La CI GitLab builda e pubblica le Pages.
- **Limite:** artefatto < **100 MB**.
- **Credenziali:** `deploy.gitlab.env` (PAT con `read_repository` + `write_repository`).
- Domini custom disabilitati sull'istanza PoliMi → resta utile come backup/preview.

### 11.3 GitHub (backup sorgente + Pages)
- **Repo:** `github.com/ringo977/mimic`, branch `main`. Push: `git push origin main`.
- **GitHub Pages:** `ringo977.github.io/mimic/` (basePath `/mimic`), servito dal branch **`gh-pages`** (file già buildati).
- **🚀 Auto-deploy (giugno 2026):** il workflow `.github/workflows/deploy-github-pages.yml` builda e pubblica su `gh-pages` **automaticamente a ogni push su `main`** (~1–2 min; salta il rebuild se cambi solo `scripts/`, `updates/` o file `.md`/`.rtf`). Avviabile anche a mano da GitHub → Actions → "Deploy to GitHub Pages" → Run workflow.
- **Deploy manuale (fallback):** `npm run publish:github` (build + push su `gh-pages`).
- ⚠️ GitHub Pages serve file in cache: dopo un deploy fai **hard refresh** (Cmd+Shift+R) per vedere le novità.

### Script npm in sintesi
| Script | Cosa fa |
|---|---|
| `npm run dev` | Dev server su localhost:3000 |
| `npm run build` | Build per GitHub Pages (basePath `/mimic`) |
| `npm run build:polimi` | Build basePath vuoto (FTPS / GitLab) |
| `npm run deploy:polimi` | Build + upload FTPS su `mimic.polimi.it` (PRIMARIO) |
| `npm run sync:polimi` | Solo upload FTPS (salta build, usa `out/`) |
| `npm run sync:gitlab` | Sync sorgente su GitLab → auto-deploy Pages |
| `npm run publish:github` | Build + push su `gh-pages` |
| `npm run publish:all` | `publish:github` + `deploy:polimi` + `sync:gitlab` |

---

## 12. Workflow completo di aggiornamento

Caso tipico (es. aggiungere una pubblicazione o una news):

```bash
# 1. Modifica il JSON in data/ (es. data/news.json), aggiungi in cima all'array.
#    Metti eventuali immagini in public/images/... e ottimizzale.

# 2. Valida il JSON
node -e "JSON.parse(require('fs').readFileSync('data/news.json','utf8')); console.log('OK')"

# 3. (consigliato) Anteprima locale
npm run dev   # http://localhost:3000

# 4. Commit + push su GitHub (backup sorgente)
git add data/news.json public/images/news/...
git commit -m "Add news: ..."
git push origin main

# 5. Sync su GitLab (mirror + Pages)
bash scripts/sync-gitlab.sh "Add news: ..."

# 6. Deploy in produzione su mimic.polimi.it (serve rete PoliMi o VPN GlobalProtect)
npm run deploy:polimi
```

Verifica finale: sorgente pagina deve referenziare `/_next/...` (non `/mimic/_next/...`) e `/lab/` deve aprirsi senza 403. Se vedi la versione vecchia, hard refresh (Cmd+Shift+R) o finestra anonima.

---

## 13. Credenziali e file segreti

### 13.1 Inventario dei file locali sensibili (root del progetto)

Tutti questi file vivono nella **root** `/Users/marco/Local Sites/mimic/`. La colonna "git" indica se il file è ignorato (e quindi NON finisce nel repo).

| File | Cosa contiene | git |
|---|---|---|
| `deploy.polimi.env` | Credenziali FTP Polimi: `FTP_HOST`, `FTP_PORT`, `FTP_USER`, **`FTP_PASS`**, `FTP_REMOTE_DIR` | ✅ ignorato |
| `deploy.gitlab.env` | **`GITLAB_TOKEN`** (PAT), `GITLAB_REPO`, `GITLAB_SUBFOLDER` | ✅ ignorato |
| `mimic passwd.txt` | Password del Lab Manager (riferimento locale) | ✅ ignorato |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (solo se creato localmente) | ✅ ignorato (`.env*.local`) |
| `Supabase.rtf` | Note Supabase del progetto **`taskflow-polimi`**: password, URL, publishable key, stringa di connessione Postgres, **API key Resend** | ✅ ignorato (`*.rtf`) |
| `Token MiMic Push.rtf` | **GitLab Personal Access Token** (`glpat-…`) "Mimic-push" | ✅ ignorato (`*.rtf`) |

> ✅ **Risolto (giugno 2026).** `Supabase.rtf` e `Token MiMic Push.rtf` sono ora coperti da `.gitignore` (regole dedicate + `*.rtf`). L'audit della history (`git log --all`) ha confermato che non sono **mai** stati committati, quindi nessuna rotazione di chiavi è stata necessaria. Resta comunque buona norma custodire questi file in un password manager fuori dal repo.

I file `*.example` versionati (`deploy.polimi.env.example`, `deploy.gitlab.env.example`, `.env.local.example`) sono **template senza valori** e servono per ricreare i file reali.

> ✅ **Audit history (giugno 2026):** `git log --all -- <file>` ha confermato che **nessuno** di questi file segreti (inclusi i due `.rtf`) è mai stato committato in alcun branch. I segreti sono rimasti solo in locale: nessun leak, nessuna rotazione di chiavi necessaria. I `.rtf` sono ora coperti da `.gitignore`.

### 13.2 Anatomia dei file di credenziali

```
# deploy.polimi.env
FTP_HOST=131.175.186.58
FTP_PORT=2121
FTP_USER=mimic
FTP_PASS=<segreto>          # usa apici singoli se contiene ! o spazi
FTP_REMOTE_DIR=htdocs-SSL

# deploy.gitlab.env
GITLAB_TOKEN=<PAT>          # scopes: read_repository, write_repository
GITLAB_REPO=https://gitlab.polimi.it/DEIB/mimic.git
GITLAB_SUBFOLDER=mimic-website

# .env.local (opzionale, solo per dev/build locale del lab)
NEXT_PUBLIC_SUPABASE_URL=https://vfruyyrpriymhmelgidr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key pubblica>
```

### 13.3 Segreti lato servizi (non su disco)

- **GitHub Actions** (Settings → Secrets and variables → Actions): `SUPABASE_URL`, `SUPABASE_ANON_KEY` per il workflow keep-alive.
- **GitLab CI** (Settings → CI/CD → Variables): `FTP_PASS` come **Protected + Masked**, se si usa il deploy FTP dalla CI.

### 13.4 Note sulla natura dei segreti

- L'**anon key di Supabase** (`vfruyyrpriymhmelgidr…`) è una chiave **pubblica**: compare nel bundle del client (`lib/supabase.ts`) ed è normale. La sicurezza reale è garantita dalle **RLS** (ora attive — vedi sez. 9: senza login la anon key non legge nulla).
- Sono invece **veramente sensibili** e vanno protetti: la **password FTP**, i **GitLab PAT** (`glpat-…`), la **password/connection string Postgres**, le **API key** (es. Resend), le password del Lab Manager.
- Il fallback dell'anon key è hardcodato in `lib/supabase.ts`; se la chiave venisse ruotata su Supabase, va aggiornata lì **e** nei secret GitHub.

---

## 14. Troubleshooting

### Build fallisce
- Quasi sempre **JSON non valido**. Valida ogni file in `data/` (vedi sez. 6).

### Sito su `mimic.polimi.it` senza stili/immagini
- Build sbagliato: hai usato `npm run build` (basePath `/mimic`) invece di `build:polimi`. Ricompila con `build:polimi` e ricarica.

### `/lab/` dà 403
- Manca `trailingSlash: true` in `next.config.js` o il build è vecchio. Verifica che esista `out/lab/index.html`.

### Trasferimento FTP lento (60–300 B/s) o `426 Failure reading network stream`
- `ftp:ssl-protect-data` è `true` da qualche parte (es. `~/.lftprc`). Lo script lo disabilita; se lanci lftp a mano aggiungi `set ftp:ssl-protect-data false`.

### "Cannot connect" all'FTP
- Non sei sulla rete PoliMi. Attiva GlobalProtect. Verifica: `route -n get 131.175.186.58` (il gateway deve essere un'interfaccia `utun*`).

### Lab login non si connette
- Probabile **Supabase in pausa**. Vedi [sezione 10](#10-mantenere-supabase-attivo-keep-alive): resume del progetto + verifica secret.

### GitLab Pages: "Artifacts too large"
- `out/` supera 100 MB. Ottimizza/rimuovi immagini grandi (vedi sez. 7), verifica `du -sh out/`.

### Sync GitLab fallisce
```bash
cat deploy.gitlab.env          # token valido?
ls -la .gitlab-clone/.git      # clone integro?
rm -rf .gitlab-clone && bash scripts/sync-gitlab.sh "messaggio"   # reset clone
```

---

## 15. Criticità attuali (da tenere d'occhio)

1. **`out/` ≈ 101 MB — al limite/oltre i 100 MB di GitLab Pages.** Rischio: il deploy GitLab Pages può iniziare a fallire. *Azione:* ottimizzare le immagini più pesanti (`find public/images -size +500k ...`), ridurre la qualità/dimensione, eventualmente spostare i file più grandi fuori dal deploy (come già fatto per alcuni). Obiettivo: tornare ben sotto i 100 MB (era ~33 MB in passato).

2. **Dipendenza da Supabase free tier.** Va in pausa dopo 7 giorni di inattività; il keep-alive ora funziona ma è fragile (basta un secret errato o GitHub che disabilita lo scheduled workflow dopo 60 giorni). *Azione:* controllare periodicamente lo stato del workflow e del progetto.

3. **Redirect Apache su `mimic.polimi.it`.** Se gli IT PoliMi non hanno rimosso il 301 verso GitLab Pages, l'upload FTPS non è effettivamente servito. *Azione:* verificare con `curl -I https://mimic.polimi.it` (deve dare `200`, non `301`).

4. **Deploy FTPS manuale e vincolato alla rete.** Richiede VPN/rete PoliMi e un comando locale; nessun deploy automatico affidabile verso il dominio primario. *Rischio:* dipende da una sola persona/macchina configurata.

5. **`data/collaborations.json` è legacy e non usato.** Genera confusione (il contenuto reale delle collaborazioni è in `network.json`). *Azione:* valutarne la rimozione.

6. **Contenuto duplicato su 3 canali con basePath diversi.** Facile pubblicare il build sbagliato sul canale sbagliato. *Mitigazione:* usare sempre gli script npm dedicati.

7. **Form contatti / integrazioni esterne.** Storicamente il form contatti era solo UI; verificare che invii davvero (Formspree/EmailJS/altro) e che eventuali API key siano configurate.

8. **✅ Risolto — Segreti `.rtf` ora ignorati.** `Supabase.rtf` e `Token MiMic Push.rtf` (credenziali Supabase `taskflow-polimi`, connection string Postgres, API key Resend, **GitLab PAT** `glpat-…`) sono ora in `.gitignore` (regola `*.rtf`); l'audit ha confermato che non sono mai stati committati. *Residuo:* gli altri segreti (`deploy.*.env`, `mimic passwd.txt`, `.env.local`) sono già ignorati ma vivono sul disco: custodirli in un password manager e non condividerli in chiaro. Vedi [sez. 13.1](#131-inventario-dei-file-locali-sensibili-root-del-progetto).

9. **Nessun test automatico.** Un JSON malformato o un refuso si scoprono solo al build/manualmente. *Mitigazione:* lo step di validazione JSON e l'anteprima locale.

10. **✅ Risolto — RLS Supabase attive.** Le policy di Row Level Security sono ora applicate sul progetto live (giugno 2026): senza login la anon key non legge alcun dato. In precedenza le tabelle (incluse le email degli utenti) erano leggibili pubblicamente. *Da tenere d'occhio:* eventuali nuove tabelle vanno aggiunte allo script RLS, e l'email di login degli utenti deve coincidere con `lab_users.email`.

---

## 16. Potenziali miglioramenti

**Contenuti / DX (developer experience)**
- **CI di validazione:** una GitHub Action che a ogni push valida tutti i JSON e lancia `npm run build` (così un errore si scopre subito, non in produzione).
- **Script "publish" unico e idempotente** che fa build corretto + tutti i canali, con controllo della dimensione di `out/` (blocca se > 95 MB).
- **Rimuovere il legacy** `collaborations.json` e ogni codice morto.

**Performance / immagini**
- **Pipeline di ottimizzazione immagini** automatica (es. `sharp`/`squoosh` in pre-commit) per restare sotto i 100 MB e velocizzare il sito.
- Convertire le immagini pesanti in **WebP/AVIF**.

**Affidabilità del deploy**
- **Automatizzare il deploy FTPS** (runner nella rete PoliMi o GitLab CI con IP whitelisted) per non dipendere da una macchina locale + VPN.
- **Monitoraggio uptime** di `mimic.polimi.it` (es. UptimeRobot) con alert.

**Lab Manager / Supabase**
- Valutare il **passaggio a un piano Supabase a pagamento** (o un piccolo Postgres gestito) per eliminare il problema della pausa e dei backup.
- **Backup automatici** schedulati del database lab (oggi il backup è manuale via `lib/backup.ts`).
- **Health-check** del lab login (oltre al ping REST) con notifica se va giù.

**SEO / accessibilità**
- `sitemap.xml` e `robots.txt`, Open Graph image dedicata, dati strutturati (JSON-LD) per pubblicazioni/persone.
- Audit accessibilità (alt text su tutte le immagini, contrasti, focus).

---

## 17. Glossario

- **Export statico:** Next.js genera HTML/CSS/JS pronti, senza server a runtime.
- **basePath:** prefisso URL sotto cui è servito il sito (`/mimic` su GitHub Pages, vuoto su Polimi).
- **FTPS:** FTP su TLS. Qui: login cifrato, canale dati in chiaro per velocità.
- **Wipe + reload:** svuotare la cartella remota e ricaricare tutto (strategia di deploy Polimi).
- **RLS:** Row Level Security di Postgres/Supabase: regole di accesso a livello di riga.
- **TOTP / 2FA:** codice a tempo dell'app authenticator come secondo fattore.
- **Keep-alive:** ping schedulato per non far andare in pausa il progetto Supabase free.
- **Anon key:** chiave pubblica del client Supabase; la sicurezza è garantita dalle RLS.

---

*Per i dettagli campo-per-campo sui contenuti vedi [`SITE_UPDATE_GUIDE.md`](SITE_UPDATE_GUIDE.md). Per il deploy FTPS in dettaglio vedi [`DEPLOY_FTPS.md`](DEPLOY_FTPS.md).*
