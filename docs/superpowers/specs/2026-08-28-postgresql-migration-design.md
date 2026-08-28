# SQLite to PostgreSQL — design

**Date:** 2026-08-28
**Status:** Approved

## Problem

The API stores everything in a single SQLite file, `backend/MenswearStore.Api/menswear.db`,
configured at `Program.cs:39` with `UseSqlite`. That is fine for local development
and is not currently broken, but it blocks putting the shop online:

1. **The file disappears on deploy.** Azure App Service, Render, Railway and any
   Docker host give the app a fresh disk on each redeploy. Orders and accounts
   would be wiped.
2. **One writer at a time.** SQLite locks the whole file for writes. Two
   simultaneous checkouts mean one waits, and under load the API returns
   `SQLITE_BUSY`.
3. **`HasPrecision(10, 2)` is silently ignored.** SQLite has no decimal type, so
   the five money columns declared in `ApplicationDbContext.OnModelCreating` are
   stored as text. Reading the database confirms it: prices come back as `'69.0'`
   and `'1233.0'`. Nothing depends on this today because the only `Sum` in the
   codebase (`OrdersController.cs:81`) runs in memory, but any future
   database-side sort or report on price would be wrong.

## Goal

Move the API to PostgreSQL, running locally in Docker, with no change to the
frontend, the API contract, or the entity model.

## Non-goals

- Choosing or provisioning a production host. The connection string is
  overridable by environment variable, so that decision stays open.
- Keeping SQLite working as a second provider. EF Core needs a separate
  migrations folder per provider, which doubles the work on every future schema
  change. This is a one-way switch.
- Rewriting the product search. See "Decisions" below.
- The hardcoded `Jwt:Key` in both appsettings files. Real problem, separate job.

## Starting state

The current database holds almost nothing worth preserving:

| Table              | Rows | Notes                                                        |
|--------------------|-----:|--------------------------------------------------------------|
| Orders, OrderItems |    0 | nothing to preserve                                           |
| AspNetUsers        |    2 | both seeded (`admin@menswear.local`, `customer@menswear.local`) |
| Products           |    5 | 4 seeded, plus a test product `Satesto` at price 1233         |
| Categories         |   11 | 9 seeded, plus `kurtka` and `sdasfsdcsc`                      |
| Colors             |   10 | from an older seed version; hex codes differ from `DataSeeder` |
| AppSettings        |    7 | all seeded, toggles changed by hand                           |

`Program.cs:119-124` runs `MigrateAsync()` then `SeedAsync()` on every startup,
so an empty database rebuilds itself. **Decision: start clean and let the seeder
run.** The test rows (`Satesto`, `sdasfsdcsc`, `kurtka`) are discarded.

One visible consequence: colours are recreated with the values currently in
`DataSeeder`, so White becomes `#ffffff` rather than the `#f6f4ee` in the old
database, and Sky / Olive / Charcoal / Sand / Forest are not recreated. This is
accepted.

## Scope

New files:

- `docker-compose.yml` (repo root)

Changed files:

- `backend/MenswearStore.Api/MenswearStore.Api.csproj` — swap the EF provider package
- `backend/MenswearStore.Api/Program.cs` — one line, `UseSqlite` to `UseNpgsql`
- `backend/MenswearStore.Api/appsettings.json` — connection string
- `backend/MenswearStore.Api/appsettings.Development.json` — connection string
- `README.md` — how to start the database

Deleted and regenerated:

- `backend/MenswearStore.Api/Migrations/` — see "Migrations" below

Untouched: every entity, every controller, every DTO, the whole frontend.

## Design

### The container

`docker-compose.yml` runs `postgres:17` with database, user and password all
`menswear` / `menswear_dev`.

Two deliberate choices:

1. **Host port 5433, not 5432.** Avoids a clash if PostgreSQL is ever installed
   on Windows directly.
2. **Named volume `menswear-pgdata`.** Data survives `docker compose down` and
   container restarts. A deliberate wipe is `docker compose down -v`.

### Connection string and secrets

The development connection string is:

```
Host=localhost;Port=5433;Database=menswear;Username=menswear;Password=menswear_dev
```

It is committed. The password guards a throwaway local container that listens
only on localhost, so it is not a secret. Production supplies the environment
variable `ConnectionStrings__DefaultConnection`, which ASP.NET Core configuration
overlays on top of the file value with no code change.

### Migrations

The three existing migrations declare SQLite `TEXT` and `INTEGER` column types
and cannot run on PostgreSQL. Because no deployed database exists anywhere, the
`Migrations/` folder is deleted and a single `InitialCreate` is scaffolded
against Npgsql.

This is safe **only** because there is no live database to upgrade. Once the shop
is deployed, migrations must be added, never regenerated.

### What the move fixes at no cost

- `HasPrecision(10, 2)` starts taking effect. The five money columns become real
  `numeric(10,2)` instead of text.
- Every `DateTime` in the codebase is already `DateTime.UtcNow` — all 14 usages
  were checked, and there is no `DateTime.Now` anywhere. Npgsql's strict
  `timestamp with time zone` therefore needs no code changes.
- The `__EFMigrationsLock` table, a SQLite-only workaround, disappears.

### Decisions

**Product search is left as it is.** `ProductsController.cs:40-43` uses
`.ToLower().Contains(term)`. Switching to `EF.Functions.ILike` would let the
query use an index, but `ILike` requires building the `%{term}%` pattern by hand,
and an unescaped `%` typed by a shopper would then match every product. The
current form translates to correct PostgreSQL and EF Core escapes the wildcards.
With 5 products the index gain is imaginary. Revisit when the catalogue is large.

The same applies to `ColorsController.cs:92`.

## Verification

1. `docker compose up -d`; confirm the container reports healthy.
2. Run the API; confirm `MigrateAsync()` and `SeedAsync()` build the schema on an
   empty database with no errors.
3. Query PostgreSQL directly and confirm 9 categories, 5 colours, 4 products,
   2 users, 7 settings — and that `Products.Price` has type `numeric`, not text.
4. Start the frontend, load the shop, log in as admin, and place a test order so
   a real write path runs end to end.
5. Screenshot the working shop.

## Rollback

`menswear.db` is gitignored, is not tracked, and is not deleted by this work.
Reverting `Program.cs` and the `.csproj` restores the current state exactly.
