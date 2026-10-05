using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Data.Configurations;

public class PushTokenConfiguration : IEntityTypeConfiguration<PushToken>
{
    public void Configure(EntityTypeBuilder<PushToken> builder)
    {
        builder.ToTable("push_tokens", t => t.HasCheckConstraint("ck_push_tokens_platform", "platform IN ('Android','Ios','Web')"));

        builder.HasKey(p => p.Token);
        builder.Property(p => p.Token).HasColumnName("token");
        builder.Property(p => p.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(p => p.Platform).HasColumnName("platform").HasConversion<string>().IsRequired();
        builder.Property(p => p.DeviceName).HasColumnName("device_name");
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne<User>().WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.UserId);
    }
}
