# PostgreSQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `MenswearStore.Api` from a SQLite file to PostgreSQL running in Docker, with no change to the frontend, the API contract, or the entity model.

**Architecture:** A `postgres:17` container defined in `docker-compose.yml` at the repo root replaces the `menswear.db` file. The EF Core provider package is swapped from Sqlite to Npgsql, `Program.cs` calls `UseNpgsql` instead of `UseSqlite`, and the three SQLite-typed migrations are deleted and rescaffolded as a single `InitialCreate`. Because `Program.cs:119-124` runs `MigrateAsync()` then `SeedAsync()` on startup, the empty database rebuilds itself on first run.

**Tech Stack:** .NET 10, EF Core 10.0.3, `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3, PostgreSQL 17, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-28-postgresql-migration-design.md`

## Global Constraints

- **There is no test project in this solution.** `MenswearStore.sln` contains exactly one project, `MenswearStore.Api`. The frontend has no test runner (`package.json` scripts are only `dev`, `build`, `preview`). **Do not create a test project** — it is outside the spec's scope. Every task below is verified with real runnable commands and their expected output instead.
- Package versions must be exactly `10.0.3` for both EF Core and Npgsql, matching the existing `Microsoft.EntityFrameworkCore.Design` and `Microsoft.EntityFrameworkCore.Tools` pins.
- Host port for PostgreSQL is **5433**, not 5432, to avoid clashing with a directly installed PostgreSQL.
- Development connection string, used verbatim in both appsettings files:
  `Host=localhost;Port=5433;Database=menswear;Username=menswear;Password=menswear_dev`
- **Do not delete `backend/MenswearStore.Api/menswear.db`** or any `pre-*-backup.db` file. They are gitignored, untracked, and are the rollback path.
- Do not modify any entity, controller, DTO, or anything under `frontend/`.
- Do not change `ProductsController.cs:40-43` or `ColorsController.cs:92`. The spec deliberately keeps `.ToLower().Contains(...)`; see the spec's "Decisions" section for why.
- EF Core table and column names are PascalCase, so every raw SQL query against PostgreSQL must double-quote identifiers: `select * from "Colors"`, not `select * from Colors`.

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `docker-compose.yml` (new, repo root) | Defines the PostgreSQL 17 service, its port mapping, named volume and healthcheck. Nothing else. | 1 |
| `backend/MenswearStore.Api/Data/DataSeeder.cs` (modify) | Corrects the stale colour list in `GetOrSeedColorsAsync` so a fresh database gets the palette the shop actually uses. | 2 |
| `backend/MenswearStore.Api/MenswearStore.Api.csproj` (modify) | Swaps the EF provider package reference. | 3 |
| `backend/MenswearStore.Api/Program.cs` (modify, line 39) | `UseSqlite` becomes `UseNpgsql`. One line. | 3 |
| `backend/MenswearStore.Api/appsettings.json` (modify) | Connection string; overridden by env var when deployed. | 3 |
| `backend/MenswearStore.Api/appsettings.Development.json` (modify) | Local dev connection string. | 3 |
| `backend/MenswearStore.Api/Migrations/` (delete, rescaffold) | Single `InitialCreate` with PostgreSQL column types. | 3 |
| `README.md` (modify) | Removes the stale SQLite references and documents starting the container. | 4 |

---

### Task 1: The PostgreSQL container

Deliverable: `docker compose up -d` produces a healthy PostgreSQL you can connect to. Nothing in the API changes, so this task is reviewable and revertable entirely on its own.

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: a PostgreSQL server on `localhost:5433`, database `menswear`, user `menswear`, password `menswear_dev`. Task 3 connects to exactly this.

- [ ] **Step 1: Create the compose file**

Create `docker-compose.yml` at the repository root, the same folder as `MenswearStore.sln`:

~~~yaml
services:
  db:
    image: postgres:17
    container_name: menswear-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: menswear
      POSTGRES_USER: menswear
      POSTGRES_PASSWORD: menswear_dev
    ports:
      - "5433:5432"
    volumes:
      - menswear-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U menswear -d menswear"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  menswear-pgdata: {}
~~~

The named volume means data survives `docker compose down` and container restarts. A deliberate wipe is `docker compose down -v`.

- [ ] **Step 2: Start the container**

Run:

~~~bash
docker compose up -d
~~~

Expected: output ending in `Container menswear-db  Started`. If port 5433 is already taken the command fails with a bind error — stop whatever holds it rather than changing the port, because Task 3's connection string assumes 5433.

