using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Data.Configurations;

public class CreditCardConfiguration : IEntityTypeConfiguration<CreditCard>
{
    public void Configure(EntityTypeBuilder<CreditCard> builder)
    {
        builder.ToTable("credit_cards", t =>
        {
            t.HasCheckConstraint("ck_credit_cards_closing_day", "closing_day BETWEEN 1 AND 31");
            t.HasCheckConstraint("ck_credit_cards_due_day", "due_day BETWEEN 1 AND 31");
            t.HasCheckConstraint("ck_credit_cards_status", "status IN ('Active','Inactive')");
            t.HasCheckConstraint("ck_credit_cards_brand", "brand IN ('Visa','Mastercard','Elo','AmericanExpress')");
        });

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Name).HasColumnName("name").IsRequired();
        builder.Property(c => c.Bank).HasColumnName("bank").IsRequired();
        builder.Property(c => c.Brand).HasColumnName("brand").HasConversion<string>().IsRequired();
        builder.Property(c => c.Color).HasColumnName("color").IsRequired();
        builder.Property(c => c.Status).HasColumnName("status").HasConversion<string>().IsRequired();
        builder.Property(c => c.ClosingDay).HasColumnName("closing_day");
        builder.Property(c => c.DueDay).HasColumnName("due_day");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at");
    }
}
