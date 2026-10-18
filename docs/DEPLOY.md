# Deploy SOFIO to a Hetzner server

The whole shop runs on one small server with Docker:

- **web**: Caddy. It serves the React site, sends `/api` and `/uploads` to the API, and gets the HTTPS certificate by itself.
- **api**: the .NET API.
- **db**: PostgreSQL 17.
- **backup**: once a day it saves the database and the uploaded images to `~/E-Commerce/backups` and keeps 14 days.

You need about 30–45 minutes. Do the steps in order.

---

## 1. Things to have ready

1. **A domain name**, for example `sofio.ge`. You can buy one from any registrar.
2. **A Gmail App Password**, if you want the order emails (see the Email section in `README.md`).
3. The deploy files must be on GitHub in the `main` branch. Merge this branch and push it first.

## 2. Make an SSH key on your PC (once)

An SSH key lets you log in to the server without a password. Open PowerShell:

```powershell
ssh-keygen -t ed25519
```

Press Enter for every question. Then show the public key and copy the whole line:

```powershell
Get-Content $HOME\.ssh\id_ed25519.pub
```

## 3. Rent the server

1. Create an account at <https://console.hetzner.com> (you need to add a payment method yourself).
2. Make a new project, then click **Add Server**:
   - **Location**: Falkenstein, Nuremberg or Helsinki (all in Europe).
   - **Image**: Ubuntu 24.04.
   - **Type**: **CX23** (Cost-Optimized, 2 CPU, 4 GB RAM), or **CAX11** (Arm64, same size). Both work. Do **not** pick the CPX line, which costs about 4× more for the same RAM since the 2026 price rises.
   - **SSH key**: paste the line you copied in step 2.
   - **Backups**: turn it on (about +20% of the price). Hetzner then keeps a full copy of the server every day. It's cheap insurance.
3. Click **Create**. Copy the server's **IPv4 address**, for example `203.0.113.10`.

## 4. Point your domain to the server

In your domain registrar's DNS settings, add:

| Type | Name | Value |
|---|---|---|
| A | `@` | your server IP |
| CNAME | `www` | `@` (or your domain) |

If a row with the same Type and Name already exists (for example an old Shopify `www` CNAME), **edit** that row instead of adding a new one. Don't touch the `NS` and `SOA` rows.

It can take from a few minutes up to a few hours to work. Check it from PowerShell:

```powershell
nslookup yourdomain.ge
```

When it shows your server IP, the domain is ready.

## 5. Log in to the server

```powershell
ssh root@203.0.113.10
```

Type `yes` the first time. Every command from now on runs **on the server**.

## 6. Install Docker and a firewall

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

## 7. Get the code

```bash
cd ~
git clone https://github.com/DemeeK6/E-Commerce.git
cd E-Commerce
```

If the repository is **private**, GitHub asks for a username and password. For the password, use a **Personal Access Token**. Make one at GitHub → Settings → Developer settings → Fine-grained tokens, with read-only access to this one repository.

## 8. Fill in the settings

```bash
cp deploy/env.example .env
openssl rand -hex 24   # copy this into POSTGRES_PASSWORD
openssl rand -hex 32   # copy this into JWT_KEY
nano .env
```

Fill in every line:

- `DOMAIN`: your domain, for example `sofio.ge`. No `https://`.
- `POSTGRES_PASSWORD` and `JWT_KEY`: the two random values from above.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: your admin login. Use a **strong** password.
- `EMAIL_FROM`, `EMAIL_APP_PASSWORD`, `EMAIL_ADMIN`: your Gmail details. Leave them empty to skip emails for now.

Save with **Ctrl+O**, press Enter, then exit with **Ctrl+X**.

> The admin account is created only on the **first** start. If you change `ADMIN_PASSWORD` later, it does not change the password. Change it in the shop instead.

## 9. Start the shop

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The first build takes about 3–5 minutes. Then check it:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

Press **Ctrl+C** to stop watching the logs. Now open `https://yourdomain.ge`. The HTTPS lock is set up automatically.

Log in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

> The first start fills the shop with the demo products, the same as on your PC. Delete the ones you don't want in the admin panel.

---

## Update the shop after you change code

On your PC, push to `main`. Then on the server:

```bash
cd ~/E-Commerce
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Database changes (migrations) run automatically when the API starts. Products, orders and images are kept.

## Backups

- **Daily, on the server**: `~/E-Commerce/backups` holds `db_*.dump` (the database) and `uploads_*.tar.gz` (the images).
- **Copy them to your PC** from time to time. Run this in PowerShell on your PC:

  ```powershell
  scp -r root@203.0.113.10:~/E-Commerce/backups .\sofio-backups
  ```

- **Hetzner Backups** (step 3) keep a copy of the whole server, too.

### Restore the database from a backup

```bash
cd ~/E-Commerce
docker compose -f docker-compose.prod.yml stop api
docker compose -f docker-compose.prod.yml exec -T db pg_restore -U menswear -d menswear --clean --if-exists < backups/db_YYYY-MM-DD_HHMM.dump
docker compose -f docker-compose.prod.yml start api
```

## Useful commands

| What | Command |
|---|---|
| See running parts | `docker compose -f docker-compose.prod.yml ps` |
| API logs | `docker compose -f docker-compose.prod.yml logs --tail 100 api` |
| Restart everything | `docker compose -f docker-compose.prod.yml restart` |
| Stop the shop | `docker compose -f docker-compose.prod.yml down` |
| Free disk space | `docker system prune -f` |

Never run `down -v`. The `-v` deletes the database and all the images.

## If something goes wrong

- **The site doesn't open or shows a certificate error**: the domain probably doesn't point to the server yet (step 4). Check with `docker compose -f docker-compose.prod.yml logs web`.
- **The API keeps restarting**: run `logs api`. Usually a value in `.env` is missing.
- **Emails don't arrive**: check `EMAIL_FROM` and `EMAIL_APP_PASSWORD`, then run `docker compose -f docker-compose.prod.yml up -d` to apply the change.
