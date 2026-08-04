using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Data;

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
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
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
            {
                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(error => error.Description)));
            }
        }

        if (!await userManager.IsInRoleAsync(user, role))
        {
            await userManager.AddToRoleAsync(user, role);
        }
    }

    private async Task SeedCatalogAsync()
    {
        if (await db.Categories.AnyAsync())
        {
            return;
        }

        var shirts = new Category { Name = "Shirts", Slug = "shirts", GenderTarget = GenderTarget.Men, DisplayOrder = 1 };
        var jackets = new Category { Name = "Jackets", Slug = "jackets", GenderTarget = GenderTarget.Men, DisplayOrder = 2 };
        var trousers = new Category { Name = "Trousers", Slug = "trousers", GenderTarget = GenderTarget.Men, DisplayOrder = 3 };
        db.Categories.AddRange(shirts, jackets, trousers);

        db.Products.AddRange(
            Product(
                "Oxford Cotton Shirt",
                "Clean everyday shirt in breathable cotton with a structured collar.",
                69,
                54,
                shirts,
                42,
                "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80",
                new[] { "S", "M", "L", "XL" },
                new[] { ("White", "#f6f4ee"), ("Sky", "#9fc5df") }),
            Product(
                "Tailored Overshirt",
                "Layer-ready overshirt with a relaxed fit and subtle utility pockets.",
                118,
                null,
                jackets,
                18,
                "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=900&q=80",
                new[] { "M", "L", "XL" },
                new[] { ("Olive", "#6f7355"), ("Black", "#111111") }),
            Product(
                "Tapered Wool Trousers",
                "Minimal tapered trousers for workdays, dinners, and easy weekend polish.",
                96,
                82,
                trousers,
                31,
                "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",
                new[] { "S", "M", "L", "XL" },
                new[] { ("Charcoal", "#363636"), ("Navy", "#1f2a44") }),
            Product(
                "Merino Knit Polo",
                "Soft knit polo with a refined drape and understated ribbed hem.",
                88,
                null,
                shirts,
                24,
                "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&w=900&q=80",
                new[] { "S", "M", "L" },
                new[] { ("Sand", "#c8b99d"), ("Forest", "#314536") }));

        await db.SaveChangesAsync();
    }

    private static Product Product(
        string name,
        string description,
        decimal price,
        decimal? discountPrice,
        Category category,
        int stock,
        string imageUrl,
        string[] sizes,
        (string Name, string Hex)[] colors)
    {
        return new Product
        {
            Name = name,
            Description = description,
            Price = price,
            DiscountPrice = discountPrice,
            Category = category,
            GenderTarget = GenderTarget.Men,
            StockQuantity = stock,
            Images = new List<ProductImage>
            {
                new() { Url = imageUrl, AltText = name, IsPrimary = true }
            },
            Sizes = sizes.Select(size => new ProductSize { Name = size }).ToList(),
            Colors = colors.Select(color => new ProductColor { Name = color.Name, HexCode = color.Hex }).ToList()
        };
    }

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
            if (!await db.AppSettings.AnyAsync(setting => setting.Key == key))
            {
                db.AppSettings.Add(new AppSetting { Key = key, Name = name, IsEnabled = enabled });
            }
        }

        await db.SaveChangesAsync();
    }
}
