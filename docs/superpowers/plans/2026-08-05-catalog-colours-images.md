# Catalog, Colours and Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Translate category names, add a Men/Women/Kids drill-down, replace free-text product colours with a managed colour list, allow many images per product with a gallery that switches by colour, show 8 newest products on the home page, and badge new orders in red.

**Covers list items:** 5, 8, 9, 10, 12, 18.

**Architecture:** One EF migration carries every schema change so the database is touched once. Colours move from per-product free text (`ProductColor.Name`/`HexCode`) to a global `Color` table that `ProductColor` references. `ProductImage` gains a nullable `ColorId`, which is what lets the gallery switch. The frontend resolves all translated names through a single `localizedName()` helper so the English-fallback rule lives in one place.

**Tech Stack:** .NET 10, EF Core 10 (SQLite), React 19, TypeScript 5.9, Vite 7, react-router-dom 7, lucide-react.

## Global Constraints

- **No new dependencies**, backend or frontend.
- **One migration only**, named `CatalogTranslationsAndColours`. Do not create a second.
- **The existing database has real data.** Every schema change must preserve it. Data backfill runs as raw SQL inside the migration, hand-added to the generated file.
- **All three locale files must stay in sync.** `frontend/src/context/I18nContext.tsx:7` declares `type Dictionary = typeof en`; a key in `en.json` missing from `ka.json` or `ru.json` is a compile error.
- **Translated names fall back to English when blank** — never show an empty string. This rule lives only in `localizedName()`.
- Colours in `frontend/src/styles/global.css` come from the custom properties at lines 5-11 (`--ink`, `--muted`, `--paper`, `--line`, `--accent`, `--pine`) where a token fits; literal hex matching the file's existing convention is acceptable otherwise.
- Append new CSS at the **end** of `global.css`.
- **No test framework exists** (no vitest/jest in `frontend/package.json`). Do not add one. Gates: `dotnet build` from `backend/MenswearStore.Api`, `npm run build` from `frontend`, plus browser verification.
- Backend commands run from `C:\Git\E-Commerce\backend\MenswearStore.Api`; frontend commands from `C:\Git\E-Commerce\frontend`. `dotnet ef` is available after `dotnet tool restore` (already run).
- `git add` only the files a task changes. Never `git add -A`.

---

### Task 1: Schema and migration

**Files:**
- Modify: `backend/MenswearStore.Api/Entities/Category.cs`
- Modify: `backend/MenswearStore.Api/Entities/ProductColor.cs`
- Modify: `backend/MenswearStore.Api/Entities/ProductImage.cs`
- Create: `backend/MenswearStore.Api/Entities/Color.cs`
- Modify: `backend/MenswearStore.Api/Data/ApplicationDbContext.cs`
- Create: `backend/MenswearStore.Api/Migrations/<timestamp>_CatalogTranslationsAndColours.cs` (generated, then hand-edited)

**Interfaces produced:**
- `Color { int Id; string NameEn; string NameKa; string NameRu; string HexCode; int DisplayOrder; bool IsEnabled; ICollection<ProductColor> ProductColors; ICollection<ProductImage> Images; }`
- `Category` gains `NameEn` (renamed from `Name`), `NameKa`, `NameRu`
- `ProductColor { int Id; int ProductId; Product? Product; int ColorId; Color? Color; }` — `Name` and `HexCode` are **removed**
- `ProductImage` gains `int? ColorId` and `Color? Color`
- `ApplicationDbContext` gains `DbSet<Color> Colors`

- [ ] **Step 1: Entity changes**

`Color.cs`:

```csharp
namespace MenswearStore.Api.Entities;

public class Color
{
    public int Id { get; set; }
    public string NameEn { get; set; } = string.Empty;
    public string NameKa { get; set; } = string.Empty;
    public string NameRu { get; set; } = string.Empty;
    public string HexCode { get; set; } = "#111111";
    public int DisplayOrder { get; set; }
    public bool IsEnabled { get; set; } = true;
    public ICollection<ProductColor> ProductColors { get; set; } = new List<ProductColor>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
}
```

In `Category.cs`, replace `public string Name { get; set; } = string.Empty;` with:

```csharp
    public string NameEn { get; set; } = string.Empty;
    public string NameKa { get; set; } = string.Empty;
    public string NameRu { get; set; } = string.Empty;
```

In `ProductColor.cs`, replace the `Name` and `HexCode` properties with:

```csharp
    public int ColorId { get; set; }
    public Color? Color { get; set; }
```

