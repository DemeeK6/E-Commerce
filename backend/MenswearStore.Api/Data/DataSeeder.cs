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
        var categoriesBySlug = await GetOrSeedCategoriesAsync();
        var colorsByName = await GetOrSeedColorsAsync();
        BackfillColorTranslations(colorsByName.Values);
        await db.SaveChangesAsync();

        if (await db.Products.AnyAsync())
        {
            return;
        }

        var shirts = categoriesBySlug["shirts"];
        var jackets = categoriesBySlug["jackets"];
        var trousers = categoriesBySlug["trousers"];

        var white = colorsByName["White"];
        var sky = colorsByName["Sky"];
        var olive = colorsByName["Olive"];
        var black = colorsByName["Black"];
        var charcoal = colorsByName["Charcoal"];
        var navy = colorsByName["Navy"];
        var sand = colorsByName["Sand"];
        var forest = colorsByName["Forest"];

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
                new[] { white, sky }),
            Product(
                "Tailored Overshirt",
                "Layer-ready overshirt with a relaxed fit and subtle utility pockets.",
                118,
                106.20m,
                jackets,
                18,
                "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=900&q=80",
                new[] { "M", "L", "XL" },
                new[] { olive, black }),
            Product(
                "Tapered Wool Trousers",
                "Minimal tapered trousers for workdays, dinners, and easy weekend polish.",
                96,
                82,
                trousers,
                31,
                "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",
                new[] { "S", "M", "L", "XL" },
                new[] { charcoal, navy }),
            Product(
                "Merino Knit Polo",
                "Soft knit polo with a refined drape and understated ribbed hem.",
                88,
                null,
                shirts,
                24,
                "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&w=900&q=80",
                new[] { "S", "M", "L" },
                new[] { sand, forest }));

        await db.SaveChangesAsync();
    }

    private async Task<Dictionary<string, Category>> GetOrSeedCategoriesAsync()
    {
        var bySlug = (await db.Categories.ToListAsync()).ToDictionary(category => category.Slug, StringComparer.Ordinal);

        var desired = new (string NameEn, string NameKa, string NameRu, string Slug, GenderTarget GenderTarget, int DisplayOrder)[]
        {
            ("Shirts", "პერანგები", "Рубашки", "shirts", GenderTarget.Men, 1),
            ("Jackets", "ქურთუკები", "Куртки", "jackets", GenderTarget.Men, 2),
            ("Trousers", "შარვლები", "Брюки", "trousers", GenderTarget.Men, 3),

            ("Shirts", "პერანგები", "Рубашки", "women-shirts", GenderTarget.Women, 1),
            ("Jackets", "ქურთუკები", "Куртки", "women-jackets", GenderTarget.Women, 2),
            ("Trousers", "შარვლები", "Брюки", "women-trousers", GenderTarget.Women, 3),

            ("Shirts", "პერანგები", "Рубашки", "kids-shirts", GenderTarget.Kids, 1),
            ("Jackets", "ქურთუკები", "Куртки", "kids-jackets", GenderTarget.Kids, 2),
            ("Trousers", "შარვლები", "Брюки", "kids-trousers", GenderTarget.Kids, 3),
        };

        foreach (var (nameEn, nameKa, nameRu, slug, genderTarget, displayOrder) in desired)
        {
            if (bySlug.ContainsKey(slug))
            {
                continue;
            }

            var category = new Category
            {
                NameEn = nameEn,
                NameKa = nameKa,
                NameRu = nameRu,
                Slug = slug,
                GenderTarget = genderTarget,
                DisplayOrder = displayOrder
            };

            db.Categories.Add(category);
            bySlug[slug] = category;
        }

        return bySlug;
    }

    private async Task<Dictionary<string, Color>> GetOrSeedColorsAsync()
    {
        var byName = (await db.Colors.ToListAsync()).ToDictionary(color => color.NameEn, StringComparer.Ordinal);

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

        foreach (var (nameEn, nameKa, nameRu, hexCode, displayOrder) in desired)
        {
            if (byName.ContainsKey(nameEn))
            {
                continue;
            }

            var color = new Color
            {
                NameEn = nameEn,
                NameKa = nameKa,
                NameRu = nameRu,
                HexCode = hexCode,
                DisplayOrder = displayOrder
            };

            db.Colors.Add(color);
            byName[nameEn] = color;
        }

        return byName;
    }

    private static readonly Dictionary<string, (string NameKa, string NameRu)> KnownColorTranslations =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["White"] = ("თეთრი", "Белый"),
            ["Sky"] = ("ცისფერი", "Голубой"),
            ["Olive"] = ("ზეთისხილისფერი", "Оливковый"),
            ["Black"] = ("შავი", "Чёрный"),
            ["Charcoal"] = ("ნახშირისფერი", "Угольный"),
            ["Navy"] = ("მუქი ლურჯი", "Тёмно-синий"),
            ["Sand"] = ("ქვიშისფერი", "Песочный"),
            ["Forest"] = ("მუქი მწვანე", "Тёмно-зелёный"),
            ["Beige"] = ("კრემისფერი", "Бежевый"),
            ["Grey"] = ("ნაცრისფერი", "Серый"),
        };

    private static void BackfillColorTranslations(IEnumerable<Color> colors)
    {
        foreach (var color in colors)
        {
            if (!KnownColorTranslations.TryGetValue(color.NameEn, out var translation))
            {
                continue;
            }

            if (string.IsNullOrEmpty(color.NameKa))
            {
                color.NameKa = translation.NameKa;
            }

            if (string.IsNullOrEmpty(color.NameRu))
            {
                color.NameRu = translation.NameRu;
            }
        }
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
        Color[] colors)
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
            Colors = colors.Select(color => new ProductColor { Color = color }).ToList()
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