- [ ] **Step 3: Verify it reports healthy**

Run:

~~~bash
docker compose ps
~~~

Expected: one row for `menswear-db` with the `STATUS` column reading `Up ... (healthy)`. If it says `(health: starting)`, wait five seconds and run it again. If it says `(unhealthy)`, read `docker compose logs db` before continuing.

- [ ] **Step 4: Verify the database is reachable and empty**

Run:

~~~bash
docker compose exec -T db psql -U menswear -d menswear -c "\dt"
~~~

Expected: exactly `Did not find any relations.` — the database exists but has no tables yet. Task 3 creates them.

- [ ] **Step 5: Commit**

~~~bash
git add docker-compose.yml
git commit -m "feat(db): add PostgreSQL 17 container for local development"
~~~

---

### Task 2: Correct the seeder's stale colour list

Deliverable: a fresh database seeds the ten colours the shop actually uses.

This is verified here against a **throwaway SQLite file**, deliberately isolating "did the seeder change work" from "did the provider swap work". If both changes landed together and the colours came out wrong, you could not tell which one broke it.

**Files:**
- Modify: `backend/MenswearStore.Api/Data/DataSeeder.cs` — the `desired` array inside `GetOrSeedColorsAsync`

**Interfaces:**
- Consumes: nothing.
- Produces: `GetOrSeedColorsAsync` returns `Dictionary<string, Color>` keyed by `NameEn`, containing at least the keys `Black`, `White`, `Navy`, `Beige` and `Grey`. `SeedCatalogAsync` already indexes those five keys when building its demo products, so all five must remain present or seeding throws `KeyNotFoundException`.

- [ ] **Step 1: Replace the colour list**

In `backend/MenswearStore.Api/Data/DataSeeder.cs`, inside `GetOrSeedColorsAsync`, find this array:

~~~csharp
        var desired = new (string NameEn, string NameKa, string NameRu, string HexCode, int DisplayOrder)[]
        {
            ("Black", "შავი", "Чёрный", "#111111", 1),
            ("White", "თეთრი", "Белый", "#ffffff", 2),
            ("Navy", "მუქი ლურჯი", "Тёмно-синий", "#1a2b4c", 3),
            ("Beige", "კრემისფერი", "Бежевый", "#d9c7a8", 4),
            ("Grey", "ნაცრისფერი", "Серый", "#8a8a8a", 5),
        };
~~~

Replace it with the ten colours the shop actually uses, at the hex codes currently live:

~~~csharp
        var desired = new (string NameEn, string NameKa, string NameRu, string HexCode, int DisplayOrder)[]
        {
            ("White", "თეთრი", "Белый", "#f6f4ee", 1),
            ("Sky", "ცისფერი", "Голубой", "#9fc5df", 2),
            ("Olive", "ზეთისხილისფერი", "Оливковый", "#6f7355", 3),
            ("Black", "შავი", "Чёрный", "#111111", 4),
            ("Charcoal", "ნახშირისფერი", "Угольный", "#363636", 5),
            ("Navy", "მუქი ლურჯი", "Тёмно-синий", "#1f2a44", 6),
            ("Sand", "ქვიშისფერი", "Песочный", "#c8b99d", 7),
            ("Forest", "მუქი მწვანე", "Тёмно-зелёный", "#314536", 8),
            ("Beige", "კრემისფერი", "Бежевый", "#d9c7a8", 9),
            ("Grey", "ნაცრისფერი", "Серый", "#8a8a8a", 10),
        };
~~~

Three things to know about this edit:

1. `Beige` and `Grey` are kept even though no product in the current shop uses them, because `SeedCatalogAsync` looks up `colorsByName["Beige"]` and `colorsByName["Grey"]` when building its four demo products. Removing them breaks seeding.
2. `White` moves from `#ffffff` to `#f6f4ee`, and `Navy` from `#1a2b4c` to `#1f2a44`. These are the hand-tuned values the shop runs today.
3. Eight of these ten colours have `DisplayOrder = 0` in the current database, so the storefront's colour order is currently just insertion order. Assigning 1–10 makes it deterministic. This is an intentional small improvement.

The file must stay UTF-8 encoded. Do not let an editor rewrite the Georgian or Russian strings.

- [ ] **Step 2: Confirm it compiles**

Run:

~~~bash
dotnet build backend/MenswearStore.Api/MenswearStore.Api.csproj
~~~

Expected: `Build succeeded.` with `0 Error(s)`.