In `ProductImage.cs`, add:

```csharp
    public int? ColorId { get; set; }
    public Color? Color { get; set; }
```

In `ApplicationDbContext.cs`, add `public DbSet<Color> Colors => Set<Color>();` alongside the other DbSets, and in `OnModelCreating` add:

```csharp
        builder.Entity<ProductImage>()
            .HasOne(image => image.Color)
            .WithMany(color => color.Images)
            .HasForeignKey(image => image.ColorId)
            .OnDelete(DeleteBehavior.SetNull);
```

`OnDelete(SetNull)` matters: deleting a colour must orphan its images, not delete them.

- [ ] **Step 2: Generate the migration**

Run: `dotnet ef migrations add CatalogTranslationsAndColours`
Expected: a new file in `Migrations/`. **Do not apply it yet.**

- [ ] **Step 3: Hand-edit the migration to preserve data**

This is the critical step. The generated migration will rename/add/drop columns but will silently destroy the existing colour data. Open the generated `Up(MigrationBuilder migrationBuilder)` and arrange it in exactly this order:

1. `RenameColumn` on `Categories`: `Name` → `NameEn` (if EF generated a Drop+Add instead of a Rename, replace it with `migrationBuilder.RenameColumn(name: "Name", table: "Categories", newName: "NameEn");`) — a Drop+Add would erase every category name.
2. `AddColumn` for `Categories.NameKa` and `Categories.NameRu`, both `nullable: false, defaultValue: ""`.
3. `CreateTable` for `Colors`.
4. `AddColumn` for `ProductColors.ColorId` (`nullable: false, defaultValue: 0`) and `ProductImages.ColorId` (`nullable: true`).
5. **Insert this raw SQL** after the AddColumn calls and **before** any `DropColumn` on `ProductColors`:

```csharp
        migrationBuilder.Sql(@"
            INSERT INTO Colors (NameEn, NameKa, NameRu, HexCode, DisplayOrder, IsEnabled)
            SELECT DISTINCT Name, '', '', HexCode, 0, 1
            FROM ProductColors
            WHERE Name IS NOT NULL AND TRIM(Name) <> '';");

        migrationBuilder.Sql(@"
            UPDATE ProductColors
            SET ColorId = COALESCE((
                SELECT c.Id FROM Colors c
                WHERE c.NameEn = ProductColors.Name AND c.HexCode = ProductColors.HexCode
            ), 0);");

        migrationBuilder.Sql(@"
            DELETE FROM ProductColors WHERE ColorId = 0;");

        migrationBuilder.Sql(@"
            UPDATE Categories SET NameKa = 'პერანგები', NameRu = 'Рубашки' WHERE Slug = 'shirts';
            UPDATE Categories SET NameKa = 'ქურთუკები', NameRu = 'Куртки' WHERE Slug = 'jackets';
            UPDATE Categories SET NameKa = 'შარვლები', NameRu = 'Брюки' WHERE Slug = 'trousers';");
```

The `DELETE ... WHERE ColorId = 0` line drops product-colour rows whose colour could not be matched. That only fires for rows with a blank name, which the INSERT deliberately skipped.

6. `DropColumn` for `ProductColors.Name` and `ProductColors.HexCode`, **last**.
7. `CreateIndex` on `ProductColors.ColorId` and `ProductImages.ColorId`, plus the foreign keys.

In `Down(...)`, reverse the schema changes. The colour data cannot be perfectly restored; that is acceptable, but say so in your report.

- [ ] **Step 4: Back up the database, then apply**

The database file is git-ignored and holds real data. Before applying, copy it:

```bash
cp backend/MenswearStore.Api/*.db backend/MenswearStore.Api/pre-colours-backup.db
```

(If the `.db` file is elsewhere, find it via the connection string in `appsettings.json` and back up that path instead. Report the path you used.)

Then run: `dotnet ef database update`
Expected: applies with no error.

- [ ] **Step 5: Verify the data survived**

Query the database and report the actual rows:

```bash
dotnet ef dbcontext info
```

Then confirm, by whatever means works (a scratch `dotnet ef` command, `sqlite3`, or a throwaway console query): that `Categories` still holds every row it held before with `NameEn` populated; that `Colors` now holds one row per distinct old colour; and that every surviving `ProductColors` row has a non-zero `ColorId`. Report the counts.

If the counts show data loss, **stop and report BLOCKED** — do not proceed, and restore from the backup.

- [ ] **Step 6: Build and commit**

Run: `dotnet build` — expected: 0 errors.

