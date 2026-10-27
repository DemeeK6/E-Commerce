using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenswearStore.Api.Migrations
{
    /// <inheritdoc />
    public partial class ProductImageFocusPoint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FocusX",
                table: "ProductImages",
                type: "integer",
                nullable: false,
                // Centre, matching the entity. EF's own default of 0 would have
                // cropped every existing photo to its top-left corner.
                defaultValue: 50);

            migrationBuilder.AddColumn<int>(
                name: "FocusY",
                table: "ProductImages",
                type: "integer",
                nullable: false,
                defaultValue: 50);

            // Rows that already existed when the columns were added took the old
            // default of 0. Centre them, which is how they cropped before.
            migrationBuilder.Sql(
                @"UPDATE ""ProductImages"" SET ""FocusX"" = 50, ""FocusY"" = 50 WHERE ""FocusX"" = 0 AND ""FocusY"" = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FocusX",
                table: "ProductImages");

            migrationBuilder.DropColumn(
                name: "FocusY",
                table: "ProductImages");
        }
    }
}
