using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenswearStore.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHeroSubtitle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SubtitleEn",
                table: "HomeHeroes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SubtitleKa",
                table: "HomeHeroes",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SubtitleEn",
                table: "HomeHeroes");

            migrationBuilder.DropColumn(
                name: "SubtitleKa",
                table: "HomeHeroes");
        }
    }
}