```bash
git add backend/MenswearStore.Api/Entities/ backend/MenswearStore.Api/Data/ApplicationDbContext.cs backend/MenswearStore.Api/Migrations/
git commit -m "feat(backend): add category translations, colour table and image-colour link"
```

---

### Task 2: Backend DTOs, mappers, seeder and colours API

**Files:**
- Modify: `backend/MenswearStore.Api/DTOs/CategoryDtos.cs`
- Modify: `backend/MenswearStore.Api/DTOs/ProductDtos.cs`
- Create: `backend/MenswearStore.Api/DTOs/ColorDtos.cs`
- Modify: `backend/MenswearStore.Api/DTOs/MappingExtensions.cs`
- Modify: `backend/MenswearStore.Api/Controllers/CategoriesController.cs`
- Create: `backend/MenswearStore.Api/Controllers/ColorsController.cs`
- Modify: `backend/MenswearStore.Api/Controllers/ProductsController.cs`
- Modify: `backend/MenswearStore.Api/Data/DataSeeder.cs`

**Interfaces consumed:** the entities from Task 1.

**Interfaces produced** — the frontend in Tasks 4-8 depends on these exact shapes:

```csharp
public record CategoryDto(int Id, string NameEn, string NameKa, string NameRu, string Slug, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder);
public record UpsertCategoryRequest(string NameEn, string NameKa, string NameRu, string Slug, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder);

public record ColorDto(int Id, string NameEn, string NameKa, string NameRu, string HexCode, int DisplayOrder, bool IsEnabled);
public record UpsertColorRequest(string NameEn, string NameKa, string NameRu, string HexCode, int DisplayOrder, bool IsEnabled);

public record ProductColorDto(int Id, int ColorId, string NameEn, string NameKa, string NameRu, string HexCode);
public record ProductImageDto(int Id, string Url, string AltText, bool IsPrimary, int SortOrder, int? ColorId);
public record ProductColorInput(int ColorId);
public record ProductImageInput(string Url, string AltText, bool IsPrimary, int SortOrder, int? ColorId);
```

- [ ] **Step 1: DTOs**

Replace the contents of `CategoryDtos.cs` and add `ColorDtos.cs` per the shapes above. In `ProductDtos.cs`, replace `ProductImageDto`, `ProductColorDto`, `ProductColorInput` and `ProductImageInput` with the shapes above. `ProductDto` and `UpsertProductRequest` keep their existing field lists — only the nested record shapes change.

- [ ] **Step 2: Mappers**

In `MappingExtensions.cs`:

```csharp
    public static CategoryDto ToDto(this Category category) =>
        new(category.Id, category.NameEn, category.NameKa, category.NameRu, category.Slug,
            category.GenderTarget, category.IsEnabled, category.DisplayOrder);

    public static ColorDto ToDto(this Color color) =>
        new(color.Id, color.NameEn, color.NameKa, color.NameRu, color.HexCode, color.DisplayOrder, color.IsEnabled);
```

In the `Product` mapper, the colours projection becomes:

```csharp
            product.Colors.OrderBy(pc => pc.Id).Select(pc => new ProductColorDto(
                pc.Id, pc.ColorId,
                pc.Color?.NameEn ?? "", pc.Color?.NameKa ?? "", pc.Color?.NameRu ?? "",
                pc.Color?.HexCode ?? "#111111")).ToArray(),
```

and the images projection gains `image.ColorId` as its final argument.

**Critical:** `ProductsController` must `.Include()` the colour navigation, or every colour name comes back empty. Find every query that loads products with their colours and add `.ThenInclude(pc => pc.Color)` after the `Include` of `Colors`. Report each query you changed.

- [ ] **Step 3: CategoriesController**

Update `Apply(...)` to set the three names and keep the existing gender/slug/enabled/order behaviour. The `Get` action keeps its current gender-filter behaviour unchanged.

- [ ] **Step 4: ColorsController**

New controller at `api/colors`, modelled directly on `CategoriesController`:
- `GET` — all colours ordered by `DisplayOrder`; non-admins see only `IsEnabled`
- `POST`, `PUT {id:int}` — `[Authorize(Roles = "Admin")]`
- `DELETE {id:int}` — soft delete (`IsEnabled = false`), matching how `CategoriesController.Delete` behaves

- [ ] **Step 5: ProductsController colour writes**

Where the controller currently builds `ProductColor` rows from `ProductColorInput`, it must now set `ColorId` instead of `Name`/`HexCode`. Reject (400) any `ColorId` that does not exist in `Colors`.

