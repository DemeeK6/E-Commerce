using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenswearStore.Api.Migrations
{
    /// <inheritdoc />
    public partial class ShopContactSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Kind",
                table: "AppSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // shop_phone and shop_email were seeded before Kind existed, so they default
            // to Toggle and would render as checkboxes. Everything under the shop_ prefix
            // carries text, never an on/off state.
            migrationBuilder.Sql(@"UPDATE ""AppSettings"" SET ""Kind"" = 1 WHERE ""Key"" LIKE 'shop\_%';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Kind",
                table: "AppSettings");
        }
    }
}
