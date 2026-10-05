using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Data.Configurations;

public class PurchaseOccurrenceConfiguration : IEntityTypeConfiguration<PurchaseOccurrence>
{
    public void Configure(EntityTypeBuilder<PurchaseOccurrence> builder)
    {
        builder.ToTable("purchase_occurrences", t => t.HasCheckConstraint("ck_purchase_occurrences_number", "occurrence_number >= 1"));

        builder.HasKey(o => o.Id);
        builder.Property(o => o.PurchaseId).HasColumnName("purchase_id").IsRequired();
        builder.Property(o => o.OccurrenceNumber).HasColumnName("occurrence_number").IsRequired();
        builder.Property(o => o.DueDate).HasColumnName("due_date").IsRequired();
        builder.Property(o => o.Amount).HasColumnName("amount").HasPrecision(12, 2).IsRequired();
        builder.Property(o => o.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(o => new { o.PurchaseId, o.OccurrenceNumber }).IsUnique();
        builder.HasIndex(o => o.DueDate);
    }
}
