# Termínovka – Kompletní technická dokumentace a kontext pro AI (AI Handoff)

Tento dokument slouží jako kompletní předávací protokol pro AI asistenta (Claude Code, Cursor, Windsurf, ChatGPT aj.). Obsahuje veškerou architekturu, databázové schéma, produkční nasazení, specifickou logiku a pravidla, která je nutné dodržovat.

---

## 1. O projektu
**Termínovka** je školní webová aplikace pro třídu **1.B na Smíchovské střední průmyslové škole a gymnáziu (SSPŠ)**, vizuálně sladěná s identitou `ssps.cz` (tmavě modrá `#0D0F26` / `#131738` a zlatá `#DDA300`).
Slouží ke sledování písemek (`TEST`), domácích úkolů (`HOMEWORK`), termínů odevzdání (`DEADLINE`), třídních událostí/prázdnin (`OTHER`) a školního rozvrhu hodin.

### Produkční nasazení (LIVE) a lokální umístění
- **Lokální cesta k projektu:** `/Users/plojharsim/Documents/Moje projekty/terminovka` (`~/Documents/Moje projekty/terminovka`)
- **Produkční URL:** `https://terminovka.plojharsim.cz` (alias: `https://terminovka.vercel.app`)
- **Hosting:** **Vercel** (účet/tým: `plojharsim`, projekt: `terminovka`, ID: `prj_dZaAm3LsaH8GyDxi5YgaCXx6scGI`)
- **DNS:** Cloudflare (`plojharsim.cz` -> CNAME `terminovka` na Vercel)
- **Databáze v produkci:** **Vercel / Neon Serverless PostgreSQL** (region `fra1` Frankfurt, databáze `neondb`, název zdroje `terminovka-db`). Připojovací údaje jsou v `.env.local` a ve Vercel Environment Variables (`DATABASE_URL`, `POSTGRES_PRISMA_URL`).
- **Úložiště souborů v produkci:** **Vercel Blob** (`terminovka-blob`, region `fra1`, ID `store_UEv6syVynTJxHyRm`).
- **GitHub repozitář:** `https://github.com/plojharsim/Terminovka` (uživatel používá **GitHub Desktop** nebo přímé nasazení přes `npx vercel --prod --yes`).

---

