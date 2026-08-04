# Backend Architecture Refactor — Layered Multi-Project Solution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single `MenswearStore.Api` project into six focused projects (Domain, DataAccess, BusinessLogic, Api, Migration, Tests) following the WedShare layered architecture pattern.

**Architecture:** Domain holds pure POCO entities; DataAccess owns DbContext, Identity user, and repository implementations; BusinessLogic holds service interfaces and implementations; Api holds only controllers, DTOs, mapping, and middleware. Controllers never touch DbContext — they only call service interfaces.

**Tech Stack:** .NET 10, SQLite (EF Core 10.0.3), ASP.NET Core Identity, JWT Bearer (Swashbuckle 10.1.7), xUnit + Moq for tests.

---

## Dependency Graph

```
MenswearStore.Domain        (no external deps)
       ↑
MenswearStore.DataAccess    (→ Domain, EF Core, Identity)
       ↑
MenswearStore.BusinessLogic (→ Domain, DataAccess interfaces)
       ↑
MenswearStore.Api           (→ BusinessLogic, DataAccess, Domain)
MenswearStore.Migration     (→ DataAccess — design-time factory only)
MenswearStore.Tests         (→ BusinessLogic, DataAccess)
```

## File Map

**Create (new files):**
- `MenswearStore.Domain/MenswearStore.Domain.csproj`
- `MenswearStore.DataAccess/MenswearStore.DataAccess.csproj`
- `MenswearStore.DataAccess/ApplicationUser.cs`
- `MenswearStore.DataAccess/ApplicationDbContext.cs`
- `MenswearStore.DataAccess/DataSeeder.cs`
- `MenswearStore.DataAccess/Interfaces/I{Product,Category,Cart,Setting,Admin}Repository.cs`
- `MenswearStore.DataAccess/Repositories/{Product,Category,Cart,Setting,Admin}Repository.cs`
- `MenswearStore.BusinessLogic/MenswearStore.BusinessLogic.csproj`
- `MenswearStore.BusinessLogic/Models/{ProductData,CategoryData,CartData}.cs`
- `MenswearStore.BusinessLogic/Interfaces/I{Product,Category,Cart,Setting,Token,Admin}Service.cs`
- `MenswearStore.BusinessLogic/Services/{Product,Category,Cart,Setting,Token,Admin}Service.cs`
- `MenswearStore.Migration/MenswearStore.Migration.csproj`
- `MenswearStore.Migration/ApplicationDbContextFactory.cs`
- `MenswearStore.Tests/MenswearStore.Tests.csproj`
- `MenswearStore.Tests/Services/ProductServiceTests.cs`

**Move (existing files, updated namespaces):**
- `MenswearStore.Api/Entities/*` → `MenswearStore.Domain/Entities/`
- `MenswearStore.Api/Migrations/*` → `MenswearStore.DataAccess/Migrations/`

**Modify:**
- `MenswearStore.Api/MenswearStore.Api.csproj` — remove duplicate packages, add project refs
- `MenswearStore.Api/Program.cs` — update DI registrations, remove direct DbContext usage
- `MenswearStore.Api/Controllers/*.cs` — inject services instead of DbContext
- `MenswearStore.Api/DTOs/MappingExtensions.cs` — update namespace imports

---

## Task 1: Create Project Scaffolding

**Files:** New .csproj files + solution wiring

- [ ] **Step 1: Create the new class library and test projects**

Run from `C:\Git\E-Commerce\backend`:

```powershell
dotnet new classlib -n MenswearStore.Domain -o MenswearStore.Domain --framework net10.0
dotnet new classlib -n MenswearStore.DataAccess -o MenswearStore.DataAccess --framework net10.0
dotnet new classlib -n MenswearStore.BusinessLogic -o MenswearStore.BusinessLogic --framework net10.0
dotnet new classlib -n MenswearStore.Migration -o MenswearStore.Migration --framework net10.0
dotnet new xunit -n MenswearStore.Tests -o MenswearStore.Tests --framework net10.0
```

- [ ] **Step 2: Delete the default stub files**

```powershell
Remove-Item "MenswearStore.Domain\Class1.cs" -Force
Remove-Item "MenswearStore.DataAccess\Class1.cs" -Force
Remove-Item "MenswearStore.BusinessLogic\Class1.cs" -Force
Remove-Item "MenswearStore.Migration\Class1.cs" -Force
Remove-Item "MenswearStore.Tests\UnitTest1.cs" -Force
```

- [ ] **Step 3: Add all projects to the solution**

```powershell
dotnet sln ..\MenswearStore.sln add MenswearStore.Domain\MenswearStore.Domain.csproj
dotnet sln ..\MenswearStore.sln add MenswearStore.DataAccess\MenswearStore.DataAccess.csproj
dotnet sln ..\MenswearStore.sln add MenswearStore.BusinessLogic\MenswearStore.BusinessLogic.csproj
dotnet sln ..\MenswearStore.sln add MenswearStore.Migration\MenswearStore.Migration.csproj
dotnet sln ..\MenswearStore.sln add MenswearStore.Tests\MenswearStore.Tests.csproj
```

- [ ] **Step 4: Wire up project references**

```powershell
# DataAccess depends on Domain
dotnet add MenswearStore.DataAccess reference MenswearStore.Domain\MenswearStore.Domain.csproj

# BusinessLogic depends on Domain + DataAccess
dotnet add MenswearStore.BusinessLogic reference MenswearStore.Domain\MenswearStore.Domain.csproj
dotnet add MenswearStore.BusinessLogic reference MenswearStore.DataAccess\MenswearStore.DataAccess.csproj

# Api depends on all three + Migration (for db.MigrateAsync at runtime)
dotnet add MenswearStore.Api reference MenswearStore.Domain\MenswearStore.Domain.csproj
dotnet add MenswearStore.Api reference MenswearStore.DataAccess\MenswearStore.DataAccess.csproj
dotnet add MenswearStore.Api reference MenswearStore.BusinessLogic\MenswearStore.BusinessLogic.csproj

# Migration depends on DataAccess
dotnet add MenswearStore.Migration reference MenswearStore.DataAccess\MenswearStore.DataAccess.csproj

# Tests depend on BusinessLogic + DataAccess
dotnet add MenswearStore.Tests reference MenswearStore.BusinessLogic\MenswearStore.BusinessLogic.csproj
dotnet add MenswearStore.Tests reference MenswearStore.DataAccess\MenswearStore.DataAccess.csproj
```

- [ ] **Step 5: Add NuGet packages to each project**

```powershell
# DataAccess packages
dotnet add MenswearStore.DataAccess package Microsoft.AspNetCore.Identity.EntityFrameworkCore --version 10.0.3
dotnet add MenswearStore.DataAccess package Microsoft.EntityFrameworkCore.Sqlite --version 10.0.3
dotnet add MenswearStore.DataAccess package Microsoft.EntityFrameworkCore.Design --version 10.0.3

# BusinessLogic packages (for JWT + Identity)
dotnet add MenswearStore.BusinessLogic package Microsoft.AspNetCore.Identity.EntityFrameworkCore --version 10.0.3
dotnet add MenswearStore.BusinessLogic package Microsoft.AspNetCore.Authentication.JwtBearer --version 10.0.3

# Migration packages (EF design-time tooling)
dotnet add MenswearStore.Migration package Microsoft.EntityFrameworkCore.Design --version 10.0.3
dotnet add MenswearStore.Migration package Microsoft.EntityFrameworkCore.Sqlite --version 10.0.3

# Tests packages
dotnet add MenswearStore.Tests package Moq --version 4.20.72
dotnet add MenswearStore.Tests package Microsoft.EntityFrameworkCore.InMemory --version 10.0.3
```