- [ ] **Step 6: Seeder**

`DataSeeder.cs` currently creates three Men categories with `Name = ...`. Update to `NameEn`/`NameKa`/`NameRu`:
- Shirts / პერანგები / Рубашки
- Jackets / ქურთუკები / Куртки
- Trousers / შარვლები / Брюки

Add the same three for `GenderTarget.Women` and `GenderTarget.Kids`, with distinct slugs (`women-shirts`, `kids-shirts`, …) since `Slug` is uniquely indexed.

Seed a starter colour list: Black / შავი / Чёрный `#111111`, White / თეთრი / Белый `#ffffff`, Navy / მუქი ლურჯი / Тёмно-синий `#1a2b4c`, Beige / კრემისფერი / Бежевый `#d9c7a8`, Grey / ნაცრისფერი / Серый `#8a8a8a`.

Seeded products must reference seeded colours by `ColorId`.

**The seeder must stay idempotent** — match its existing guard pattern so re-running does not duplicate rows on a populated database.

- [ ] **Step 7: Build, verify, commit**

Run `dotnet build` (0 errors), then run the API and confirm `GET /api/colors` returns the seeded list and `GET /api/categories?gender=1` returns the Women categories. Report both responses.

```bash
git add backend/MenswearStore.Api/DTOs/ backend/MenswearStore.Api/Controllers/ backend/MenswearStore.Api/Data/DataSeeder.cs
git commit -m "feat(backend): colours API, category translations and gender seed data"
```

---

### Task 3: Frontend types, API client and the localizedName helper

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/utils/format.ts`
- Modify: `frontend/src/i18n/en.json`, `ka.json`, `ru.json`

**Interfaces produced** — Tasks 4-8 all consume these:

```ts
export interface Category { id: number; nameEn: string; nameKa: string; nameRu: string; slug: string; genderTarget: GenderTarget; isEnabled: boolean; displayOrder: number; }
export interface Color { id: number; nameEn: string; nameKa: string; nameRu: string; hexCode: string; displayOrder: number; isEnabled: boolean; }
export interface ProductColor { id: number; colorId: number; nameEn: string; nameKa: string; nameRu: string; hexCode: string; }
export interface ProductImage { id: number; url: string; altText: string; isPrimary: boolean; sortOrder: number; colorId: number | null; }
```

```ts
// frontend/src/utils/format.ts
export function localizedName(item: { nameEn: string; nameKa: string; nameRu: string }, language: 'en' | 'ka' | 'ru'): string
```

Returns the name for `language`, falling back to `nameEn` when that name is blank or whitespace, and to `''` if even `nameEn` is blank. **This is the only place the fallback rule may live.**

- [ ] **Step 1: Types** — update `Category`, `ProductColor`, `ProductImage`; add `Color`.

- [ ] **Step 2: API client** — add:

```ts
  colors: () => request<Color[]>('/api/colors'),
  saveColor: (color: Partial<Color>) =>
    color.id
      ? request<Color>(`/api/colors/${color.id}`, { method: 'PUT', body: JSON.stringify(color) })
      : request<Color>('/api/colors', { method: 'POST', body: JSON.stringify(color) }),
  deleteColor: (id: number) => request<void>(`/api/colors/${id}`, { method: 'DELETE' }),
