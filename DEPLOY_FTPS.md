# Deploy del sito MiMic via FTPS

Documento operativo per il deploy del sito statico Next.js (`mimic-website`)
sul server FTPS di PoliMi che ospita `mimic.polimi.it`.

---

## 1. Parametri del server

| Parametro | Valore |
|---|---|
| Host | `131.175.186.58` (hostname interno: `web462.dmz.polimi.it`) |
| Porta | `2121` (FTPS esplicito su porta non standard) |
| User | `mimic` |
| Password | da gestire come segreto, **mai in chiaro nel repo** |
| Directory di destinazione | `htdocs-SSL/` |
| URL pubblico | `https://mimic.polimi.it` (senza `www`) |

### Particolarità del server da tenere a mente

- **Certificato self-signed** intestato a `web462.dmz.polimi.it`. La verifica
  del certificato fallisce sempre, va disattivata lato client
  (`set ssl:verify-certificate false`).
- **Il canale dati TLS è instabile**: con `ftp:ssl-protect-data true` (default)
  i trasferimenti vanno a 60–300 B/s e si bloccano con errori
  `426 Failure reading network stream`. Va disattivata la cifratura del
  canale dati (`set ftp:ssl-protect-data false`). Il login resta cifrato,
  i file viaggiano in chiaro — accettabile per un sito pubblico.
- **`SITE CHMOD` non supportato**: il server non accetta i comandi per
  modificare i permessi (`MFF` e `SITE CHMOD`). Senza opportuni flag, lftp
  riempie l'output di errori innocui. Si silenziano con
  `set ftp:use-site-chmod false` e `mirror --no-perms`.
- **Modalità passiva obbligatoria** (`set ftp:passive-mode true`).
- **Il canale dati TLS non si aggancia da remoto**: il deploy va fatto da
  rete PoliMi (eduroam o VPN GlobalProtect non sempre sufficienti — la VPN
  copre la subnet `131.175.0.0/16`, verificare con `route -n get 131.175.186.58`
  che il gateway sia `utun*` di GlobalProtect).

### Velocità tipica raggiunta

- Singolo file su cartella vuota: ~56 KiB/s
- Mirror di 296 file / 100 MB su cartella vuota: **~5 minuti, ~310 KiB/s**
- Mirror su cartella già piena del deploy precedente: **si blocca** dopo i
  primi file (vedi sezione 4).

---

## 2. Configurazione Next.js

Il sito è un export statico Next.js. Il `next.config.js` originale usava
`basePath: '/mimic'` perché era pensato per GitLab Pages sotto
`gitlab.polimi.it/.../mimic`. Per il deploy su `mimic.polimi.it` (root del
dominio), `basePath` e `assetPrefix` **devono essere vuoti**:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '',
  assetPrefix: '',
}

module.exports = nextConfig
```

Il build genera la cartella `out/` con tutto il sito statico pronto
all'upload.

---

## 3. Comando di deploy manuale

Comando lftp testato e funzionante. Da lanciare dalla root del progetto
(quella che contiene `out/`).

```bash
lftp -u 'mimic,LA_TUA_PASSWORD' -e "
  set ftp:ssl-force true;
  set ftp:ssl-protect-data false;
  set ssl:verify-certificate false;
  set ftp:passive-mode true;
  set ftp:use-site-chmod false;
  set ftp:use-mdtm false;
  cd htdocs-SSL;
  glob -a rm -rf *;
  mirror -R --verbose --no-perms ../out/ .;
  quit
" ftp://131.175.186.58:2121
```

Il flusso è:

1. Connessione FTPS sulla 2121 con login cifrato e canale dati in chiaro
2. `cd htdocs-SSL` nella cartella del sito
3. `glob -a rm -rf *` svuota completamente la cartella (vedi nota in sezione 4)
4. `mirror -R --verbose --no-perms ../out/ .` carica ricorsivamente l'intera
   `out/` nella cartella corrente (`htdocs-SSL/`)

### Spiegazione dei flag

| Flag | Scopo |
|---|---|
| `set ftp:ssl-force true` | Forza FTPS (rifiuta fallback in chiaro) |
| `set ftp:ssl-protect-data false` | Canale dati in chiaro (necessario per velocità) |
| `set ssl:verify-certificate false` | Accetta il cert self-signed |
| `set ftp:passive-mode true` | Modalità passiva |
| `set ftp:use-site-chmod false` | Non invia `SITE CHMOD` |
| `set ftp:use-mdtm false` | Non interroga timestamp remoti |
| `mirror -R` | Reverse mirror = upload (locale → remoto) |
| `--no-perms` | Non tenta di replicare permessi Unix |
| `--verbose` | Mostra il progresso file per file |

### Script bash riutilizzabile

Salvare come `deploy.sh` nella root di `mimic-website/`, rendere eseguibile
con `chmod +x deploy.sh`, lanciare con `./deploy.sh`:

```bash
#!/bin/bash
set -e

FTP_HOST="131.175.186.58"
FTP_PORT="2121"
FTP_USER="mimic"
FTP_PASS="${FTP_PASS:?FTP_PASS env variable is required}"

echo "🏗️  Building..."
npm run build

echo "🧹 Cleaning remote htdocs-SSL/..."
lftp -u "$FTP_USER,$FTP_PASS" -e "
  set ftp:ssl-force true;
  set ftp:ssl-protect-data false;
  set ssl:verify-certificate false;
  cd htdocs-SSL;
  glob -a rm -rf *;
  quit
