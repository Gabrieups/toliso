using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Toliso.Backend.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:citext", ",,");

            migrationBuilder.CreateTable(
                name: "credit_cards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    bank = table.Column<string>(type: "text", nullable: false),
                    brand = table.Column<string>(type: "text", nullable: false),
                    color = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    closing_day = table.Column<short>(type: "smallint", nullable: false),
                    due_day = table.Column<short>(type: "smallint", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credit_cards", x => x.Id);
                    table.CheckConstraint("ck_credit_cards_brand", "brand IN ('Visa','Mastercard','Elo','AmericanExpress')");
                    table.CheckConstraint("ck_credit_cards_closing_day", "closing_day BETWEEN 1 AND 31");
                    table.CheckConstraint("ck_credit_cards_due_day", "due_day BETWEEN 1 AND 31");
                    table.CheckConstraint("ck_credit_cards_status", "status IN ('Active','Inactive')");
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "citext", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                    table.CheckConstraint("ck_users_role", "role IN ('Admin','User')");
                    table.CheckConstraint("ck_users_status", "status IN ('Active','Inactive')");
                });

            migrationBuilder.CreateTable(
                name: "entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    entry_date = table.Column<DateOnly>(type: "date", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_entries", x => x.Id);
                    table.CheckConstraint("ck_entries_amount", "amount > 0");
                    table.ForeignKey(
                        name: "FK_entries_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "purchases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    card_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    total_amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    purchase_date = table.Column<DateOnly>(type: "date", nullable: false),
                    division_type = table.Column<string>(type: "text", nullable: false),
                    kind = table.Column<string>(type: "text", nullable: false),
                    total_installments = table.Column<short>(type: "smallint", nullable: true),
                    recurring_interval_months = table.Column<short>(type: "smallint", nullable: true),
                    recurring_ends_at = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchases", x => x.Id);
                    table.CheckConstraint("ck_purchases_division_type", "division_type IN ('Equal','Custom')");
                    table.CheckConstraint("ck_purchases_kind", "kind IN ('Single','Installment','Recurring')");
                    table.CheckConstraint("ck_purchases_total_amount", "total_amount > 0");
                    table.CheckConstraint("ck_purchases_total_installments", "kind <> 'Installment' OR (total_installments BETWEEN 2 AND 60)");
                    table.ForeignKey(
                        name: "FK_purchases_credit_cards_card_id",
                        column: x => x.card_id,
                        principalTable: "credit_cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchases_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "push_tokens",
                columns: table => new
                {
                    token = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    platform = table.Column<string>(type: "text", nullable: false),
                    device_name = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_push_tokens", x => x.token);
                    table.CheckConstraint("ck_push_tokens_platform", "platform IN ('Android','Ios','Web')");
                    table.ForeignKey(
                        name: "FK_push_tokens_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_occurrences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    purchase_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurrence_number = table.Column<int>(type: "integer", nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_occurrences", x => x.Id);
                    table.CheckConstraint("ck_purchase_occurrences_number", "occurrence_number >= 1");
                    table.ForeignKey(
                        name: "FK_purchase_occurrences_purchases_purchase_id",
                        column: x => x.purchase_id,
                        principalTable: "purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_shares",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    purchase_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    share_amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_shares", x => x.Id);
                    table.CheckConstraint("ck_purchase_shares_amount", "share_amount > 0");
                    table.ForeignKey(
                        name: "FK_purchase_shares_purchases_purchase_id",
                        column: x => x.purchase_id,
                        principalTable: "purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_shares_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_entries_entry_date",
                table: "entries",
                column: "entry_date");

            migrationBuilder.CreateIndex(
                name: "IX_entries_user_id",
                table: "entries",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_occurrences_due_date",
                table: "purchase_occurrences",
                column: "due_date");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_occurrences_purchase_id_occurrence_number",
                table: "purchase_occurrences",
                columns: new[] { "purchase_id", "occurrence_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_shares_purchase_id_user_id",
                table: "purchase_shares",
                columns: new[] { "purchase_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_shares_user_id",
                table: "purchase_shares",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_shares_one_primary_per_purchase",
                table: "purchase_shares",
                column: "purchase_id",
                unique: true,
                filter: "is_primary");

            migrationBuilder.CreateIndex(
                name: "IX_purchases_card_id",
                table: "purchases",
                column: "card_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchases_created_by_user_id",
                table: "purchases",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchases_purchase_date",
                table: "purchases",
                column: "purchase_date");

            migrationBuilder.CreateIndex(
                name: "IX_push_tokens_user_id",
                table: "push_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "entries");

            migrationBuilder.DropTable(
                name: "purchase_occurrences");

            migrationBuilder.DropTable(
                name: "purchase_shares");

            migrationBuilder.DropTable(
                name: "push_tokens");

            migrationBuilder.DropTable(
                name: "purchases");

            migrationBuilder.DropTable(
                name: "credit_cards");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