- [ ] **Step 6: Verify the solution builds (will fail until code is written, just check scaffold)**

```powershell
dotnet build ..\MenswearStore.sln
```

Expected: compile errors about missing types (OK at this stage — projects exist and reference each other).

- [ ] **Step 7: Commit**

```powershell
git add MenswearStore.Domain\ MenswearStore.DataAccess\ MenswearStore.BusinessLogic\ MenswearStore.Migration\ MenswearStore.Tests\ ..\MenswearStore.sln
git commit -m "feat: scaffold multi-project solution structure"
```

---

## Task 2: Populate MenswearStore.Domain

**Files:**
- Create: `MenswearStore.Domain/Entities/` (move all entity files here)

The Domain project holds pure POCO entity classes — no EF attributes, no external dependencies. `ApplicationUser` stays in DataAccess because it inherits `IdentityUser` (an EF type).

- [ ] **Step 1: Create Entities folder and copy entity files**

Copy these files from `MenswearStore.Api/Entities/` into `MenswearStore.Domain/Entities/`, then update their namespaces:

```powershell
New-Item -ItemType Directory -Force -Path "MenswearStore.Domain\Entities"
Copy-Item "MenswearStore.Api\Entities\GenderTarget.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\Category.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\Product.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\ProductImage.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\ProductSize.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\ProductColor.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\Cart.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\CartItem.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\Order.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\OrderItem.cs" "MenswearStore.Domain\Entities\"
Copy-Item "MenswearStore.Api\Entities\AppSetting.cs" "MenswearStore.Domain\Entities\"
```

- [ ] **Step 2: Update namespaces in all copied files**

Open each file in `MenswearStore.Domain/Entities/` and change:
```csharp
// FROM:
namespace MenswearStore.Api.Entities;

// TO:
namespace MenswearStore.Domain.Entities;
```

Do this for all 11 files: GenderTarget, Category, Product, ProductImage, ProductSize, ProductColor, Cart, CartItem, Order, OrderItem, AppSetting.

- [ ] **Step 3: Verify Domain builds**

```powershell
dotnet build MenswearStore.Domain\MenswearStore.Domain.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```powershell
git add MenswearStore.Domain\
git commit -m "feat: add Domain project with entity classes"
```

---

## Task 3: Set Up MenswearStore.DataAccess (DbContext + Identity)

**Files:**
- Create: `MenswearStore.DataAccess/ApplicationUser.cs`
- Create: `MenswearStore.DataAccess/ApplicationDbContext.cs`
- Create: `MenswearStore.DataAccess/DataSeeder.cs`
- Create: `MenswearStore.DataAccess/Migrations/` (move existing migrations)

- [ ] **Step 1: Create ApplicationUser.cs**

```csharp
// MenswearStore.DataAccess/ApplicationUser.cs
using Microsoft.AspNetCore.Identity;

namespace MenswearStore.DataAccess;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 2: Create ApplicationDbContext.cs**

```csharp
// MenswearStore.DataAccess/ApplicationDbContext.cs
using MenswearStore.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.DataAccess;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductSize> ProductSizes => Set<ProductSize>();
    public DbSet<ProductColor> ProductColors => Set<ProductColor>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Category>()
            .HasIndex(category => category.Slug)
            .IsUnique();

        builder.Entity<AppSetting>()
            .HasIndex(setting => setting.Key)
            .IsUnique();

        builder.Entity<Product>()
            .Property(product => product.Price)
            .HasPrecision(10, 2);

        builder.Entity<Product>()
            .Property(product => product.DiscountPrice)
            .HasPrecision(10, 2);

        builder.Entity<CartItem>()
            .Property(item => item.UnitPrice)
            .HasPrecision(10, 2);

        builder.Entity<Order>()
            .Property(order => order.Total)
            .HasPrecision(10, 2);

        builder.Entity<OrderItem>()
            .Property(item => item.UnitPrice)
            .HasPrecision(10, 2);
    }
}
```

- [ ] **Step 3: Create DataSeeder.cs**

```csharp
// MenswearStore.DataAccess/DataSeeder.cs
using MenswearStore.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.DataAccess;

public class DataSeeder(
    ApplicationDbContext db,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole> roleManager)
{
    public async Task SeedAsync()
    {
        await SeedRolesAsync();
        await SeedUsersAsync();
        await SeedCatalogAsync();
        await SeedSettingsAsync();
    }

    private async Task SeedRolesAsync()
    {
        foreach (var role in new[] { "Admin", "Customer" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }
    }

    private async Task SeedUsersAsync()
    {
        await CreateUserAsync("admin@menswear.local", "Admin123!", "Store", "Admin", "Admin");
        await CreateUserAsync("customer@menswear.local", "Customer123!", "Test", "Customer", "Customer");
    }

    private async Task CreateUserAsync(string email, string password, string firstName, string lastName, string role)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                FirstName = firstName,
                LastName = lastName
            };
            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        if (!await userManager.IsInRoleAsync(user, role))
            await userManager.AddToRoleAsync(user, role);
    }

    private async Task SeedCatalogAsync()
    {
        if (await db.Categories.AnyAsync()) return;

        var shirts = new Category { Name = "Shirts", Slug = "shirts", GenderTarget = GenderTarget.Men, DisplayOrder = 1 };
        var jackets = new Category { Name = "Jackets", Slug = "jackets", GenderTarget = GenderTarget.Men, DisplayOrder = 2 };
        var trousers = new Category { Name = "Trousers", Slug = "trousers", GenderTarget = GenderTarget.Men, DisplayOrder = 3 };
        db.Categories.AddRange(shirts, jackets, trousers);

        db.Products.AddRange(
            MakeProduct("Oxford Cotton Shirt", "Clean everyday shirt in breathable cotton with a structured collar.", 69, 54, shirts, 42,
                "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80",
                ["S", "M", "L", "XL"], [("White", "#f6f4ee"), ("Sky", "#9fc5df")]),
            MakeProduct("Tailored Overshirt", "Layer-ready overshirt with a relaxed fit and subtle utility pockets.", 118, null, jackets, 18,
                "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=900&q=80",
                ["M", "L", "XL"], [("Olive", "#6f7355"), ("Black", "#111111")]),
            MakeProduct("Tapered Wool Trousers", "Minimal tapered trousers for workdays, dinners, and easy weekend polish.", 96, 82, trousers, 31,
                "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",
                ["S", "M", "L", "XL"], [("Charcoal", "#363636"), ("Navy", "#1f2a44")]),
            MakeProduct("Merino Knit Polo", "Soft knit polo with a refined drape and understated ribbed hem.", 88, null, shirts, 24,
                "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&w=900&q=80",
                ["S", "M", "L"], [("Sand", "#c8b99d"), ("Forest", "#314536")]));

        await db.SaveChangesAsync();
    }

    private static Product MakeProduct(string name, string description, decimal price, decimal? discountPrice,
        Category category, int stock, string imageUrl, string[] sizes, (string Name, string Hex)[] colors) =>
        new()
        {
            Name = name, Description = description, Price = price, DiscountPrice = discountPrice,
            Category = category, GenderTarget = GenderTarget.Men, StockQuantity = stock,
            Images = [new ProductImage { Url = imageUrl, AltText = name, IsPrimary = true }],
            Sizes = sizes.Select(s => new ProductSize { Name = s }).ToList(),
            Colors = colors.Select(c => new ProductColor { Name = c.Name, HexCode = c.Hex }).ToList()
        };

    private async Task SeedSettingsAsync()
    {
        var settings = new[]
        {
            ("enable_men", "Enable Men category", true),
            ("enable_women", "Enable Women category", false),
            ("enable_kids", "Enable Kids category", false),
            ("enable_google_login", "Enable Google login", false),
            ("enable_payments", "Enable payments", false),
            ("enable_discounts", "Enable discounts", true),
            ("enable_product_reviews", "Enable product reviews", false)
        };

        foreach (var (key, name, enabled) in settings)
        {
            if (!await db.AppSettings.AnyAsync(s => s.Key == key))
                db.AppSettings.Add(new AppSetting { Key = key, Name = name, IsEnabled = enabled });
        }

        await db.SaveChangesAsync();
    }
}
```

