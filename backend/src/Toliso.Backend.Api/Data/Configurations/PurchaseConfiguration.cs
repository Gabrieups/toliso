using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Data.Configurations;

public class PurchaseConfiguration : IEntityTypeConfiguration<Purchase>
{
    public void Configure(EntityTypeBuilder<Purchase> builder)
    {
        builder.ToTable("purchases", t =>
        {
            t.HasCheckConstraint("ck_purchases_total_amount", "total_amount > 0");
            t.HasCheckConstraint("ck_purchases_kind", "kind IN ('Single','Installment','Recurring')");
            t.HasCheckConstraint("ck_purchases_division_type", "division_type IN ('Equal','Custom')");
            t.HasCheckConstraint(
                "ck_purchases_total_installments",
                "kind <> 'Installment' OR (total_installments BETWEEN 2 AND 60)");
        });

        builder.HasKey(p => p.Id);
        builder.Property(p => p.CreatedByUserId).HasColumnName("created_by_user_id").IsRequired();
        builder.Property(p => p.CardId).HasColumnName("card_id").IsRequired();
        builder.Property(p => p.Title).HasColumnName("title").IsRequired();
        builder.Property(p => p.Description).HasColumnName("description");
        builder.Property(p => p.TotalAmount).HasColumnName("total_amount").HasPrecision(12, 2).IsRequired();
        builder.Property(p => p.PurchaseDate).HasColumnName("purchase_date").IsRequired();
        builder.Property(p => p.DivisionType).HasColumnName("division_type").HasConversion<string>().IsRequired();
        builder.Property(p => p.Kind).HasColumnName("kind").HasConversion<string>().IsRequired();
        builder.Property(p => p.TotalInstallments).HasColumnName("total_installments");
        builder.Property(p => p.RecurringIntervalMonths).HasColumnName("recurring_interval_months");
        builder.Property(p => p.RecurringEndsAt).HasColumnName("recurring_ends_at");
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne<CreditCard>().WithMany().HasForeignKey(p => p.CardId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.CardId);
        builder.HasIndex(p => p.PurchaseDate);
        builder.HasIndex(p => p.CreatedByUserId);

        builder.HasMany(p => p.Shares).WithOne(s => s.Purchase).HasForeignKey(s => s.PurchaseId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(p => p.Occurrences).WithOne(o => o.Purchase).HasForeignKey(o => o.PurchaseId).OnDelete(DeleteBehavior.Cascade);
    }
}