```

In `saveProduct`, colours serialise as `{ colorId }` and images as `{ url, altText, isPrimary, sortOrder, colorId }`.

- [ ] **Step 3: `localizedName`** in `utils/format.ts`, per the contract above.

- [ ] **Step 4: Translation keys** — add to all three locale files: `men`, `women`, `kids`, `back`, `nameEn`, `nameKa`, `nameRu`, `genderTarget`, `colorList`, `addColor`, `hexCode`, `newColorPlaceholder`, `assignColor`, `noColor`, `addImage`, `removeImage`, `newOrders`.

Georgian: `men`=მამაკაცი, `women`=ქალი, `kids`=ბავშვი, `back`=უკან, `colorList`=ფერების სია, `noColor`=ფერის გარეშე, `newOrders`=ახალი შეკვეთები.
Russian: `men`=Мужское, `women`=Женское, `kids`=Детское, `back`=Назад, `colorList`=Список цветов, `noColor`=Без цвета, `newOrders`=Новые заказы.
Fill the remainder in the same register as the surrounding keys.

- [ ] **Step 5: Build and commit**

`npm run build` will fail until Tasks 4-7 update the call sites — that is expected at this point. Instead verify with `npx tsc --noEmit` and report the remaining errors, confirming every one is a `category.name` / `color.name` call site that a later task owns. Commit anyway:

```bash
git add frontend/src/types/index.ts frontend/src/services/api.ts frontend/src/utils/format.ts frontend/src/i18n/
git commit -m "feat(frontend): colour and translated-category types, localizedName helper"
```

---

### Task 4: Storefront category drill-down

**Files:**
- Modify: `frontend/src/pages/ProductsPage.tsx`
- Modify: `frontend/src/components/ProductCard.tsx`
- Modify: `frontend/src/styles/global.css` (append)

- [ ] **Step 1: Sidebar drill-down**

`ProductsPage` gains `const [gender, setGender] = useState<GenderTarget | null>(0)` — it opens **inside Men**, so the grid is never empty on arrival.

- When `gender === null`: the sidebar lists Men / Women / Kids as `.category-link` buttons.
- When `gender !== null`: the sidebar shows a `← back` button (sets `gender` to `null` and clears `categoryId`), the gender's name as the list title, then `All categories` plus that gender's categories.
- Changing gender clears `categoryId`.
- Categories load via `api.categories(gender)` whenever `gender` changes.
- **Products must filter by gender too** — `api.products(...)` is currently hardcoded to `0`. Pass the selected gender so choosing Women does not show men's products. If the products endpoint does not accept a gender parameter, filter client-side on `product.genderTarget` and say so in your report.

Reuse the existing `.category-list` / `.category-link` classes. Add only what the back button needs.

- [ ] **Step 2: Category names via the helper**

Every `category.name` becomes `localizedName(category, language)` — `useI18n()` exposes `language`. Applies to `ProductsPage.tsx` and `ProductCard.tsx:23`.

- [ ] **Step 3: Verify and commit**

Run `npm run build`. Then in the browser: the sidebar shows Men's categories on arrival; `← back` reveals Men/Women/Kids; picking Women shows women's categories and women's products; category names render in Georgian when the language is KA. Report each check.

```bash
git commit -m "feat(frontend): Men/Women/Kids category drill-down with translated names"
```

---

### Task 5: Admin categories and colours screens

**Files:**
- Modify: `frontend/src/pages/AdminCategoriesPage.tsx`
- Create: `frontend/src/pages/AdminColorsPage.tsx`
- Modify: `frontend/src/App.tsx` (route `admin/colors`)
- Modify: `frontend/src/layouts/AdminLayout.tsx` (nav link, `Palette` icon from lucide-react)
- Modify: `frontend/src/styles/global.css` (append)

- [ ] **Step 1: Admin categories** — the form takes three name inputs (EN/KA/RU) and a gender `<select>` (Men/Women/Kids), replacing the single name box and the hardcoded `genderTarget: 0` at line 24. The slug still derives from the English name. Each row shows all three names so untranslated ones are visible at a glance.

- [ ] **Step 2: Admin colours** — a new page modelled on the categories page: three name inputs, a `<input type="color">` for the hex, add/edit/enable-toggle/delete, and a swatch on each row. Follow the existing admin page markup conventions exactly.

- [ ] **Step 3: Route and nav** — `<Route path="colors" element={<AdminColorsPage />} />` inside the admin block, and a nav link between Categories and Orders.

- [ ] **Step 4: Verify and commit** — `npm run build`, then in the browser create a colour, edit it, disable it, and confirm each persists after a reload. Create a Women category and confirm it appears under Women in the storefront drill-down. Report each check.

```bash
git commit -m "feat(frontend): admin colour list and multilingual category editor"
```

---

### Task 6: Admin product form — many images, colours from the list

**Files:**
- Modify: `frontend/src/pages/AdminProductFormPage.tsx`
- Modify: `frontend/src/styles/global.css` (append)

- [ ] **Step 1: Multiple images**

`handleImageFile` at line 72 currently **replaces** the whole images array, capping every product at one image. It must **append**:

```tsx
setForm(f => ({
  ...f,
  images: [...(f.images ?? []), {
    id: 0, url, altText: f.name ?? '',
    isPrimary: (f.images ?? []).length === 0,
    sortOrder: (f.images ?? []).length,
    colorId: null,
  }],
}));
```

The file input takes `multiple`, uploading each selected file in turn. Each uploaded image renders as a thumbnail with: a colour `<select>` (options: `noColor` plus every enabled colour), a "make primary" control, and a remove button. Exactly one image is primary; removing the primary promotes the first remaining image.

- [ ] **Step 2: Colours from the list**

Replace the `colorsText` free-text box (line 30, and the parsing at lines 82-85) with a multi-select of the colours from `api.colors()`. The form submits `colors: [{ colorId }]`. Delete the `Black:#111111` parsing entirely.