- [ ] **Step 4: Move existing migrations into DataAccess**

```powershell
New-Item -ItemType Directory -Force -Path "MenswearStore.DataAccess\Migrations"
Move-Item "MenswearStore.Api\Migrations\*.cs" "MenswearStore.DataAccess\Migrations\"
```

- [ ] **Step 5: Update namespaces in migrated migration files**

Open each file in `MenswearStore.DataAccess/Migrations/` and change:
```csharp
// FROM:
namespace MenswearStore.Api.Migrations;
// (and any using MenswearStore.Api.Data; references)

// TO:
namespace MenswearStore.DataAccess.Migrations;
// (and remove or replace Data namespace — ApplicationDbContext is now in MenswearStore.DataAccess)
```

Also update the snapshot file: the `[DbContext(typeof(ApplicationDbContext))]` attribute stays — just fix the namespace.

- [ ] **Step 6: Verify DataAccess builds**

```powershell
dotnet build MenswearStore.DataAccess\MenswearStore.DataAccess.csproj
```

Expected: Build succeeded.

- [ ] **Step 7: Commit**

```powershell
git add MenswearStore.DataAccess\
git commit -m "feat: add DataAccess project with DbContext, Identity user, seeder, and migrations"
```

---

## Task 4: Add Repository Interfaces and Implementations

**Files:**
- Create: `MenswearStore.DataAccess/Interfaces/IProductRepository.cs`
- Create: `MenswearStore.DataAccess/Interfaces/ICategoryRepository.cs`
- Create: `MenswearStore.DataAccess/Interfaces/ICartRepository.cs`
- Create: `MenswearStore.DataAccess/Interfaces/ISettingRepository.cs`
- Create: `MenswearStore.DataAccess/Interfaces/IAdminRepository.cs`
- Create: `MenswearStore.DataAccess/Repositories/ProductRepository.cs`
- Create: `MenswearStore.DataAccess/Repositories/CategoryRepository.cs`
- Create: `MenswearStore.DataAccess/Repositories/CartRepository.cs`
- Create: `MenswearStore.DataAccess/Repositories/SettingRepository.cs`
- Create: `MenswearStore.DataAccess/Repositories/AdminRepository.cs`

- [ ] **Step 1: Create repository interfaces**

```csharp
// MenswearStore.DataAccess/Interfaces/IProductRepository.cs
using MenswearStore.Domain.Entities;

namespace MenswearStore.DataAccess.Interfaces;

public interface IProductRepository
{
    IQueryable<Product> Query();
    Task<Product?> FindAsync(int id);
    Task AddAsync(Product product);
    void RemoveChildren(Product product);
    Task SaveChangesAsync();
}
```

```csharp
// MenswearStore.DataAccess/Interfaces/ICategoryRepository.cs
using MenswearStore.Domain.Entities;

namespace MenswearStore.DataAccess.Interfaces;

public interface ICategoryRepository
{
    IQueryable<Category> Query();
    Task<Category?> FindAsync(int id);
    Task AddAsync(Category category);
    Task SaveChangesAsync();
}
```

```csharp
// MenswearStore.DataAccess/Interfaces/ICartRepository.cs
using MenswearStore.Domain.Entities;

namespace MenswearStore.DataAccess.Interfaces;

public interface ICartRepository
{
    Task<Cart?> FindByUserAsync(string userId);
    Task<Cart?> FindByGuestAsync(string guestId);
    Task<Cart> LoadAsync(int cartId);
    Task AddAsync(Cart cart);
    void RemoveItem(CartItem item);
    Task SaveChangesAsync();
}
```

```csharp
// MenswearStore.DataAccess/Interfaces/ISettingRepository.cs
using MenswearStore.Domain.Entities;

namespace MenswearStore.DataAccess.Interfaces;

public interface ISettingRepository
{
    Task<IReadOnlyList<AppSetting>> GetAllAsync();
    Task<AppSetting?> FindByKeyAsync(string key);
    Task SaveChangesAsync();
}
```

```csharp
// MenswearStore.DataAccess/Interfaces/IAdminRepository.cs
namespace MenswearStore.DataAccess.Interfaces;

public interface IAdminRepository
{
    Task<int> CountProductsAsync();
    Task<int> CountActiveProductsAsync();
    Task<int> CountCategoriesAsync();
    Task<int> CountCartsAsync();
    Task<int> CountEnabledSettingsAsync();
}
```

- [ ] **Step 2: Create ProductRepository**

```csharp
// MenswearStore.DataAccess/Repositories/ProductRepository.cs
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.DataAccess.Repositories;

public class ProductRepository(ApplicationDbContext db) : IProductRepository
{
    public IQueryable<Product> Query() =>
        db.Products
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Include(p => p.Sizes)
            .Include(p => p.Colors);

    public Task<Product?> FindAsync(int id) =>
        Query().FirstOrDefaultAsync(p => p.Id == id);

    public Task AddAsync(Product product)
    {
        db.Products.Add(product);
        return Task.CompletedTask;
    }

    public void RemoveChildren(Product product)
    {
        db.ProductImages.RemoveRange(product.Images);
        db.ProductSizes.RemoveRange(product.Sizes);
        db.ProductColors.RemoveRange(product.Colors);
    }

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
```

- [ ] **Step 3: Create CategoryRepository**

```csharp
// MenswearStore.DataAccess/Repositories/CategoryRepository.cs
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.Domain.Entities;

namespace MenswearStore.DataAccess.Repositories;

public class CategoryRepository(ApplicationDbContext db) : ICategoryRepository
{
    public IQueryable<Category> Query() => db.Categories.AsQueryable();

    public Task<Category?> FindAsync(int id) => db.Categories.FindAsync(id).AsTask();

    public Task AddAsync(Category category)
    {
        db.Categories.Add(category);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
```