## 2. Technologický stack
- **Framework:** Next.js `16.4.0` (App Router, Turbopack, TypeScript, React `19.3.0`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/turbopack`), světlý i tmavý režim (`ThemeProvider.tsx`)
- **Databáze & ORM:** Prisma `6.19.3` (`prisma/schema.prisma` – provider `postgresql`)
- **Autentizace:** Vlastní JWT přes knihovnu `jose` (uložené v HTTP-only cookie `terminovka_token`) + `bcryptjs` pro hashování hesel (`src/lib/auth.ts`)
- **Kalendářní export:** `ical-generator` (`src/lib/ical.ts`, endpoint `/api/ical`)
- **Ikony:** `lucide-react`

---

## 3. Databázové schéma (`prisma/schema.prisma`)
1. **`User`**
   - `id`, `name`, `email` (unique), `passwordHash`, `role` (`"ADMIN"` nebo `"EDITOR"`), `isActive`
   - **Hlavní admin účet:**
     - Email: `plojharsim@gmail.com`
     - Jméno: `Šimon Plojhar`
     - Heslo: uloženo mimo repozitář (správce hesel majitele) – zde záměrně neuvedeno
2. **`Subject` (Předměty)**
   - `id`, `name`, `code` (např. `M`, `FYZ`, `CJL`, `PVA`, `PCV`, `ANG`...), `color` (hex), `defaultRoom`, `teacher`
3. **`StudentGroup` (Skupiny studentů / dělení třídy)**
   - `id`, `name`, `code` (`ALL`, `SK1`, `SK2`, `1ITK`–`5ITK` pro matematiku, `NEM`/`FRJ1` pro 2. jazyk, `PCV1`–`PCV3`, `PVA1`–`PVA2`, `ANG_*` pro angličtinu), `isDefaultAll` (`true` pouze pro „Celá třída")
4. **`ScheduleSlot` (Rozvrh hodin)**
   - `id`, `dayOfWeek` (1 = Po až 5 = Pá), `period` (1 až 10), `startTime`, `endTime`, `room`, `weekType` (`"ALL"`, `"EVEN"` = sudý, `"ODD"` = lichý, `"SELF_STUDY"` = páteční samostudium / asynchronní výuka), `subjectId`, `groupId`
5. **`Event` (Události – testy, úkoly, akce)**
   - `id`, `title`, `type` (`TEST`, `HOMEWORK`, `DEADLINE`, `OTHER`), `date` (`DateTime`)
   - `hasSpecificTime`, `startTime`, `endTime`, `period` (číslo vyučovací hodiny)
   - `weight` (`Int?` – předpokládaná váha známky 1–10)
   - `recurringId` (`String?` – UUID propojující sérii opakovaných událostí)
   - `description` (`String?`)
   - `attachmentUrl` (`String?` – URL na soubor ve Vercel Blob nebo odkaz na Microsoft Teams)
   - `attachmentName` (`String?` – původní název nahraného souboru)
   - `subjectId`, `groupId`, `createdById`
6. **`AppConfig`**
   - `key`, `value`

---

## 4. Klíčové funkce a specifická aplikační logika (DŮLEŽITÉ!)

### A. Ochrana proti ztrátě dat
- **NIKDY nepoužívat `prisma migrate reset` ani příkazy, které by smazaly produkční data!**
- Kompletní záloha produkčních dat je uložena v kořeni projektu v `terminovka_backup.json`.
- Skript `scripts/auto-build.js` při buildu na Vercelu volá `npx prisma db push --skip-generate` a následně `scripts/auto-init.js`, který naimportuje data ze zálohy **pouze v případě, že je databáze zcela prázdná** (`userCount === 0`).

### B. Práce s daty a časovými zónami (`src/lib/formatters.ts`)
- **Kritické pravidlo:** Nikdy nepoužívat `.toISOString().split("T")[0]` přímo na lokální `Date` objekt na klientovi, protože kvůli časovému posunu (CET/CEST UTC+1/+2) docházelo k posunu půlnočních dat o den zpět!
- Vždy používat pomocné funkce z `src/lib/formatters.ts`:
  - `toLocalDateString(date)` – vrátí `YYYY-MM-DD` v lokálním čase.
  - `getEventDateString(event.date)` – bezpečně vytáhne `YYYY-MM-DD` z události.

### C. Opakované události (`recurringId`)
- Při vytváření události v `EventModal.tsx` lze zvolit opakování: `NONE`, `WEEKLY`, `BIWEEKLY`, `MONTHLY` a trvání buď na přesný počet opakování, nebo **„Nekonečně (do konce školního roku – 30. 6.)"**.
- Všechny vygenerované instance série sdílejí stejné `recurringId`.
- **Mazání opakovaných událostí (`DeleteRecurringModal.tsx` & `DELETE /api/events/[id]`):**
  - Pokud uživatel maže událost s `recurringId`, zobrazí se modál s volbou:
    1. `single` – smazat pouze tuto konkrétní událost
    2. `following` – smazat tuto a všechny budoucí události ze série (`date >= current`)
    3. `all` – smazat celou sérii
- **Počítání opakovaných událostí v přehledech (`computeEventCounts` v `src/lib/formatters.ts`):**
  - Aby série např. 30 týdenních testů uměle nenafukovala počet testů na Dashboardu, počítá se v hlavním čísle `primaryCount` pouze neopakovaná událost a **každá unikátní série (`recurringId`) se v odznáčku `+ X opakovaných` počítá pouze jednou** (`recurringGroups.size`).

### D. Skupiny studentů a filtrování rozvrhu
- Každý návštěvník si v prohlížeči (`localStorage` klíč `terminovka_user_groups`) volí své skupiny v okně `GroupSelectionModal.tsx`.
- **Počítání hodin za den (`DashboardView.tsx`):** Pokud uživatel nemá vybrané skupiny, v jedné vyučovací hodině (`period`) může být v databázi více paralelních slotů pro různé skupiny (např. 8 skupin angličtiny). Počet hodin za den se proto vždy počítá jako počet **unikátních vyučovacích hodin** (`new Set(daySlots.map(s => s.period)).size`), aby se nikdy nezobrazovalo např. „22 hodin dnes".
- **Výchozí skupina při přidání události (`EventModal.tsx`):** Po zvolení předmětu funkce `resolveDefaultGroupForSubject` automaticky předvyplní skupinu, kterou má přihlášený uživatel nastavenou pro daný předmět. Pokud má uživatel v rozvrhu pro daný předmět 0 nebo více skupin, nastaví se výchozí `ALL` (Celá třída).

### E. Kontrola rozvrhu při plánování testu (`/api/timetable/check`)
- Test (`TEST`) lze naplánovat pouze na den, kdy se daný předmět skutečně vyučuje podle rozvrhu (včetně kontroly sudého/lichého týdne `EVEN`/`ODD`).
- Úkoly (`HOMEWORK`) a ostatní akce (`OTHER`) lze uložit na jakýkoliv den (zobrazí se jen informativní žluté upozornění, že v ten den hodina není).

### F. Přílohy a Microsoft Teams (`/api/upload` a `EventModal.tsx`)
- K událostem lze buď nahrát soubor až do 50 MB (ukládá se do **Vercel Blob** pokud je přítomen `BLOB_READ_WRITE_TOKEN` / OIDC, případně lokálně do `data/uploads`), nebo vložit odkaz na **Microsoft Teams** / webové materiály.

---

## 5. Struktura důležitých souborů
- `src/app/page.tsx` – Hlavní stránka, stav přihlášení, přepínání záložek (`Přehled / Dashboard`, `Seznam termínů`, `Kalendář`, `Rozvrh hodin`), filtrování událostí.
- `src/components/DashboardView.tsx` – Úvodní přehled s uvítáním (vokativ českých jmen), dnešním rozvrhem, týdenním přehledem Po–Pá a nadcházejícími termíny.
- `src/components/EventModal.tsx` – Formulář pro vytvoření/úpravu události (kontrola rozvrhu, váha známky, opakování, nahrávání souborů, odkaz na Teams).
- `src/components/DeleteRecurringModal.tsx` – Modál pro smazání jedné / budoucích / všech opakovaných událostí.
- `src/components/CalendarMonthView.tsx` – Měsíční kalendářní pohled.
- `src/components/TimetableGrid.tsx` – Kompletní rozvrh hodin (včetně přepínače Vše / Sudý / Lichý týden a pátku se samostudiem).
- `src/components/GroupSelectionModal.tsx` – Výběr skupin studenta po kategoriích.
- `src/components/AdminPanelModal.tsx` – Administrace (správa uživatelů/redaktorů, předmětů, skupin a rozvrhu).
- `src/lib/formatters.ts` – České skloňování, vokativ jmen, formátování dat bez timezone chyb, výpočet statistik událostí.
- `src/lib/timetable.ts` – Časy zvonění na SSPŠ, výpočet ISO týdne a sudého/lichého týdne.

---

## 6. Jak projekt spouštět a nasazovat

### Lokální vývoj
```bash
npm install
npm run dev
```
*(Lokálně čte proměnné z `.env.local`, kde je napojena vývojová/produkční Neon Postgres DB).*

### Nasazení do produkce
1. **Přes GitHub Desktop:** Stačí udělat Commit do větve `main` a kliknout na **Push origin** (uživatel preferuje GitHub Desktop a stručné shrnutí změn místo dlouhých terminálových příkazů).
2. **Přímé nasazení přes Vercel CLI:**
   ```bash
   npx vercel --prod --yes
   ```
   *(Vercel CLI je v projektu nalinkované ve složce `.vercel`).*

---

## 7. Přístup pro AI (MCP server + OAuth)
- Endpoint `POST /api/mcp` (`src/app/api/mcp/route.ts`) – MCP Streamable HTTP, bezstavový JSON-RPC. Nástroje: `get_overview`, `list_events`, `check_timetable`, `create_event`, `update_event`, `delete_event`. Volají přímo existující API handlery, takže platí stejná oprávnění a validace jako ve webu.
- Připojení ve webovém Claude: Nastavení → Konektory → Přidat vlastní konektor → URL `https://terminovka.plojharsim.cz/api/mcp`. Claude si sám provede OAuth; na `/oauth/authorize` uživatel vybere své skupiny (předvyplní se z `terminovka_user_groups`) a buď pokračuje **bez přihlášení** (token `sub=anon`, jen čtení), nebo se přihlásí e-mailem a heslem (smí i zapisovat). V samotné aplikaci žádné UI pro AI není.
- OAuth 2.1 je **bezstavové** (`src/lib/oauth.ts`): `client_id`, authorization code, access (1 h) a refresh token (30 dní) jsou JWT podepsané klíčem odvozeným z `AUTH_SECRET` (žádné tabulky). Routy: `/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`, `/api/oauth/register|authorize|token`, stránka `/oauth/authorize`. PKCE (S256) je povinné. `getCurrentUser()` přijímá cookie i Bearer access token; uživatel se při každém použití ověřuje v DB (deaktivace účtu okamžitě zablokuje AI).
- **Skupiny přihlášených se ukládají na server:** `User.selectedGroupIds` (JSON pole ID, `null` = ještě nevybíral; sloupec přidán ručně `ALTER TABLE … ADD COLUMN`). Web je po přihlášení synchronizuje přes `/api/auth/groups` (server má přednost, jinak se nahraje výběr z `localStorage`). MCP pro přihlášeného uživatele čte skupiny vždy aktuálně z profilu, pro anonymního z tokenu.
- **Filtrování podle skupin:** vybrané skupiny jsou v tokenu (claim `grp`). `list_events` a `get_overview` vracejí jen položky bez skupiny / pro „Celá třída“ / pro vybrané skupiny (stejné pravidlo jako na webu). Zápisové nástroje u anonymního tokenu vrací chybu.
- **Test přes AI:** `create_event`/`update_event` (`prepareEventArgs` v `src/app/api/mcp/route.ts`) vyžadují u `TEST` předmět a konkrétní hodinu (`period`), která v ten den v rozvrhu je; při chybějící/špatné hodině nebo nejednoznačné skupině vrátí chybu se seznamem dostupných hodin a AI se musí zeptat uživatele. Web hodinu předvybírá automaticky, AI ne. U ostatních typů se hodina ověřuje jen, když ji AI zadá.
- Bez nastaveného `AUTH_SECRET` OAuth nefunguje (záměrně bez veřejného fallbacku). Zrušení přístupu = odpojení konektoru v Claude, nebo změna `AUTH_SECRET` (odhlásí i všechny uživatele).
- **Pozor – sdílená DB:** v produkční databázi jsou i cizí tabulky `personal_os_kv` a `personal_os_media`. `prisma db push` je proto chce smazat a bez `--accept-data-loss` skončí chybou (`scripts/auto-build.js` to jen zaloguje a build pokračuje). Nové tabulky se proto zakládají ručně aditivním SQL (`CREATE TABLE IF NOT EXISTS`), nikdy `--accept-data-loss`.