- [ ] **Step 3: Seed a throwaway SQLite database to prove the palette**

This still runs on SQLite — the provider swap is Task 3. Run the API against a scratch database file:

~~~bash
ConnectionStrings__DefaultConnection="Data Source=verify-colours.db" dotnet run --project backend/MenswearStore.Api/MenswearStore.Api.csproj --urls http://localhost:5199
~~~

Wait for the log line `Now listening on: http://localhost:5199`, then stop it with Ctrl+C. That is long enough for `MigrateAsync()` and `SeedAsync()` to finish.

- [ ] **Step 4: Verify the ten colours, then delete the scratch file**

Run:

~~~bash
cd backend/MenswearStore.Api && PYTHONIOENCODING=utf-8 python -c "import sqlite3;c=sqlite3.connect('verify-colours.db');[print(r) for r in c.execute('select DisplayOrder,NameEn,HexCode,NameKa,NameRu from Colors order by DisplayOrder')]"
~~~

Expected: exactly ten rows in this order, with no empty `NameKa` or `NameRu`:

~~~text
(1, 'White', '#f6f4ee', ...)
(2, 'Sky', '#9fc5df', ...)
(3, 'Olive', '#6f7355', ...)
(4, 'Black', '#111111', ...)
(5, 'Charcoal', '#363636', ...)
(6, 'Navy', '#1f2a44', ...)
(7, 'Sand', '#c8b99d', ...)
(8, 'Forest', '#314536', ...)
(9, 'Beige', '#d9c7a8', ...)
(10, 'Grey', '#8a8a8a', ...)
~~~

If a row is missing a translation, that colour is in `desired` but its Georgian or Russian string was mistyped. Fix it before committing.

Then delete the scratch database so it cannot be confused with the real one:

~~~bash
rm -f backend/MenswearStore.Api/verify-colours.db backend/MenswearStore.Api/verify-colours.db-shm backend/MenswearStore.Api/verify-colours.db-wal
~~~

- [ ] **Step 5: Commit**

~~~bash
git add backend/MenswearStore.Api/Data/DataSeeder.cs
git commit -m "fix(seed): seed the ten colours the shop actually uses"
~~~

---

### Task 3: Swap SQLite for Npgsql and rescaffold the migrations

Deliverable: the API runs on PostgreSQL and rebuilds its whole schema and seed data on an empty database. This is one atomic task because a half-swapped provider does not build.

**Files:**
- Modify: `backend/MenswearStore.Api/MenswearStore.Api.csproj:16`
- Modify: `backend/MenswearStore.Api/Program.cs:39`
- Modify: `backend/MenswearStore.Api/appsettings.json`
- Modify: `backend/MenswearStore.Api/appsettings.Development.json`
- Delete then rescaffold: `backend/MenswearStore.Api/Migrations/`

**Interfaces:**
- Consumes: the PostgreSQL server from Task 1 on `localhost:5433`; the corrected colour list from Task 2.
- Produces: a working PostgreSQL-backed API. No later task depends on new code symbols.

- [ ] **Step 1: Swap the provider package**

Run both commands:

~~~bash
dotnet remove backend/MenswearStore.Api/MenswearStore.Api.csproj package Microsoft.EntityFrameworkCore.Sqlite
~~~

~~~bash
dotnet add backend/MenswearStore.Api/MenswearStore.Api.csproj package Npgsql.EntityFrameworkCore.PostgreSQL --version 10.0.3
~~~

Expected afterwards: `MenswearStore.Api.csproj` contains `<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.3" />` and no longer mentions `Microsoft.EntityFrameworkCore.Sqlite`. Leave `Microsoft.EntityFrameworkCore.Design` and `Microsoft.EntityFrameworkCore.Tools` untouched.

- [ ] **Step 2: Point the DbContext at Npgsql**

In `backend/MenswearStore.Api/Program.cs`, change line 39 from:

~~~csharp
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
~~~

to:

~~~csharp
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
~~~

The `using Microsoft.EntityFrameworkCore;` already at the top of the file covers `UseNpgsql`. No new `using` is needed.

- [ ] **Step 3: Update both connection strings**

In `backend/MenswearStore.Api/appsettings.json` and `backend/MenswearStore.Api/appsettings.Development.json`, replace:

~~~json
    "DefaultConnection": "Data Source=menswear.db"
~~~

with:

~~~json
    "DefaultConnection": "Host=localhost;Port=5433;Database=menswear;Username=menswear;Password=menswear_dev"
