# 🚀 Návod na ostré nasazení (Production Deployment Guide) – Termínovka

Tento dokument popisuje, jak aplikaci **Termínovka** nasadit a provozovat jako ostrou veřejnou verzi dostupnou na internetu (např. na vlastní doméně či subdoméně `terminovka.cz` / `terminovka.plojharsim.cz`).

---

## ⚡ Rychlý přehled možností nasazení

| Platforma | Náročnost | Cena | Vhodné pro |
| :--- | :--- | :--- | :--- |
| **1. Vlastní VPS (Ubuntu/Debian) + Docker** *(Doporučeno)* | Snadná | od ~80 Kč/měs (Hetzner / VPS zdarma Oracle) | Plná kontrola, stálá SQLite databáze bez poplatků |
| **2. Vlastní VPS s Node.js + PM2 + Nginx** | Střední | od ~80 Kč/měs | Pokud nechcete používat Docker |
| **3. Railway / Render / Fly.io** | Velmi snadná | Zdarma / pár $ | Jednoduché klikací nasazení z GitHubu |
| **4. Vercel** | Snadná | Zdarma | Nutno použít externí DB (Turso / Supabase / Neon), protože Vercel je serverless a nepodporuje zápis do lokálního souboru SQLite. |

---

## 🐳 Možnost 1: Nasazení přes Docker & Docker Compose (Nejjednodušší na VPS)

V projektu jsou již připraveny soubory `Dockerfile` a `docker-compose.yml`.

### Krok 1: Příprava na serveru
1. Připojte se na svůj linuxový server:
   ```bash
   ssh root@vas-server-ip
   ```
2. Naklonujte repozitář s projektem nebo nahrajte složku projektu:
   ```bash
   git clone <URL_VASEHO_REPOZITARE> terminovka
   cd terminovka
   ```
3. Vytvořte `.env` soubor s vlastním bezpečným klíčem:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *(Vygenerujte bezpečný `AUTH_SECRET`, např. příkazem `openssl rand -hex 32`)*

### Krok 2: Spuštění aplikace
Jediným příkazem Docker sestaví odlehčený produkční obraz a spustí aplikaci na portu 3000:
```bash
docker compose up -d --build
```
- Databáze SQLite se automaticky ukládá do Docker volume `terminovka_data`, takže se neztratí při žádné aktualizaci ani restartu serveru.

---

## 🖥️ Možnost 2: Klasické nasazení na VPS (Node.js + PM2 + Systemd)

Pokud na serveru provozujete Node.js přímo:

### 1. Příprava prostředí na serveru
```bash
# Instalace Node.js 20+ a PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 2. Instalace a sestavení projektu
```bash
cd /var/www/terminovka
npm ci
npm run build
```

### 3. Spuštění přes proces manager PM2
```bash
pm2 start npm --name "terminovka" -- start
pm2 save
pm2 startup
```
Aplikace poběží nepřetržitě na pozadí a automaticky se obnoví i po případném restartu serveru.

---

## 🌐 Nastavení domény, HTTPS a Nginx (Reverse Proxy)

Aby byla Termínovka dostupná veřejně na vaší doméně (např. `https://terminovka.mojedomena.cz`):

### 1. DNS záznam
V administraci vaší domény (např. Wedos, Forpsi, Cloudflare) přidejte **A záznam**:
- Název: `@` nebo `terminovka`
- Hodnota: `IP_ADRESA_VASEHO_SERVERU`

### 2. Nginx konfigurace na serveru
Vytvořte konfigurační soubor `/etc/nginx/sites-available/terminovka`:
```nginx
server {
    server_name terminovka.mojedomena.cz;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Aktivujte konfiguraci a restartujte Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/terminovka /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Zabezpečení HTTPS certifikátem zdarma (Let's Encrypt Certbot)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d terminovka.mojedomena.cz
```
Certbot automaticky nastaví SSL certifikát a přesměrování z HTTP na zabezpečené HTTPS s automatickým prodlužováním.

---

## ☁️ Možnost 3: Nasazení na Vercel (pokud preferujete cloud)

Pokud chcete aplikaci nasadit na Vercel:
1. Protože Vercel běží bezstavově (Serverless), lokální soubor `dev.db` by se při každém požadavku resetoval.
2. Pro Vercel doporučujeme zdarma službu **Turso** (distribuované SQLite přes libSQL):
   - Vytvořte DB na [turso.tech](https://turso.tech) (zdarma).
   - V `schema.prisma` nebo přes `@prisma/adapter-libsql` nastavíte URL z Tursa.
   - Propojíte GitHub repozitář s Vercel.com a do Environment Variables vložíte `DATABASE_URL` a `AUTH_SECRET`.
   - Vercel automaticky nasadí aplikaci při každém `git push`.

---

## 🔒 Bezpečnostní kontrolní seznam před zveřejněním (Checklist)

- [ ] **Změna hesla správce:** Po prvním spuštění se přihlaste na účet `plojharsim@gmail.com` a změňte si heslo na silné.
- [ ] **Bezpečný AUTH_SECRET:** Zkontrolujte, že v `.env` nemáte výchozí testovací klíč, ale dlouhý náhodný řetězec.
- [ ] **HTTPS:** Ověřte, že web běží přes zelený zámeček `https://`.
- [ ] **Záloha databáze:** Nastavte si jednoduchý cron pro zálohování souboru `dev.db` (nebo `prod.db`), např. jednou týdně do cloudu / e-mailu.