- [ ] **Step 3: Submit** — `images` now serialises every image with its `colorId`; drop the `form.images?.[0]?.url ? ... : []` guard at line 90 in favour of filtering out images with a blank URL.

- [ ] **Step 4: Verify and commit** — `npm run build`, then in the browser: upload three images to one product, assign two of them different colours, save, reload the edit page and confirm all three images and their colour assignments persisted. Report the check.

```bash
git commit -m "feat(frontend): multi-image product upload with colour assignment"
```

---

### Task 7: Product page gallery with colour switching

**Files:**
- Modify: `frontend/src/pages/ProductDetailsPage.tsx`
- Modify: `frontend/src/styles/global.css` (append)

- [ ] **Step 1: Gallery**

`ProductDetailsPage.tsx:37` currently renders only `product.images[0]`. Replace with a gallery: one large image plus a row of thumbnails; clicking a thumbnail sets the large image. Track the active image in state.

- [ ] **Step 2: Colour switching**

The visible image set is derived, not stored:

- Images whose `colorId` matches the selected colour, if any exist
- Otherwise every image with `colorId === null` (the unassigned default set)
- Otherwise all images

Selecting a colour recomputes that set and resets the large image to its first entry. Selecting a colour with no images of its own must fall back rather than showing an empty gallery.

Colour swatch labels come from `localizedName(color, language)`.

- [ ] **Step 3: Verify and commit** — `npm run build`, then in the browser on the product from Task 6: thumbnails appear; clicking one changes the main image; selecting a colour that has images switches the gallery; selecting a colour with none falls back without blanking; adding to cart still records the selected colour. Report each check.

```bash
git commit -m "feat(frontend): product gallery with colour-driven image switching"
```

---

### Task 8: Home page 8 newest, and the red new-order badge

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx`
- Modify: `frontend/src/layouts/AdminLayout.tsx`
- Modify: `backend/MenswearStore.Api/Controllers/AdminController.cs`
- Modify: `frontend/src/styles/global.css` (append)

- [ ] **Step 1: Item 12 — 8 newest**

`HomePage.tsx:14` takes `.slice(0, 4)`. Change to 8, and make sure the products are ordered newest-first by `CreatedAtUtc` — check the ordering in `ProductsController`; if it does not already sort newest-first, add that ordering server-side rather than sorting in the browser. Report which you did.

The grid is `repeat(4, ...)` on desktop, so 8 items form two clean rows.

- [ ] **Step 2: Item 18 — red new-order badge**

Add a pending-order count to the admin dashboard payload in `AdminController` (the endpoint behind `api.dashboard()`, which returns `Record<string, number>`). Key it `pendingOrders`.

In `AdminLayout`, fetch it and render a red badge on the Orders nav link when the count is above zero. Badge styling: `background: var(--accent)`, white text, small pill. Hide it entirely at zero — do not render a red "0".

- [ ] **Step 3: Verify and commit** — `dotnet build`, `npm run build`, then confirm in the browser that the home page shows 8 products and that the Orders link carries a red badge matching the real pending-order count. Report both.

```bash
git commit -m "feat: show 8 newest products on home page and badge pending orders"
```

---

### Task 9: Full verification pass

- [ ] **Step 1** — In all three languages, confirm no raw key leaks and that category and colour names render translated, on: the products page sidebar, a product details page, the admin categories page, the admin colours page.
- [ ] **Step 2** — At 375px, confirm `document.documentElement.scrollWidth <= document.documentElement.clientWidth` is `true` on the products page, a product details page with the gallery, and the admin product form.
- [ ] **Step 3** — Confirm the drill-down works on mobile width.
- [ ] **Step 4** — Confirm a product with no images at all does not crash the details page.
- [ ] **Step 5** — Confirm the seeded starter colours appear in the admin colour list and in the product form dropdown.
- [ ] **Step 6** — Fix anything broken, re-verify, and commit. If nothing is broken, say so and commit nothing.

## Done when

- Category names show translated, with Men/Women/Kids drill-down on the storefront
- Sofio manages colours in the admin panel in three languages and picks them on the product form
- A product carries many images; assigning colours to images makes the gallery switch
- The home page shows the 8 newest products
- Pending orders show a red badge in the admin nav
- `dotnet build` and `npm run build` both pass
