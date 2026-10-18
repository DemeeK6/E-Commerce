using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenswearStore.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OrderNumber",
                table: "Orders",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            // Existing orders get a number in the same style. Their own id stands in
            // for the random part, so the numbers are unique before the index is added.
            migrationBuilder.Sql("""
                UPDATE "Orders"
                SET "OrderNumber" = 'OD-' || to_char("CreatedAtUtc" + interval '4 hours', 'YYMMDD')
                                    || '-' || lpad("Id"::text, 4, '0');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderNumber",
                table: "Orders",
                column: "OrderNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_OrderNumber",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "OrderNumber",
                table: "Orders");
        }
    }
}
