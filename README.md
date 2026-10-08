# 🎓 Termínovka – Školní přehled testů, úkolů & rozvrh hodin

Moderní, přehledná a produkčně připravená webová aplikace pro třídní evidenci budoucích písemek, domácích úkolů, deadlinů a společných akcí. Propojeno s inteligentním ověřováním školního rozvrhu hodin a živým exportem do kalendářů (Apple Kalendář, Google Kalendář, Outlook).

---

## ✨ Klíčové funkce

1. **Role & Zabezpečení:**
   - **Návštěvníci / Spolužáci:** Mohou si přehledně procházet termíny na PC i mobilu, filtrovat podle svých studijních skupin a jedním kliknutím si přidat odběr do kalendáře v mobilu (iCal).
   - **Editoři:** Mohou vytvářet a spravovat termíny písemek a úkolů.
   - **Admin (Správce třídy):** Může tvořit a spravovat účty editorů (spolužáků), upravovat týdenní rozvrh hodin, předměty a skupiny.

2. **Chytré propojení s rozvrhem hodin (Timetable Check):**
   - Při zadávání písemky/úkolu systém automaticky ověří, zda má daná skupina v vybraný den v rozvrhu příslušný předmět.
   - **Pokud předmět v daný den v rozvrhu není:** Formulář na to okamžitě upozorní a nepovolí událost uložit.
   - **Pokud předmět v rozvrhu je:** Systém automaticky nabídne a předvyplní konkrétní vyučovací hodinu a přesný čas (např. *2. hodina: 08:55 – 09:40, učebna 204*).
   - **Bez předmětu:** Pro exkurze, třídnické hodiny nebo ředitelská volna lze zvolit „Bez předmětu“ a zadat libovolný čas nebo celodenní událost bez vazby na rozvrh.

3. **Živý iCal kalendář (.ics & webcal subscription):**
   - Každý student si v interaktivním průvodci zvolí, do jakých skupin chodí (např. *Celá třída + Skupina 1 + Angličtina 1*).
   - Generuje živý synchronizovaný odkaz (`webcal://...`) pro okamžitý odběr v iPhone / Macu, Google Kalendáři na Androidu i stažení souboru `.ics`.
   - Všechny události obsahují přednastavená upozornění (12 hodin předem), přesné vyučovací hodiny, učebny i odkazy na zadání.

4. **Přehledné zobrazení bez AI-slop balastu:**
   - **Agenda / Seznam:** Chronologické seskupení podle dní, odpočet do termínu (*Dnes!*, *Zítra*, *Za 3 dny*), štítky předmětů a stav naléhavosti.
   - **Měsíční kalendář:** Přehledná měsíční mřížka s barevnými puntíky podle předmětů.
   - **Týdenní rozvrh:** Přehledná tabulka Po–Pá rozdělená na vyučovací hodiny 1–8 s možností filtrování dle skupin.
   - **Filtrování & Hledání:** Rychlé přepínače pro *Písemky*, *Úkoly*, *Deadliny*, *Ostatní*, fulltextové vyhledávání v zadání a filtr podle předmětů.

---

## 🚀 Rychlé spuštění (Lokální vývoj)

### Požadavky
- Node.js verze 18+ (doporučeno Node.js 20 nebo 22)
- npm

### 1. Klonování a instalace
```bash
cd terminovka
npm install
```

### 2. Inicializace SQLite databáze a seed ukázkových dat
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Spuštění vývojového serveru
```bash
npm run dev
```
Aplikace běží na: **`http://localhost:3000`**

Pro spuštění v produkčním režimu:
```bash
npm run build
npm start
```

---

## 🔑 Předpřipravené testovací účty

Databáze je po spuštění seedu předvyplněna následujícími účty:

| Role | E-mail | Heslo | Oprávnění |
|---|---|---|---|
| **Admin** | `admin@skola.cz` | `admin123` | Správa editorů, rozvrhu hodin, předmětů i událostí |
| **Editor** | `honza@skola.cz` | `heslo123` | Přidávání, úprava a mazání školních termínů |

*(V přihlašovacím dialogu jsou k dispozici i tlačítka pro rychlé vyplnění těchto údajů na jeden klik).*

---

## 🐳 Produkční nasazení přes Docker (Doporučeno)

Aplikace obsahuje optimalizovaný multi-stage `Dockerfile` i `docker-compose.yml`.

### Spuštění jedním příkazem:
```bash
docker compose up -d --build
```
Kontejner automaticky uchovává SQLite databázi v Docker volume `terminovka_data`.

---

## 📂 Struktura projektu

```text
terminovka/
├── prisma/
│   ├── schema.prisma         # Databázový model (User, Subject, Group, ScheduleSlot, Event)
│   └── seed.ts               # Seed skript s českými předměty, rozvrhem a vzorovými událostmi
├── src/
│   ├── app/
│   │   ├── api/              # REST API endpointy (events, timetable check, ical, auth, admin)
│   │   ├── layout.tsx        # Globální layout, metadata a Geist fonty
│   │   ├── page.tsx          # Hlavní stránka (Agenda, Kalendář, Rozvrh)
│   │   └── globals.css       # Tailwind CSS 4 konfigurace
│   ├── components/
│   │   ├── Navbar.tsx        # Hlavička s přepínačem záložek a stavem přihlášení
│   │   ├── EventCard.tsx     # Karta události s odpočtem a formátováním
│   │   ├── EventModal.tsx    # Formulář pro přidání/úpravu události s ověřením rozvrhu
│   │   ├── ICalModal.tsx     # Průvodce generováním odběru kalendáře pro skupiny
│   │   ├── TimetableGrid.tsx # Týdenní matice rozvrhu Po–Pá
│   │   ├── CalendarMonthView.tsx # Měsíční mřížka kalendáře
│   │   ├── AdminPanelModal.tsx # Administrační panel (správa editorů a rozvrhu)
│   │   └── LoginModal.tsx    # Přihlašovací okno
│   ├── lib/
│   │   ├── auth.ts           # JWT autentizace & cookie management (jose, bcryptjs)
│   │   ├── formatters.ts     # České formátování datumů a odpočtu
│   │   ├── ical.ts           # Generování RFC 5545 iCalendar streamu
│   │   ├── prisma.ts         # Prisma client singleton
│   │   └── timetable.ts      # Logika validace hodin proti rozvrhu
│   └── types/
│       └── index.ts          # TypeScript rozhraní
├── Dockerfile                # Produkční multi-stage Docker build
└── docker-compose.yml        # Docker compose konfigurace
```
