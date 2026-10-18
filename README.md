# Atelier Menswear E-Commerce

Initial full-stack e-commerce application for a men-focused clothing store, prepared for future women and kids collections.

## Stack

- Backend: .NET 10, ASP.NET Core Web API, ASP.NET Core Identity, JWT auth
- Database: PostgreSQL 17 with Entity Framework Core migrations
- Frontend: React, TypeScript, React Router, Vite
- Authorization: Admin and Customer roles
- UI: responsive fashion storefront, admin dashboard, auth screens, cart, checkout placeholder

## Project Structure

```text
backend/MenswearStore.Api
  Controllers, Data, DTOs, Entities, Middleware, Services, Migrations

frontend
  src/components, src/context, src/i18n, src/layouts, src/pages, src/services, src/types
```

## Seeded Accounts

Development only. In production the admin comes from `.env` and no test customer is created - see [docs/DEPLOY.md](docs/DEPLOY.md).

- Admin: `admin@menswear.local` / `Admin123!`
- Customer: `customer@menswear.local` / `Customer123!`

## Run the Database

PostgreSQL runs in Docker. From the repository root:

```powershell
docker compose up -d
```

It listens on `localhost:5433`, not the default 5432, to avoid clashing with a
directly installed PostgreSQL. Data lives in the `menswear-pgdata` volume and
survives restarts and `docker compose down`.

To wipe the database and let the seeder rebuild it from scratch:

```powershell
docker compose down -v
docker compose up -d
```

## Run Backend

```powershell
dotnet restore backend/MenswearStore.Api/MenswearStore.Api.csproj
dotnet run --project backend/MenswearStore.Api/MenswearStore.Api.csproj --launch-profile https
```

The API runs from the launch profile at:

- `https://localhost:7060`
- `http://localhost:5126`

OpenAPI JSON is available in development at:

- `https://localhost:7060/openapi/v1.json`

The backend also applies migrations and seeds data on startup.

## Email

Order emails are sent over Gmail SMTP. Emails to the shop owner are in English;
emails to the customer are in the language they shopped in (English, Georgian or
Russian). An email address is required at checkout.

- **Cash order placed:** the shop owner gets "New order", the customer "We received
  your order"
- **Customer confirms a bank transfer:** the shop owner is told to check the balance,
  the customer gets "We received your order"
- **Shop owner marks a bank transfer paid:** the customer gets "Order confirmed"
- **Shop owner sets Shipped, Delivered or Cancelled:** the customer is told

The texts live in `backend/MenswearStore.Api/Services/OrderEmails.cs`.

Gmail rejects normal account passwords for SMTP, so this needs a 16-character **App
Password**, which in turn needs 2-Step Verification on the account:

1. Enable 2-Step Verification at <https://myaccount.google.com/security>
2. Create an App Password at <https://myaccount.google.com/apppasswords>

Put the address in `appsettings.Development.json`:

```json
"Email": {
  "Host": "smtp.gmail.com",
  "Port": 587,
  "FromAddress": "yourshop@gmail.com",
  "FromName": "SOFIO",
  "AdminAddress": ""
}
```

`AdminAddress` is where order notifications go; leave it blank to use `FromAddress`.

The password must **not** go in that file - it is committed. Store it locally instead:

```powershell
cd backend/MenswearStore.Api
dotnet user-secrets init
dotnet user-secrets set "Email:AppPassword" "your-16-char-app-password"
```

In production, supply it as the environment variable `Email__AppPassword`.

Until both `FromAddress` and the password are set, the application starts normally and
logs what it would have sent instead of sending it. A mail server that is down or
misconfigured is logged and never fails an order.

Gmail allows roughly 500 messages a day, and mail from a gmail.com address reaches
customer inboxes less reliably than a dedicated transactional service. Both are fine to
start with; neither is permanent.

## Run Frontend

Install Node.js 22 LTS or newer, then:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

- `http://localhost:5173`

Vite proxies `/api` to `https://localhost:7060`.

## Features Included

- Public homepage, men catalog, product details, cart, checkout placeholder
- Guest cart stored in `localStorage`
- Auth pages: login, register, reset password placeholder, Google login button placeholder
- JWT authentication against ASP.NET Core Identity
- Role-based admin protection
- Admin dashboard, products, product create/edit, categories, feature toggles
- PostgreSQL entities for users, roles, products, categories, images, cart, orders, settings
- Georgian, Russian, and English i18n files

## Feature Toggles

Seeded toggles:

- Men category: enabled
- Women category: disabled
- Kids category: disabled
- Google login: disabled
- Payments: disabled
- Discounts: enabled
- Product reviews: disabled

Admins can edit these from `/admin/settings`.

## Add a Migration

```powershell
dotnet tool restore
dotnet tool run dotnet-ef migrations add MigrationName --project backend/MenswearStore.Api/MenswearStore.Api.csproj --startup-project backend/MenswearStore.Api/MenswearStore.Api.csproj --output-dir Migrations
dotnet tool run dotnet-ef database update --project backend/MenswearStore.Api/MenswearStore.Api.csproj --startup-project backend/MenswearStore.Api/MenswearStore.Api.csproj
```

## VPS Deployment Notes

1. Build the frontend with `npm run build` and serve `frontend/dist` with Nginx.
2. Publish the backend with `dotnet publish -c Release`.
3. Run the API behind Nginx as a `systemd` service.
4. Set production configuration with environment variables:
   - `ConnectionStrings__DefaultConnection=Host=<db-host>;Port=5432;Database=menswear;Username=<user>;Password=<password>`
   - `Jwt__Key=<long-random-secret>`
   - `Jwt__Issuer=MenswearStore.Api`
   - `Jwt__Audience=MenswearStore.Client`
5. Use HTTPS through Certbot/Let’s Encrypt.
6. Back up with `pg_dump` on a schedule, and copy the dump to object storage or another server.

## Next Steps

- Add real Google OAuth validation before enabling the toggle.
- Add Stripe or another payment provider behind the checkout placeholder.
- Move logged-in carts from localStorage to the prepared cart API flow.
- Add product image uploads to local disk or object storage.
