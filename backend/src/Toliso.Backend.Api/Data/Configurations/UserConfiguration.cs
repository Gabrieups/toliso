using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users", t =>
        {
            t.HasCheckConstraint("ck_users_role", "role IN ('Admin','User')");
            t.HasCheckConstraint("ck_users_status", "status IN ('Active','Inactive')");
        });

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).HasColumnName("email").HasColumnType("citext").IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.Name).HasColumnName("name").IsRequired();
        builder.Property(u => u.PasswordHash).HasColumnName("password_hash").IsRequired();
        builder.Property(u => u.Role).HasColumnName("role").HasConversion<string>().IsRequired();
        builder.Property(u => u.Status).HasColumnName("status").HasConversion<string>().IsRequired();
        builder.Property(u => u.CreatedAt).HasColumnName("created_at");
        builder.Property(u => u.UpdatedAt).HasColumnName("updated_at");
    }
}