- [ ] **Step 4: Create CartRepository**

```csharp
// MenswearStore.DataAccess/Repositories/CartRepository.cs
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.DataAccess.Repositories;

public class CartRepository(ApplicationDbContext db) : ICartRepository
{
    public Task<Cart?> FindByUserAsync(string userId) =>
        CartQuery().FirstOrDefaultAsync(c => c.UserId == userId);

    public Task<Cart?> FindByGuestAsync(string guestId) =>
        CartQuery().FirstOrDefaultAsync(c => c.GuestId == guestId);

    public Task<Cart> LoadAsync(int cartId) =>
        CartQuery().FirstAsync(c => c.Id == cartId);

    public Task AddAsync(Cart cart)
    {
        db.Carts.Add(cart);
        return Task.CompletedTask;
    }

    public void RemoveItem(CartItem item) => db.CartItems.Remove(item);

    public Task SaveChangesAsync() => db.SaveChangesAsync();

    private IQueryable<Cart> CartQuery() =>
        db.Carts
            .Include(c => c.Items)
            .ThenInclude(i => i.Product)
            .ThenInclude(p => p!.Images);
}
```

- [ ] **Step 5: Create SettingRepository**

```csharp
// MenswearStore.DataAccess/Repositories/SettingRepository.cs
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.DataAccess.Repositories;

public class SettingRepository(ApplicationDbContext db) : ISettingRepository
{
    public async Task<IReadOnlyList<AppSetting>> GetAllAsync() =>
        await db.AppSettings.OrderBy(s => s.Id).ToListAsync();

    public Task<AppSetting?> FindByKeyAsync(string key) =>
        db.AppSettings.FirstOrDefaultAsync(s => s.Key == key);

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
```

- [ ] **Step 6: Create AdminRepository**

```csharp
// MenswearStore.DataAccess/Repositories/AdminRepository.cs
using MenswearStore.DataAccess.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.DataAccess.Repositories;

public class AdminRepository(ApplicationDbContext db) : IAdminRepository
{
    public Task<int> CountProductsAsync() => db.Products.CountAsync();
    public Task<int> CountActiveProductsAsync() => db.Products.CountAsync(p => p.IsActive);
    public Task<int> CountCategoriesAsync() => db.Categories.CountAsync();
    public Task<int> CountCartsAsync() => db.Carts.CountAsync();
    public Task<int> CountEnabledSettingsAsync() => db.AppSettings.CountAsync(s => s.IsEnabled);
}
```

- [ ] **Step 7: Verify DataAccess still builds**

```powershell
dotnet build MenswearStore.DataAccess\MenswearStore.DataAccess.csproj
```

Expected: Build succeeded.

- [ ] **Step 8: Commit**

```powershell
git add MenswearStore.DataAccess\
git commit -m "feat: add repository interfaces and implementations"
```

---

## Task 5: Set Up MenswearStore.BusinessLogic

**Files:**
- Create: `MenswearStore.BusinessLogic/Models/ProductData.cs`
- Create: `MenswearStore.BusinessLogic/Models/CategoryData.cs`
- Create: `MenswearStore.BusinessLogic/Interfaces/I{Product,Category,Cart,Setting,Token,Admin}Service.cs`
- Create: `MenswearStore.BusinessLogic/Services/{Product,Category,Cart,Setting,Token,Admin}Service.cs`

- [ ] **Step 1: Create service-layer request models**

```csharp
// MenswearStore.BusinessLogic/Models/ProductData.cs
namespace MenswearStore.BusinessLogic.Models;

public record ProductData(
    string Name,
    string Description,
    decimal Price,
    decimal? DiscountPrice,
    int CategoryId,
    MenswearStore.Domain.Entities.GenderTarget GenderTarget,
    string[] Sizes,
    ColorData[] Colors,
    ImageData[] Images,
    int StockQuantity,
    bool IsActive);

public record ColorData(string Name, string HexCode);
public record ImageData(string Url, string AltText, bool IsPrimary, int SortOrder);
```

```csharp
// MenswearStore.BusinessLogic/Models/CategoryData.cs
using MenswearStore.Domain.Entities;

namespace MenswearStore.BusinessLogic.Models;

public record CategoryData(string Name, string Slug, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder);
```

```csharp
// MenswearStore.BusinessLogic/Models/AddItemData.cs
namespace MenswearStore.BusinessLogic.Models;

public record AddItemData(int ProductId, int Quantity, string? Size, string? Color);
public record DashboardStats(int ProductCount, int ActiveProducts, int CategoryCount, int Carts, int TogglesEnabled);
```

- [ ] **Step 2: Create service interfaces**

```csharp
// MenswearStore.BusinessLogic/Interfaces/IProductService.cs
using MenswearStore.BusinessLogic.Models;
using MenswearStore.Domain.Entities;

namespace MenswearStore.BusinessLogic.Interfaces;

public interface IProductService
{
    Task<IReadOnlyList<Product>> GetProductsAsync(GenderTarget gender, int? categoryId, bool includeInactive, bool isAdmin);
    Task<Product?> GetProductAsync(int id, bool isAdmin);
    Task<Product> CreateAsync(ProductData data);
    Task<Product?> UpdateAsync(int id, ProductData data);
    Task<bool> DeactivateAsync(int id);
}
```

```csharp
// MenswearStore.BusinessLogic/Interfaces/ICategoryService.cs
using MenswearStore.BusinessLogic.Models;
using MenswearStore.Domain.Entities;

namespace MenswearStore.BusinessLogic.Interfaces;

public interface ICategoryService
{
    Task<IReadOnlyList<Category>> GetCategoriesAsync(GenderTarget? gender, bool isAdmin);
    Task<Category> CreateAsync(CategoryData data);
    Task<Category?> UpdateAsync(int id, CategoryData data);
    Task<bool> DisableAsync(int id);
}
```

```csharp
// MenswearStore.BusinessLogic/Interfaces/ICartService.cs
using MenswearStore.BusinessLogic.Models;
using MenswearStore.Domain.Entities;

namespace MenswearStore.BusinessLogic.Interfaces;

public interface ICartService
{
    Task<Cart> GetOrCreateAsync(string? userId, string? guestId);
    Task<Cart> AddItemAsync(string? userId, string? guestId, AddItemData data);
    Task<Cart> UpdateItemAsync(string? userId, string? guestId, int itemId, int quantity);
    Task<Cart> RemoveItemAsync(string? userId, string? guestId, int itemId);
}
```

```csharp
// MenswearStore.BusinessLogic/Interfaces/ISettingService.cs
using MenswearStore.Domain.Entities;

namespace MenswearStore.BusinessLogic.Interfaces;

public interface ISettingService
{
    Task<IReadOnlyList<AppSetting>> GetAllAsync();
    Task<AppSetting?> UpdateAsync(string key, bool isEnabled);
}
```

```csharp
// MenswearStore.BusinessLogic/Interfaces/ITokenService.cs
using MenswearStore.DataAccess;

namespace MenswearStore.BusinessLogic.Interfaces;

public interface ITokenService
{
    Task<string> CreateTokenAsync(ApplicationUser user);
}
```

