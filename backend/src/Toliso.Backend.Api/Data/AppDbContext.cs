using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<CreditCard> CreditCards => Set<CreditCard>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseShare> PurchaseShares => Set<PurchaseShare>();
    public DbSet<PurchaseOccurrence> PurchaseOccurrences => Set<PurchaseOccurrence>();
    public DbSet<Entry> Entries => Set<Entry>();
    public DbSet<PushToken> PushTokens => Set<PushToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("citext");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
