using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenswearStore.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameOrderNumberPrefix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The prefix changed from OD- to ON- (order number). Rename any numbers
            // already given out so every order uses the same style.
            migrationBuilder.Sql("""
                UPDATE "Orders"
                SET "OrderNumber" = 'ON-' || substring("OrderNumber" from 4)
                WHERE "OrderNumber" LIKE 'OD-%';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Orders"
                SET "OrderNumber" = 'OD-' || substring("OrderNumber" from 4)
                WHERE "OrderNumber" LIKE 'ON-%';
                """);
        }
    }
}
