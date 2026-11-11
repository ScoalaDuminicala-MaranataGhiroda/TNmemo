# TNmemo PWA - Concursul Biblic „Talantul în Negoț” (Secțiunea Memorare)

Aplicație **Progressive Web App (PWA)** creată special pentru monitorizarea memorării versetelor la concursul **Talantul în Negoț (TNmemo / TNmemorare)**, adaptată la fusul orar din **Timișoara (`Europe/Bucharest`)**, cu suport pentru baza de date în cloud **Turso (libSQL)**, **Dark Mode** nativ în nuanța smarald a logo-ului (`#10b982`), protecție împotriva indexării Google și deploy automat pe **GitHub Pages**.

---

## 1. Rularea rapidă pe calculatorul tău (Local)

Aplicația funcționează **instantaneu** după dezarhivare (chiar și înainte să configurezi Turso, rulând automat în *Modul Demo Local* cu date preîncărcate ca să poți testa toate funcționalitățile pe loc!).

1. Deschide un terminal în folderul dezarhivat (`tnmemo-pwa`):
   ```bash
   npm install
   npm run dev
   ```
2. Deschide în browser link-ul afișat (de obicei `http://localhost:5173`).
3. Pentru a intra în panoul de **Admin**, apasă pe butonul **Admin** din colțul dreapta-sus:
   - **Parola implicită:** `talantul` *(o poți schimba oricând din tab-ul „5. Materiale & Parolă” sau din variabila `VITE_ADMIN_PASSWORD`)*.
4. În folderul `public/exemplu-plan-memorare.txt` găsești și un fișier `.txt` demonstrativ gata de testat la încărcare.

---

## 2. Formatul fișierului `.txt` încărcat de Admin

Conform cerințelor concursului, fișierul `.txt` are următoarea structură:
- **Linia 1:** Numele cărții din Biblie (ex: `Filipeni`)
- **Linia 2:** Data calendaristică de start în format `YYYY-MM-DD` sau `ZZ.LL.AAAA` (ex: `2026-11-02`)
- **Liniile 3+:** Câte o linie pentru fiecare zi consecutivă începând cu ziua de start:
  - `-` înseamnă **zi de pauză**
  - `ab:cd` înseamnă **capitol:verset** de memorat în ziua respectivă (ex: `1:1`, `1:2`, `2:5`)

Exemplu:
```text
Filipeni
2026-11-02
1:1
1:2
1:3
-
1:4
1:5
```

---

## 3. Configurarea Bazei de Date Turso (libSQL) - Pas cu Pas

Pentru ca toți concurenții și liderii să vadă aceleași date sincronizate pe telefoanele lor:

1. Intră pe [https://turso.tech](https://turso.tech) și autentifică-te (sau folosește Turso CLI).
2. Creează o bază de date nouă numită `tnmemo-db`:
   - **Din interfața web Turso:** Apasă **Create Database** -> Nume: `tnmemo-db` -> Regiune: `Frankfurt (fra)` sau `Amsterdam (ams)`.
   - **Sau din terminal (Turso CLI):**
     ```bash
     turso db create tnmemo-db
     turso db show tnmemo-db --url
     turso db tokens create tnmemo-db
     ```
3. Copiază cele 2 valori obținute:
   - **Database URL:** arată ca `libsql://tnmemo-db-numele-tau.turso.io`
   - **Auth Token:** un șir lung `eyJhbGciOi...`
4. **Pentru rulare locală conectată la Turso:**
   - Redenumește fișierul `.env.example` în `.env` (în rădăcina proiectului) și completează valorile:
     ```env
     VITE_TURSO_DATABASE_URL=libsql://tnmemo-db-numele-tau.turso.io
     VITE_TURSO_AUTH_TOKEN=eyJhbGciOi...
     VITE_ADMIN_PASSWORD=parola_ta_de_admin
     ```
   - **Nu trebuie să creezi manual tabelele în SQL!** La prima deschidere a aplicației, codul din `src/lib/db.js` creează automat toate cele 5 tabele (`app_settings`, `competitors`, `progress`, `teams`, `materials`) și încarcă planul inițial.

---

## 4. Publicarea pe GitHub Pages (Cu GitHub Actions preconfigurat)

Proiectul conține deja workflow-ul automat în `.github/workflows/deploy.yml` și configurarea `base: './'` în `vite.config.js`.

1. Creează un repository nou pe GitHub (ex: `tnmemo`).
2. Urcă codul pe GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit TNmemo PWA"
   git branch -M main
   git remote add origin https://github.com/USERNAME/tnmemo.git
   git push -u origin main
   ```
3. **Adaugă secretele Turso în GitHub:**
   - În repository-ul tău de pe GitHub, mergi la **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.
   - Adaugă următoarele 3 secrete:
     1. `VITE_TURSO_DATABASE_URL` = URL-ul bazei tale Turso (`libsql://...`)
     2. `VITE_TURSO_AUTH_TOKEN` = Token-ul JWT generat de Turso
     3. `VITE_ADMIN_PASSWORD` = Parola dorită pentru panoul Admin
4. **Activează GitHub Pages:**
   - Mergi la **Settings** -> **Pages** (în meniul din stânga).
   - La secțiunea **Build and deployment** -> **Source**, selectează **GitHub Actions** din dropdown.
5. Mergi în tab-ul **Actions** din repository și apasă **Re-run all jobs** (sau fă un mic push). În ~45 de secunde aplicația ta PWA este live și gata de instalat pe telefoane (`Add to Home Screen`)!

---

## 5. Blocarea Indexării pe Google (Anti-SEO / Confidențialitate)

Site-ul este protejat pe două niveluri pentru a nu apărea în căutările Google:
1. În `index.html`:
   ```html
   <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
   <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
   ```
2. În `public/robots.txt`:
   ```text
   User-agent: *
   Disallow: /
   ```