```csharp
// MenswearStore.BusinessLogic/Interfaces/IAdminService.cs
using MenswearStore.BusinessLogic.Models;

namespace MenswearStore.BusinessLogic.Interfaces;

public interface IAdminService
{
    Task<DashboardStats> GetDashboardAsync();
}
```

- [ ] **Step 3: Create ProductService**

```csharp
// MenswearStore.BusinessLogic/Services/ProductService.cs
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.BusinessLogic.Models;
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.BusinessLogic.Services;

public class ProductService(IProductRepository repo) : IProductService
{
    public async Task<IReadOnlyList<Product>> GetProductsAsync(
        GenderTarget gender, int? categoryId, bool includeInactive, bool isAdmin)
    {
        var query = repo.Query().Where(p => p.GenderTarget == gender);

        if (!isAdmin || !includeInactive)
            query = query.Where(p => p.IsActive);

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId);

        return await query.OrderByDescending(p => p.CreatedAtUtc).ToListAsync();
    }

    public async Task<Product?> GetProductAsync(int id, bool isAdmin)
    {
        var product = await repo.FindAsync(id);
        if (product is null || (!product.IsActive && !isAdmin)) return null;
        return product;
    }

    public async Task<Product> CreateAsync(ProductData data)
    {
        var product = new Product();
        Apply(product, data);
        await repo.AddAsync(product);
        await repo.SaveChangesAsync();
        return (await repo.FindAsync(product.Id))!;
    }

    public async Task<Product?> UpdateAsync(int id, ProductData data)
    {
        var product = await repo.FindAsync(id);
        if (product is null) return null;

        repo.RemoveChildren(product);
        Apply(product, data);
        product.UpdatedAtUtc = DateTime.UtcNow;
        await repo.SaveChangesAsync();
        return product;
    }

    public async Task<bool> DeactivateAsync(int id)
    {
        var product = await repo.FindAsync(id);
        if (product is null) return false;

        product.IsActive = false;
        product.UpdatedAtUtc = DateTime.UtcNow;
        await repo.SaveChangesAsync();
        return true;
    }

    private static void Apply(Product product, ProductData data)
    {
        product.Name = data.Name.Trim();
        product.Description = data.Description.Trim();
        product.Price = data.Price;
        product.DiscountPrice = data.DiscountPrice;
        product.CategoryId = data.CategoryId;
        product.GenderTarget = data.GenderTarget;
        product.StockQuantity = data.StockQuantity;
        product.IsActive = data.IsActive;
        product.Sizes = data.Sizes
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => new ProductSize { Name = s.Trim() }).ToList();
        product.Colors = data.Colors
            .Select(c => new ProductColor { Name = c.Name.Trim(), HexCode = c.HexCode }).ToList();
        product.Images = data.Images
            .Select(i => new ProductImage { Url = i.Url.Trim(), AltText = i.AltText.Trim(), IsPrimary = i.IsPrimary, SortOrder = i.SortOrder }).ToList();
    }
}
```

- [ ] **Step 4: Create CategoryService**

```csharp
// MenswearStore.BusinessLogic/Services/CategoryService.cs
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.BusinessLogic.Models;
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.BusinessLogic.Services;

public class CategoryService(ICategoryRepository repo) : ICategoryService
{
    public async Task<IReadOnlyList<Category>> GetCategoriesAsync(GenderTarget? gender, bool isAdmin)
    {
        var query = repo.Query();
        if (gender.HasValue) query = query.Where(c => c.GenderTarget == gender);
        if (!isAdmin) query = query.Where(c => c.IsEnabled);
        return await query.OrderBy(c => c.DisplayOrder).ToListAsync();
    }

    public async Task<Category> CreateAsync(CategoryData data)
    {
        var category = new Category();
        Apply(category, data);
        await repo.AddAsync(category);
        await repo.SaveChangesAsync();
        return category;
    }

    public async Task<Category?> UpdateAsync(int id, CategoryData data)
    {
        var category = await repo.FindAsync(id);
        if (category is null) return null;
        Apply(category, data);
        await repo.SaveChangesAsync();
        return category;
    }

    public async Task<bool> DisableAsync(int id)
    {
        var category = await repo.FindAsync(id);
        if (category is null) return false;
        category.IsEnabled = false;
        await repo.SaveChangesAsync();
        return true;
    }

    private static void Apply(Category category, CategoryData data)
    {
        category.Name = data.Name.Trim();
        category.Slug = data.Slug.Trim().ToLowerInvariant();
        category.GenderTarget = data.GenderTarget;
        category.IsEnabled = data.IsEnabled;
        category.DisplayOrder = data.DisplayOrder;
    }
}
```

- [ ] **Step 5: Create CartService**

```csharp
// MenswearStore.BusinessLogic/Services/CartService.cs
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.BusinessLogic.Models;
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.BusinessLogic.Services;

public class CartService(ICartRepository cartRepo, IProductRepository productRepo) : ICartService
{
    public async Task<Cart> GetOrCreateAsync(string? userId, string? guestId)
    {
        var cart = await FindCartAsync(userId, guestId);
        if (cart is not null) return cart;

        cart = new Cart { UserId = userId, GuestId = userId is null ? guestId : null };
        await cartRepo.AddAsync(cart);
        await cartRepo.SaveChangesAsync();
        return await cartRepo.LoadAsync(cart.Id);
    }

    public async Task<Cart> AddItemAsync(string? userId, string? guestId, AddItemData data)
    {
        if (data.Quantity < 1) throw new ArgumentException("Quantity must be at least 1.");

        var product = await productRepo.Query()
            .FirstOrDefaultAsync(p => p.Id == data.ProductId && p.IsActive)
            ?? throw new KeyNotFoundException("Product not found.");

        var cart = await GetOrCreateAsync(userId, guestId);
        var unitPrice = product.DiscountPrice ?? product.Price;
        var existing = cart.Items.FirstOrDefault(i =>
            i.ProductId == data.ProductId && i.Size == data.Size && i.Color == data.Color);

        if (existing is null)
        {
            cart.Items.Add(new CartItem
            {
                ProductId = data.ProductId,
                Quantity = data.Quantity,
                Size = data.Size,
                Color = data.Color,
                UnitPrice = unitPrice
            });
        }
        else
        {
            existing.Quantity += data.Quantity;
            existing.UnitPrice = unitPrice;
        }

        cart.UpdatedAtUtc = DateTime.UtcNow;
        await cartRepo.SaveChangesAsync();
        return await cartRepo.LoadAsync(cart.Id);
    }

    public async Task<Cart> UpdateItemAsync(string? userId, string? guestId, int itemId, int quantity)
    {
        var cart = await GetOrCreateAsync(userId, guestId);
        var item = cart.Items.FirstOrDefault(i => i.Id == itemId)
            ?? throw new KeyNotFoundException("Cart item not found.");

        if (quantity <= 0)
            cartRepo.RemoveItem(item);
        else
            item.Quantity = quantity;

        cart.UpdatedAtUtc = DateTime.UtcNow;
        await cartRepo.SaveChangesAsync();
        return await cartRepo.LoadAsync(cart.Id);
    }

    public async Task<Cart> RemoveItemAsync(string? userId, string? guestId, int itemId)
    {
        var cart = await GetOrCreateAsync(userId, guestId);
        var item = cart.Items.FirstOrDefault(i => i.Id == itemId)
            ?? throw new KeyNotFoundException("Cart item not found.");

        cartRepo.RemoveItem(item);
        cart.UpdatedAtUtc = DateTime.UtcNow;
        await cartRepo.SaveChangesAsync();
        return await cartRepo.LoadAsync(cart.Id);
    }

    private Task<Cart?> FindCartAsync(string? userId, string? guestId) =>
        userId is not null
            ? cartRepo.FindByUserAsync(userId)
            : cartRepo.FindByGuestAsync(guestId ?? string.Empty);
}
```