~~~

The password guards a throwaway container listening only on localhost, so committing it is fine. Production sets the environment variable `ConnectionStrings__DefaultConnection`, which ASP.NET Core overlays on top of the file value with no code change.

- [ ] **Step 4: Delete the SQLite migrations**

The three existing migrations declare SQLite `TEXT` and `INTEGER` column types and cannot run on PostgreSQL. Because no deployed database exists anywhere, they are rescaffolded rather than added to.

~~~bash
rm -rf backend/MenswearStore.Api/Migrations
~~~

**This is safe only right now.** Once the shop is deployed, migrations must be added, never regenerated.

- [ ] **Step 5: Confirm it compiles before scaffolding**

~~~bash
dotnet build backend/MenswearStore.Api/MenswearStore.Api.csproj
~~~

Expected: `Build succeeded.` with `0 Error(s)`. Scaffolding runs the app's host builder, so a broken build produces a confusing EF error instead of a plain compiler one.

- [ ] **Step 6: Scaffold the PostgreSQL migration**

~~~bash
dotnet tool restore
~~~

~~~bash
dotnet tool run dotnet-ef migrations add InitialCreate --project backend/MenswearStore.Api/MenswearStore.Api.csproj --startup-project backend/MenswearStore.Api/MenswearStore.Api.csproj --output-dir Migrations
~~~

Expected: `Done. To undo this action, use 'ef migrations remove'`, and a new `Migrations/` folder holding `<timestamp>_InitialCreate.cs`, `<timestamp>_InitialCreate.Designer.cs` and `ApplicationDbContextModelSnapshot.cs`.

This command does not need a running database. It does execute `Program.cs` as far as `builder.Build()`, then stops, so the `MigrateAsync()` call further down does not run.

- [ ] **Step 7: Verify the migration is PostgreSQL-typed, not SQLite-typed**

