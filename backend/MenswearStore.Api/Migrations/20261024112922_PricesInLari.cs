using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenswearStore.Api.Migrations
{
    /// <inheritdoc />
    public partial class PricesInLari : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Prices are now entered in lari. Lari orders placed before this stored their
            // amounts in dollars with the rate beside them, so convert those exactly.
            // Dollar orders keep their numbers: at a rate of 1 they still show correctly.
            migrationBuilder.Sql("""
                UPDATE "OrderItems" AS i
                SET "UnitPrice" = round(i."UnitPrice" * o."ExchangeRate", 2)
                FROM "Orders" AS o
                WHERE i."OrderId" = o."Id" AND o."Currency" = 'GEL' AND o."ExchangeRate" <> 1;

                UPDATE "Orders"
                SET "Total" = round("Total" * "ExchangeRate", 2)
                WHERE "Currency" = 'GEL' AND "ExchangeRate" <> 1;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Currency",
                table: "Orders",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "GEL",
                oldClrType: typeof(string),
                oldType: "character varying(3)",
                oldMaxLength: 3,
                oldDefaultValue: "USD");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Currency",
                table: "Orders",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "USD",
                oldClrType: typeof(string),
                oldType: "character varying(3)",
                oldMaxLength: 3,
                oldDefaultValue: "GEL");
        }
    }
}