- [ ] **Step 6: Create SettingService, TokenService, AdminService**

```csharp
// MenswearStore.BusinessLogic/Services/SettingService.cs
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.Domain.Entities;

namespace MenswearStore.BusinessLogic.Services;

public class SettingService(ISettingRepository repo) : ISettingService
{
    public Task<IReadOnlyList<AppSetting>> GetAllAsync() => repo.GetAllAsync();

    public async Task<AppSetting?> UpdateAsync(string key, bool isEnabled)
    {
        var setting = await repo.FindByKeyAsync(key);
        if (setting is null) return null;
        setting.IsEnabled = isEnabled;
        setting.UpdatedAtUtc = DateTime.UtcNow;
        await repo.SaveChangesAsync();
        return setting;
    }
}
```

```csharp
// MenswearStore.BusinessLogic/Services/TokenService.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.DataAccess;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace MenswearStore.BusinessLogic.Services;

public class TokenService(IConfiguration configuration, UserManager<ApplicationUser> userManager) : ITokenService
{
    public async Task<string> CreateTokenAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.Email ?? string.Empty)
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

```csharp
// MenswearStore.BusinessLogic/Services/AdminService.cs
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.BusinessLogic.Models;
using MenswearStore.DataAccess.Interfaces;

namespace MenswearStore.BusinessLogic.Services;

public class AdminService(IAdminRepository repo) : IAdminService
{
    public async Task<DashboardStats> GetDashboardAsync() =>
        new(
            await repo.CountProductsAsync(),
            await repo.CountActiveProductsAsync(),
            await repo.CountCategoriesAsync(),
            await repo.CountCartsAsync(),
            await repo.CountEnabledSettingsAsync());
}
```

- [ ] **Step 7: Verify BusinessLogic builds**

```powershell
dotnet build MenswearStore.BusinessLogic\MenswearStore.BusinessLogic.csproj
```

Expected: Build succeeded.

- [ ] **Step 8: Commit**

```powershell
git add MenswearStore.BusinessLogic\
git commit -m "feat: add BusinessLogic project with service interfaces and implementations"
```

---

## Task 6: Refactor MenswearStore.Api

**Files:**
- Modify: `MenswearStore.Api/MenswearStore.Api.csproj`
- Modify: `MenswearStore.Api/Program.cs`
- Modify: `MenswearStore.Api/Controllers/ProductsController.cs`
- Modify: `MenswearStore.Api/Controllers/CategoriesController.cs`
- Modify: `MenswearStore.Api/Controllers/CartController.cs`
- Modify: `MenswearStore.Api/Controllers/SettingsController.cs`
- Modify: `MenswearStore.Api/Controllers/AdminController.cs`
- Modify: `MenswearStore.Api/Controllers/AuthController.cs`
- Modify: `MenswearStore.Api/DTOs/MappingExtensions.cs`
- Delete: `MenswearStore.Api/Entities/` (moved to Domain)
- Delete: `MenswearStore.Api/Data/` (moved to DataAccess)
- Delete: `MenswearStore.Api/Services/TokenService.cs` (moved to BusinessLogic)

- [ ] **Step 1: Update MenswearStore.Api.csproj**

Replace the PackageReference block so only API-layer packages remain (EF packages now come transitively via DataAccess):

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.3" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="10.1.7" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\MenswearStore.BusinessLogic\MenswearStore.BusinessLogic.csproj" />
    <ProjectReference Include="..\MenswearStore.DataAccess\MenswearStore.DataAccess.csproj" />
    <ProjectReference Include="..\MenswearStore.Domain\MenswearStore.Domain.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Delete the old folders from Api**

```powershell
Remove-Item "MenswearStore.Api\Entities" -Recurse -Force
Remove-Item "MenswearStore.Api\Data" -Recurse -Force
Remove-Item "MenswearStore.Api\Services" -Recurse -Force
Remove-Item "MenswearStore.Api\Migrations" -Recurse -Force -ErrorAction SilentlyContinue
```

- [ ] **Step 3: Update Program.cs**

Replace `MenswearStore.Api/Program.cs` with:

```csharp
using System.Text;
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.BusinessLogic.Services;
using MenswearStore.DataAccess;
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.DataAccess.Repositories;
using MenswearStore.Api.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo { Title = "Menswear Store API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.OpenApiSecurityScheme
    {
        Type = Microsoft.OpenApi.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Enter your JWT token"
    });
    options.AddSecurityRequirement(doc => new Microsoft.OpenApi.OpenApiSecurityRequirement
    {
        [new Microsoft.OpenApi.OpenApiSecuritySchemeReference("Bearer", doc)] = new List<string>()
    });
});

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "DataProtectionKeys")));

// DataAccess
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ICartRepository, CartRepository>();
builder.Services.AddScoped<ISettingRepository, SettingRepository>();
builder.Services.AddScoped<IAdminRepository, AdminRepository>();
builder.Services.AddScoped<DataSeeder>();

// BusinessLogic
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<ISettingService, SettingService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAdminService, AdminService>();

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 6;
        options.Password.RequireDigit = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing.");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Menswear Store API v1");
        options.RoutePrefix = "swagger";
    });
}

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<DataSeeder>().SeedAsync();
}