" ftp://$FTP_HOST:$FTP_PORT

echo "🚀 Uploading..."
lftp -u "$FTP_USER,$FTP_PASS" -e "
  set ftp:ssl-force true;
  set ftp:ssl-protect-data false;
  set ssl:verify-certificate false;
  set ftp:passive-mode true;
  set ftp:use-site-chmod false;
  mirror -R --verbose --no-perms out/ htdocs-SSL/;
  quit
" ftp://$FTP_HOST:$FTP_PORT

echo "✅ Done! Check https://mimic.polimi.it"
```

La password va passata come variabile d'ambiente, **non scritta nello script**:

```bash
export FTP_PASS='LA_TUA_PASSWORD'
./deploy.sh
```

Aggiungere `deploy.sh` a `.gitignore` se contiene segreti, oppure tenerlo
versionato leggendo solo da `$FTP_PASS`.

---

## 4. Lezione importante: NON usare mirror su una cartella già piena

Durante i test è emerso che `mirror` **si blocca** quando la cartella remota
contiene già i file di un deploy precedente (anche identici): carica solo i
file "extra" del locale (es. `.DS_Store`, `.gitkeep`) e poi entra in un
loop di confronti che gira a 60–300 B/s. Su 296 file ci mette ore o non
finisce mai.

**Soluzione adottata**: svuotare prima `htdocs-SSL/` con
`glob -a rm -rf *` e poi caricare da zero. Lo svuotamento è quasi istantaneo
e il successivo upload va alla velocità teorica (~310 KiB/s, ~5 minuti per
l'intero sito).

In alternativa, per deploy incrementali si può usare `mirror --only-newer
--ignore-time --no-perms` ma non è stato testato e ha mostrato comportamenti
imprevedibili in alcuni casi. Il pattern "svuota e ricarica" è meno
elegante ma robusto e veloce.

---

## 5. Deploy automatico via GitLab CI/CD

Il repository sta su `gitlab.polimi.it/DEIB/mimic`. Aggiungere
`.gitlab-ci.yml` nella root del progetto (`mimic-website/`):

```yaml
stages:
  - build
  - deploy

variables:
  FTP_HOST: "131.175.186.58"
  FTP_PORT: "2121"
  FTP_USER: "mimic"

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - out/
    expire_in: 1 hour

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache lftp
  script:
    - |
      lftp -u "$FTP_USER,$FTP_PASS" -e "
        set ftp:ssl-force true;
        set ftp:ssl-protect-data false;
        set ssl:verify-certificate false;
        set ftp:passive-mode true;
        set ftp:use-site-chmod false;
        cd htdocs-SSL;
        glob -a rm -rf *;
        mirror -R --verbose --no-perms ../out/ .;
        quit
      " ftp://$FTP_HOST:$FTP_PORT
  dependencies:
    - build
  only:
    - main
```

### Configurazione delle variabili CI/CD

Su GitLab → progetto `mimic-website` → `Settings` → `CI/CD` → `Variables`:

- Key: `FTP_PASS`
- Value: la password FTP
- Flag: **Protected** ✓, **Masked** ✓

In questo modo la password non compare mai nei log di build.

### Verifica preliminare: i runner GitLab raggiungono il server FTP?

I runner di `gitlab.polimi.it` devono poter aprire connessioni in uscita
verso `131.175.186.58:2121` (e sulle porte dinamiche del canale dati
passivo). Se sono nella stessa rete DMZ del server FTP funzionano subito.
Se sono esterni, il primo job di deploy fallirà con timeout — in quel caso
chiedere ai tecnici PoliMi di whitelistare gli IP dei runner sul firewall
del server FTP.

---

## 6. Stato attuale di `mimic.polimi.it`

Verifica con `curl -I https://mimic.polimi.it`:

```
HTTP/1.1 301 Moved Permanently
Location: https://mimic-224a25.pages.gitlab.polimi.it/
```

Apache fa **redirect 301** verso GitLab Pages. I file caricati su
`htdocs-SSL/` quindi **non sono ancora serviti**: il sito visibile è
quello di GitLab Pages.

Per attivare davvero il deploy via FTPS bisogna chiedere ai tecnici
PoliMi di:

1. Rimuovere il redirect 301 dal VirtualHost Apache di `mimic.polimi.it`
2. Configurare il `DocumentRoot` su `htdocs-SSL/`

Strategia consigliata: caricare prima il sito completo via FTPS (così
quando tolgono il redirect è subito online), poi inviare la richiesta ai
tecnici.

---

## 7. Checklist operativa rapida

- [ ] `next.config.js` con `basePath: ''` e `assetPrefix: ''`
- [ ] `npm run build` → genera `out/` (verificare ~100 MB, ~296 file)
- [ ] Da rete PoliMi o VPN GlobalProtect attiva
- [ ] `export FTP_PASS='...'`
- [ ] `./deploy.sh` (manuale) oppure push su `main` (CI/CD)
- [ ] Verificare upload con
      `lftp -u 'mimic,$FTP_PASS' -e 'cls -la htdocs-SSL/; quit' ftp://131.175.186.58:2121`
- [ ] Quando i tecnici tolgono il redirect: `curl -I https://mimic.polimi.it`
      deve restituire `200 OK`
