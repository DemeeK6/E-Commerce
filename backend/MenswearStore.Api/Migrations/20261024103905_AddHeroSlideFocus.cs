using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenswearStore.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHeroSlideFocus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing photos keep the old fixed position: centre, 35% from the top.
            migrationBuilder.AddColumn<int>(
                name: "FocusX",
                table: "HeroSlides",
                type: "integer",
                nullable: false,
                defaultValue: 50);

            migrationBuilder.AddColumn<int>(
                name: "FocusY",
                table: "HeroSlides",
                type: "integer",
                nullable: false,
                defaultValue: 35);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FocusX",
                table: "HeroSlides");

            migrationBuilder.DropColumn(
                name: "FocusY",
                table: "HeroSlides");
        }
    }
}