app.Run();
```

- [ ] **Step 4: Update ProductsController**

Replace `MenswearStore.Api/Controllers/ProductsController.cs` with:

```csharp
using MenswearStore.Api.DTOs;
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.BusinessLogic.Models;
using MenswearStore.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(IProductService products) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetProducts(
        GenderTarget gender = GenderTarget.Men, int? categoryId = null, bool includeInactive = false)
    {
        var result = await products.GetProductsAsync(gender, categoryId, includeInactive, User.IsInRole("Admin"));
        return result.Select(p => p.ToDto()).ToArray();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductDto>> GetProduct(int id)
    {
        var product = await products.GetProductAsync(id, User.IsInRole("Admin"));
        return product is null ? NotFound() : product.ToDto();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(UpsertProductRequest request)
    {
        var product = await products.CreateAsync(ToData(request));
        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product.ToDto());
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductDto>> Update(int id, UpsertProductRequest request)
    {
        var product = await products.UpdateAsync(id, ToData(request));
        return product is null ? NotFound() : product.ToDto();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var deleted = await products.DeactivateAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private static ProductData ToData(UpsertProductRequest r) =>
        new(r.Name, r.Description, r.Price, r.DiscountPrice, r.CategoryId, r.GenderTarget,
            r.Sizes,
            r.Colors.Select(c => new ColorData(c.Name, c.HexCode)).ToArray(),
            r.Images.Select(i => new ImageData(i.Url, i.AltText, i.IsPrimary, i.SortOrder)).ToArray(),
            r.StockQuantity, r.IsActive);
}
```

- [ ] **Step 5: Update CategoriesController**

Replace `MenswearStore.Api/Controllers/CategoriesController.cs` with:

```csharp
using MenswearStore.Api.DTOs;
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.BusinessLogic.Models;
using MenswearStore.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(ICategoryService categories) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> Get(GenderTarget? gender = GenderTarget.Men)
    {
        var result = await categories.GetCategoriesAsync(gender, User.IsInRole("Admin"));
        return result.Select(c => c.ToDto()).ToArray();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(UpsertCategoryRequest request)
    {
        var category = await categories.CreateAsync(new CategoryData(
            request.Name, request.Slug, request.GenderTarget, request.IsEnabled, request.DisplayOrder));
        return CreatedAtAction(nameof(Get), new { id = category.Id }, category.ToDto());
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<CategoryDto>> Update(int id, UpsertCategoryRequest request)
    {
        var category = await categories.UpdateAsync(id, new CategoryData(
            request.Name, request.Slug, request.GenderTarget, request.IsEnabled, request.DisplayOrder));
        return category is null ? NotFound() : category.ToDto();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var disabled = await categories.DisableAsync(id);
        return disabled ? NoContent() : NotFound();
    }
}
```

- [ ] **Step 6: Update CartController**

Replace `MenswearStore.Api/Controllers/CartController.cs` with:

```csharp
using System.Security.Claims;
using MenswearStore.Api.DTOs;
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.BusinessLogic.Models;
using Microsoft.AspNetCore.Mvc;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CartController(ICartService cart) : ControllerBase
{
    private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet]
    public async Task<ActionResult<CartDto>> Get([FromQuery] string? guestId)
    {
        var result = await cart.GetOrCreateAsync(UserId, guestId);
        return result.ToDto();
    }

    [HttpPost("items")]
    public async Task<ActionResult<CartDto>> AddItem(AddCartItemRequest request)
    {
        try
        {
            var result = await cart.AddItemAsync(UserId, request.GuestId,
                new AddItemData(request.ProductId, request.Quantity, request.Size, request.Color));
            return result.ToDto();
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("items/{id:int}")]
    public async Task<ActionResult<CartDto>> UpdateItem(int id, UpdateCartItemRequest request)
    {
        try
        {
            var result = await cart.UpdateItemAsync(UserId, request.GuestId, id, request.Quantity);
            return result.ToDto();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("items/{id:int}")]
    public async Task<ActionResult<CartDto>> DeleteItem(int id, [FromQuery] string? guestId)
    {
        try
        {
            var result = await cart.RemoveItemAsync(UserId, guestId, id);
            return result.ToDto();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
```

- [ ] **Step 7: Update SettingsController**

Replace `MenswearStore.Api/Controllers/SettingsController.cs` with:

```csharp
using MenswearStore.Api.DTOs;
using MenswearStore.BusinessLogic.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController(ISettingService settings) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AppSettingDto>>> Get()
    {
        var result = await settings.GetAllAsync();
        return result.Select(s => s.ToDto()).ToArray();
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{key}")]
    public async Task<ActionResult<AppSettingDto>> Update(string key, UpdateSettingRequest request)
    {
        var setting = await settings.UpdateAsync(key, request.IsEnabled);
        return setting is null ? NotFound() : setting.ToDto();
    }
}
```

- [ ] **Step 8: Update AdminController**

Replace `MenswearStore.Api/Controllers/AdminController.cs` with:

```csharp
using MenswearStore.BusinessLogic.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController(IAdminService admin) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult> Dashboard()
    {
        var stats = await admin.GetDashboardAsync();
        return Ok(new
        {
            stats.ProductCount,
            stats.ActiveProducts,
            stats.CategoryCount,
            stats.Carts,
            stats.TogglesEnabled
        });
    }
}
```

- [ ] **Step 9: Update AuthController**

Replace `MenswearStore.Api/Controllers/AuthController.cs` with:

```csharp
using System.Security.Claims;
using MenswearStore.Api.DTOs;
using MenswearStore.BusinessLogic.Interfaces;
using MenswearStore.DataAccess;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    ITokenService tokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await userManager.AddToRoleAsync(user, "Customer");
        return await BuildAuthResponse(user);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null) return Unauthorized(new { message = "Invalid email or password." });

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded) return Unauthorized(new { message = "Invalid email or password." });

        return await BuildAuthResponse(user);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user is null) return Unauthorized();
        return await BuildUserDto(user);
    }

    [Authorize]
    [HttpPost("logout")]
    public ActionResult Logout() => Ok(new { message = "Logged out." });

    [HttpPost("reset-password")]
    public ActionResult ResetPassword(ResetPasswordRequest request) =>
        Ok(new { message = $"Password reset flow for {request.Email} will be connected to email delivery later." });

    [HttpPost("google-login")]
    public ActionResult GoogleLogin(GoogleLoginRequest request) =>
        StatusCode(StatusCodes.Status501NotImplemented,
            new { message = "Google login endpoint is prepared. Add OAuth client validation before enabling it." });

    private async Task<AuthResponse> BuildAuthResponse(ApplicationUser user) =>
        new(await tokenService.CreateTokenAsync(user), await BuildUserDto(user));

    private async Task<UserDto> BuildUserDto(ApplicationUser user) =>
        new(user.Id, user.Email ?? string.Empty, user.FirstName, user.LastName,
            (await userManager.GetRolesAsync(user)).ToArray());
}
```

- [ ] **Step 10: Update MappingExtensions.cs namespace imports**

Open `MenswearStore.Api/DTOs/MappingExtensions.cs` and update the using statements:

```csharp
// FROM:
using MenswearStore.Api.Entities;

// TO:
using MenswearStore.Domain.Entities;
```

Do the same for all other DTO files that reference entities:
- `AuthDtos.cs` — no entity imports needed
- `CartDtos.cs` — update entity import
- `CategoryDtos.cs` — update entity import
- `ProductDtos.cs` — update entity import
- `SettingDtos.cs` — no entity imports needed

- [ ] **Step 11: Build and fix any remaining namespace errors**

```powershell
dotnet build MenswearStore.Api\MenswearStore.Api.csproj
```

Fix any remaining `MenswearStore.Api.Entities` → `MenswearStore.Domain.Entities` or `MenswearStore.Api.Data` → `MenswearStore.DataAccess` references that the compiler flags.

- [ ] **Step 12: Run the application and test key endpoints**

```powershell
dotnet run --project MenswearStore.Api\MenswearStore.Api.csproj
```

Open `http://localhost:5126/swagger/index.html` and verify:
- `GET /api/products` returns product list
- `POST /api/auth/login` with `{"email":"admin@menswear.local","password":"Admin123!"}` returns a token
- `GET /api/admin/dashboard` with Bearer token returns stats

- [ ] **Step 13: Commit**

```powershell
git add MenswearStore.Api\
git commit -m "feat: refactor Api project to use service and repository interfaces"
```

---

## Task 7: Set Up MenswearStore.Migration

**Files:**
- Create: `MenswearStore.Migration/ApplicationDbContextFactory.cs`

The Migration project exists so you can run `dotnet ef` commands against a consistent startup project, without spinning up the full web app.

- [ ] **Step 1: Create the DbContextFactory**

```csharp
// MenswearStore.Migration/ApplicationDbContextFactory.cs
using MenswearStore.DataAccess;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace MenswearStore.Migration;

public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite("Data Source=../MenswearStore.Api/menswear.db")
            .Options;

        return new ApplicationDbContext(options);
    }
}
```

- [ ] **Step 2: Verify Migration project builds**

```powershell
dotnet build MenswearStore.Migration\MenswearStore.Migration.csproj
```

Expected: Build succeeded.

- [ ] **Step 3: Verify EF CLI can scaffold (dry run — no new migration needed)**

```powershell
dotnet ef dbcontext info --project MenswearStore.Migration\MenswearStore.Migration.csproj --startup-project MenswearStore.Migration\MenswearStore.Migration.csproj
```

Expected: prints `ApplicationDbContext` info without error.

- [ ] **Step 4: Commit**

```powershell
git add MenswearStore.Migration\
git commit -m "feat: add Migration project with design-time DbContext factory"
```

---

## Task 8: Set Up MenswearStore.Tests

**Files:**
- Create: `MenswearStore.Tests/Services/ProductServiceTests.cs`

Unit tests use Moq to mock repositories, so tests never touch SQLite.

- [ ] **Step 1: Write failing tests for ProductService**

```csharp
// MenswearStore.Tests/Services/ProductServiceTests.cs
using MenswearStore.BusinessLogic.Models;
using MenswearStore.BusinessLogic.Services;
using MenswearStore.DataAccess.Interfaces;
using MenswearStore.Domain.Entities;
using MockQueryable;
using Moq;

namespace MenswearStore.Tests.Services;

public class ProductServiceTests
{
    private readonly Mock<IProductRepository> _repoMock = new();
    private readonly ProductService _sut;

    public ProductServiceTests()
    {
        _sut = new ProductService(_repoMock.Object);
    }

    [Fact]
    public async Task GetProductsAsync_ExcludesInactiveForNonAdmin()
    {
        var products = new List<Product>
        {
            new() { Id = 1, Name = "Active", GenderTarget = GenderTarget.Men, IsActive = true },
            new() { Id = 2, Name = "Inactive", GenderTarget = GenderTarget.Men, IsActive = false }
        };
        _repoMock.Setup(r => r.Query()).Returns(products.AsQueryable().BuildMock());

        var result = await _sut.GetProductsAsync(GenderTarget.Men, null, false, isAdmin: false);

        Assert.Single(result);
        Assert.Equal("Active", result[0].Name);
    }

    [Fact]
    public async Task GetProductsAsync_IncludesInactiveForAdmin()
    {
        var products = new List<Product>
        {
            new() { Id = 1, Name = "Active", GenderTarget = GenderTarget.Men, IsActive = true },
            new() { Id = 2, Name = "Inactive", GenderTarget = GenderTarget.Men, IsActive = false }
        };
        _repoMock.Setup(r => r.Query()).Returns(products.AsQueryable().BuildMock());

        var result = await _sut.GetProductsAsync(GenderTarget.Men, null, includeInactive: true, isAdmin: true);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetProductAsync_ReturnsNull_WhenInactiveAndNotAdmin()
    {
        var product = new Product { Id = 1, IsActive = false };
        _repoMock.Setup(r => r.FindAsync(1)).ReturnsAsync(product);

        var result = await _sut.GetProductAsync(1, isAdmin: false);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetProductAsync_ReturnsProduct_WhenInactiveAndAdmin()
    {
        var product = new Product { Id = 1, IsActive = false };
        _repoMock.Setup(r => r.FindAsync(1)).ReturnsAsync(product);

        var result = await _sut.GetProductAsync(1, isAdmin: true);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task DeactivateAsync_ReturnsFalse_WhenNotFound()
    {
        _repoMock.Setup(r => r.FindAsync(99)).ReturnsAsync((Product?)null);

        var result = await _sut.DeactivateAsync(99);

        Assert.False(result);
    }

    [Fact]
    public async Task DeactivateAsync_SetsIsActiveFalse()
    {
        var product = new Product { Id = 1, IsActive = true };
        _repoMock.Setup(r => r.FindAsync(1)).ReturnsAsync(product);
        _repoMock.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        var result = await _sut.DeactivateAsync(1);

        Assert.True(result);
        Assert.False(product.IsActive);
    }
}
```

- [ ] **Step 2: Add MockQueryable package for async LINQ testing**

```powershell
dotnet add MenswearStore.Tests package MockQueryable.Moq --version 7.0.3
```

- [ ] **Step 3: Run tests to verify they pass**

```powershell
dotnet test MenswearStore.Tests\MenswearStore.Tests.csproj --verbosity normal
```

Expected: 6 tests passing, 0 failures.

- [ ] **Step 4: Commit**

```powershell
git add MenswearStore.Tests\
git commit -m "feat: add Tests project with ProductService unit tests"
```

---

## Task 9: Full Solution Smoke Test

- [ ] **Step 1: Build entire solution**

```powershell
dotnet build ..\MenswearStore.sln
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 2: Run all tests**

```powershell
dotnet test ..\MenswearStore.sln --verbosity normal
```

Expected: All tests pass.

- [ ] **Step 3: Start the API and verify end-to-end**

```powershell
dotnet run --project MenswearStore.Api\MenswearStore.Api.csproj
```

Verify these requests work (use Swagger at `http://localhost:5126/swagger`):
1. `GET /api/products` — returns seeded products
2. `GET /api/categories` — returns seeded categories
3. `POST /api/auth/login` body `{"email":"admin@menswear.local","password":"Admin123!"}` — returns token
4. `GET /api/admin/dashboard` with `Authorization: Bearer <token>` — returns counts
5. `GET /api/settings` — returns feature flags

- [ ] **Step 4: Final commit**

```powershell
git add .
git commit -m "feat: complete multi-project layered architecture refactor"
```

---

## Self-Review Checklist

- **Domain project** holds all entity POCOs (Product, Category, Cart, CartItem, Order, OrderItem, AppSetting, ProductImage, ProductSize, ProductColor, GenderTarget). No EF dependencies.
- **DataAccess** holds ApplicationUser (IdentityUser), ApplicationDbContext, DataSeeder, 5 repository interfaces + implementations, Migrations.
- **BusinessLogic** holds 6 service interfaces + implementations, service-layer request models (ProductData, CategoryData, AddItemData, DashboardStats).
- **Api** holds controllers (no DbContext injected), DTOs, MappingExtensions, ErrorHandlingMiddleware, Program.cs.
- **Migration** holds only ApplicationDbContextFactory (design-time EF tooling).
- **Tests** holds ProductService unit tests using Moq + MockQueryable.
- No controller touches DbContext directly — all go through service interfaces.
- No service touches DTOs — it uses service-layer models or domain entities.
- Existing migrations are preserved and moved to DataAccess — no data loss.
- SQLite is kept throughout.
