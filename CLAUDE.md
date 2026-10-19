# CLAUDE.md – Termínovka

Komunikuj česky. Před větší změnou si přečti **`AI_HANDOFF.md`** (architektura, schéma, pravidla). `AGENTS.md` upozorňuje, že Next.js 16.4 má breaking changes – při nejistotě nahlédni do `node_modules/next/dist/docs/`.

## Projekt
Školní systém písemek, úkolů a rozvrhu pro třídu 1.B (SSPŠ). Produkce: https://terminovka.plojharsim.cz (Vercel `plojharsim/terminovka`).
Stack: Next.js 16.4 (App Router, Turbopack, TS), Tailwind v4, Prisma 6.19 (Postgres/Neon), Vercel Blob, vlastní JWT (`jose` + `bcryptjs`).

## Příkazy
- `npm run dev` – vývoj (čte `.env.local`, **pozor: ukazuje na produkční DB**)
- `npx tsc --noEmit` – rychlá kontrola typů (preferuj před plným buildem)
- `npm run lint` – ESLint
- `npm run build` – plný build (spouští `prisma db push` přes `scripts/auto-build.js`!)
- Nasazení: jen na výslovné přání – GitHub Desktop (push do `main`) nebo `npx vercel --prod --yes`

## KRITICKÁ pravidla
1. **Dev prostředí = produkční DB.** Žádné mazání/reset dat, žádné `migrate reset`, `--force-reset`, `--accept-data-loss`, `db seed`. Schéma jen aditivně přes `npx prisma db push` a vždy nejdřív ukaž změnu uživateli. (Tyto příkazy jsou i zakázané v `.claude/settings.json`.)
2. **Data/časové zóny:** používej `toLocalDateString` a `getEventDateString` ze `src/lib/formatters.ts`, nikdy `.toISOString().split("T")[0]`.
3. **Opakované události (`recurringId`):** série se v `computeEventCounts` počítá jednou; mazání má režimy `single` / `following` / `all`.
4. **Rozvrh:** počet hodin za den = `new Set(daySlots.map(s => s.period)).size`; `TEST` jen v den výuky předmětu (`/api/timetable/check`, sudý/lichý týden), úkoly a ostatní kdykoliv.
5. Přílohy: soubor do 50 MB (Vercel Blob) nebo odkaz na Microsoft Teams.
6. Do repozitáře ani chatu nepiš hesla, tokeny ani obsah `.env*`. `terminovka_backup.json` nečti (reálná data spolužáků) a nemaž.

## Styl práce
- Malé, cílené změny; drž styl okolního kódu (české UI texty, Tailwind, barvy `#0D0F26` / `#131738` / `#DDA300`).
- Po úpravě ověř `npx tsc --noEmit` (čistý) a lint jen na změněných souborech (`npx eslint <soubor>`; celý projekt má ~50 starých chyb, hlavně `no-explicit-any`); UI změny ověř v prohlížeči (dev server).
- Commity a push jen na vyžádání; uživatel používá GitHub Desktop, preferuje stručné shrnutí změn.
