using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Data.Configurations;

public class PurchaseShareConfiguration : IEntityTypeConfiguration<PurchaseShare>
{
    public void Configure(EntityTypeBuilder<PurchaseShare> builder)
    {
        builder.ToTable("purchase_shares", t => t.HasCheckConstraint("ck_purchase_shares_amount", "share_amount > 0"));

        builder.HasKey(s => s.Id);
        builder.Property(s => s.PurchaseId).HasColumnName("purchase_id").IsRequired();
        builder.Property(s => s.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(s => s.ShareAmount).HasColumnName("share_amount").HasPrecision(12, 2).IsRequired();
        builder.Property(s => s.IsPrimary).HasColumnName("is_primary");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");
        builder.Property(s => s.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => new { s.PurchaseId, s.UserId }).IsUnique();
        builder.HasIndex(s => s.UserId);
        builder.HasIndex(s => s.PurchaseId)
            .IsUnique()
            .HasFilter("is_primary")
            .HasDatabaseName("ix_purchase_shares_one_primary_per_purchase");
    }
}
