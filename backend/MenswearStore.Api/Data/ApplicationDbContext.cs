using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductSize> ProductSizes => Set<ProductSize>();
    public DbSet<ProductColor> ProductColors => Set<ProductColor>();
    public DbSet<Color> Colors => Set<Color>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<InfoSection> InfoSections => Set<InfoSection>();
    public DbSet<HomeHero> HomeHeroes => Set<HomeHero>();
    public DbSet<HeroSlide> HeroSlides => Set<HeroSlide>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Category>()
            .HasIndex(category => category.Slug)
            .IsUnique();

        builder.Entity<AppSetting>()
            .HasIndex(setting => setting.Key)
            .IsUnique();

        // One account per bank: the checkout picker shows exactly one option per bank.
        builder.Entity<BankAccount>()
            .HasIndex(account => account.Bank)
            .IsUnique();

        builder.Entity<InfoSection>()
            .HasIndex(section => section.Key)
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

        // Deleting a product must never remove lines from past orders; it only
        // unlinks them. (Cart lines still go with the product.)
        builder.Entity<OrderItem>()
            .HasOne(item => item.Product)
            .WithMany()
            .HasForeignKey(item => item.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Order>()
            .Property(order => order.OrderNumber)
            .HasMaxLength(20);

        // The generator retries on a clash; this index is the guarantee.
        builder.Entity<Order>()
            .HasIndex(order => order.OrderNumber)
            .IsUnique();

        builder.Entity<Order>()
            .Property(order => order.Currency)
            .HasMaxLength(3)
            .HasDefaultValue("GEL");

        // Older orders were all in dollars; the migration fills their rate with 1.
        builder.Entity<Order>()
            .Property(order => order.ExchangeRate)
            .HasPrecision(10, 4);

        builder.Entity<Order>()
            .Ignore(order => order.TotalInCurrency);

        // Orders placed before languages were recorded get English emails.
        builder.Entity<Order>()
            .Property(order => order.Language)
            .HasMaxLength(2)
            .HasDefaultValue("en");

        builder.Entity<OrderItem>()
            .Property(item => item.UnitPrice)
            .HasPrecision(10, 2);

        builder.Entity<ProductImage>()
            .HasOne(image => image.Color)
            .WithMany(color => color.Images)
            .HasForeignKey(image => image.ColorId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
