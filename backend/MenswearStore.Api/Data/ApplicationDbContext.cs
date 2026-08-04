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