~~~bash
grep -o 'type: "[a-z0-9(), ]*"' backend/MenswearStore.Api/Migrations/*_InitialCreate.cs | sort -u | head -20
~~~

Expected: lowercase PostgreSQL types such as `text`, `integer`, `boolean`, `numeric(10,2)`, `timestamp with time zone`. If you see uppercase `TEXT` or `INTEGER`, the old migrations were not deleted or the provider swap did not take — stop and fix it.

Then confirm the money columns specifically:

~~~bash
grep -c "numeric(10,2)" backend/MenswearStore.Api/Migrations/*_InitialCreate.cs
~~~

Expected: `5` — `Products.Price`, `Products.DiscountPrice`, `CartItems.UnitPrice`, `Orders.Total`, `OrderItems.UnitPrice`. This is the `HasPrecision(10, 2)` that SQLite silently ignored.

- [ ] **Step 8: Run the API against the empty database**

Make sure the Task 1 container is up (`docker compose ps` shows healthy), then:

~~~bash
dotnet run --project backend/MenswearStore.Api/MenswearStore.Api.csproj
~~~

Expected: startup logs with no exception, ending at `Now listening on: https://localhost:7060`. Leave it running for Step 10; the migration and seed have already completed by the time that line prints.

If it throws `Npgsql.NpgsqlException: Connection refused`, the container is not running. If it throws `28P01: password authentication failed`, the connection string does not match `docker-compose.yml`.

- [ ] **Step 9: Verify the schema and seed data in PostgreSQL**

In a second terminal, check the row counts:

~~~bash
docker compose exec -T db psql -U menswear -d menswear -c "select 'categories' as t, count(*) from \"Categories\" union all select 'colors', count(*) from \"Colors\" union all select 'products', count(*) from \"Products\" union all select 'users', count(*) from \"AspNetUsers\" union all select 'settings', count(*) from \"AppSettings\" union all select 'orders', count(*) from \"Orders\";"
~~~

Expected exactly:

~~~text
     t      | count
------------+-------
 categories |     9
 colors     |    10
 products   |     4
 users      |     2
 settings   |     7
 orders     |     0
~~~

Then confirm the money columns are real numerics, which is the whole point of the move:

~~~bash
docker compose exec -T db psql -U menswear -d menswear -c "select table_name, column_name, data_type, numeric_precision, numeric_scale from information_schema.columns where column_name in ('Price','DiscountPrice','UnitPrice','Total') order by table_name, column_name;"
~~~

Expected: five rows, every `data_type` reading `numeric` with precision `10` and scale `2`. Not `text`.

Then confirm no colour renders untranslated in the Georgian or Russian storefront:

~~~bash
docker compose exec -T db psql -U menswear -d menswear -c "select \"NameEn\" from \"Colors\" where \"NameKa\" is null or \"NameKa\" = '' or \"NameRu\" is null or \"NameRu\" = '';"
~~~

Expected: `(0 rows)`.

- [ ] **Step 10: Exercise a real write path end to end**

With the API still running, start the frontend in another terminal:

~~~bash
cd frontend && npm install && npm run dev
~~~

Then at `http://localhost:5173`:

1. Load the storefront and confirm four products appear with images.
2. Open a product and confirm the colour swatches show the shop's palette, with White as the soft `#f6f4ee` rather than pure white.
3. Log in as `admin@menswear.local` / `Admin123!` and confirm `/admin/products` lists the four products.
4. Add a product to the cart and complete checkout, so an `INSERT` into `Orders` and `OrderItems` actually runs.

Confirm the order reached PostgreSQL:

~~~bash
docker compose exec -T db psql -U menswear -d menswear -c "select \"Id\", \"Total\", \"CreatedAtUtc\" from \"Orders\";"
~~~

Expected: one row, with `Total` shown as a decimal such as `69.00` and `CreatedAtUtc` carrying a `+00` timezone offset. The offset confirms Npgsql accepted the `DateTime.UtcNow` values without a kind mismatch.

- [ ] **Step 11: Commit**

~~~bash
git add backend/MenswearStore.Api/MenswearStore.Api.csproj backend/MenswearStore.Api/Program.cs backend/MenswearStore.Api/appsettings.json backend/MenswearStore.Api/appsettings.Development.json backend/MenswearStore.Api/Migrations
git commit -m "feat(db): move the API from SQLite to PostgreSQL"
~~~

---

### Task 4: Update the README

Deliverable: the README describes PostgreSQL, so a fresh clone can start the project.

**Files:**
- Modify: `README.md` — lines 8, 28-35, 72, 102, 107

**Interfaces:**
- Consumes: nothing. Documentation only.
- Produces: nothing.

- [ ] **Step 1: Update the stack line**

Line 8, change:

~~~markdown
- Database: SQLite with Entity Framework Core migrations
~~~

to:

~~~markdown
- Database: PostgreSQL 17 with Entity Framework Core migrations
~~~

- [ ] **Step 2: Add a database section before "Run Backend"**

Insert this immediately before the `## Run Backend` heading:

~~~markdown
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
~~~

- [ ] **Step 3: Simplify the Run Backend block**

Replace the four-command block at lines 30-35 with:

~~~powershell
dotnet restore backend/MenswearStore.Api/MenswearStore.Api.csproj
dotnet run --project backend/MenswearStore.Api/MenswearStore.Api.csproj
~~~

The explicit `dotnet-ef database update` line is redundant — `Program.cs` already calls `MigrateAsync()` on startup, as the README itself notes at line 46. Keep that note.

- [ ] **Step 4: Update the entities line**

Line 72, change `SQLite entities for users, ...` to:

~~~markdown
- PostgreSQL entities for users, roles, products, categories, images, cart, orders, settings
~~~

- [ ] **Step 5: Update the deployment notes**

In "VPS Deployment Notes", change the connection string example to a PostgreSQL one:

~~~markdown
   - `ConnectionStrings__DefaultConnection=Host=<db-host>;Port=5432;Database=menswear;Username=<user>;Password=<password>`
~~~

And replace the SQLite backup step at line 107 with:

~~~markdown
6. Back up with `pg_dump` on a schedule, and copy the dump to object storage or another server.
~~~

- [ ] **Step 6: Verify no stale SQLite references remain**

~~~bash
grep -in "sqlite\|Data Source=" README.md
~~~

Expected: no output. Any match is a reference the previous steps missed.

- [ ] **Step 7: Commit**

~~~bash
git add README.md
git commit -m "docs: describe the PostgreSQL setup instead of SQLite"
~~~

---

## Done When

1. `docker compose up -d` gives a healthy `menswear-db`.
2. `dotnet run` builds the schema and seeds an empty PostgreSQL with no errors.
3. The five money columns are `numeric(10,2)`, not text.
4. All ten colours are present, each with a Georgian and a Russian name.
5. A checkout completed in the browser lands a row in `Orders`.
6. `grep -in "sqlite" README.md` returns nothing.
7. `backend/MenswearStore.Api/menswear.db` is still on disk, untouched, as the rollback path.
