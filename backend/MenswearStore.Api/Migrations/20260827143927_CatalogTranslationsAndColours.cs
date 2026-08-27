using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenswearStore.Api.Migrations
{
    /// <inheritdoc />
    public partial class CatalogTranslationsAndColours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Rename Categories.Name -> NameEn. EF's diff scaffolded this as a rename to
            // NameRu (matching the wrong new column) - corrected here to NameEn so existing
            // English category names land in the right column instead of the Russian one.
            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Categories",
                newName: "NameEn");

            // 2. Add the remaining translation columns.
            migrationBuilder.AddColumn<string>(
                name: "NameKa",
                table: "Categories",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NameRu",
                table: "Categories",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            // 3. Create the shared Colors table.
            migrationBuilder.CreateTable(
                name: "Colors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    NameEn = table.Column<string>(type: "TEXT", nullable: false),
                    NameKa = table.Column<string>(type: "TEXT", nullable: false),
                    NameRu = table.Column<string>(type: "TEXT", nullable: false),
                    HexCode = table.Column<string>(type: "TEXT", nullable: false),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Colors", x => x.Id);
                });

            // 4. Add the new FK columns (ProductColors.ColorId non-nullable for now - backfilled
            // below before any NOT NULL constraint would reject existing rows; ProductImages.ColorId
            // is nullable since existing images have no colour).
            migrationBuilder.AddColumn<int>(
                name: "ColorId",
                table: "ProductColors",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ColorId",
                table: "ProductImages",
                type: "INTEGER",
                nullable: true);

            // 5. Backfill: copy distinct (Name, HexCode) pairs from the old free-text ProductColors
            // columns into the new shared Colors table, then point every ProductColors row at its
            // matching Color. This must run before the old columns are dropped.
            migrationBuilder.Sql(@"
                INSERT INTO Colors (NameEn, NameKa, NameRu, HexCode, DisplayOrder, IsEnabled)
                SELECT DISTINCT Name, '', '', HexCode, 0, 1
                FROM ProductColors
                WHERE Name IS NOT NULL AND TRIM(Name) <> '';");

            migrationBuilder.Sql(@"
                UPDATE ProductColors
                SET ColorId = COALESCE((
                    SELECT c.Id FROM Colors c
                    WHERE c.NameEn = ProductColors.Name AND c.HexCode = ProductColors.HexCode
                ), 0);");

            migrationBuilder.Sql(@"
                DELETE FROM ProductColors WHERE ColorId = 0;");

            migrationBuilder.Sql(@"
                UPDATE Categories SET NameKa = 'პერანგები', NameRu = 'Рубашки' WHERE Slug = 'shirts';
                UPDATE Categories SET NameKa = 'ქურთუკები', NameRu = 'Куртки' WHERE Slug = 'jackets';
                UPDATE Categories SET NameKa = 'შარვლები', NameRu = 'Брюки' WHERE Slug = 'trousers';");

            // 6. Only now drop the old free-text columns, after their data has been migrated.
            migrationBuilder.DropColumn(
                name: "HexCode",
                table: "ProductColors");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "ProductColors");

            // 7. Indexes and foreign keys.
            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_ColorId",
                table: "ProductImages",
                column: "ColorId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductColors_ColorId",
                table: "ProductColors",
                column: "ColorId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductColors_Colors_ColorId",
                table: "ProductColors",
                column: "ColorId",
                principalTable: "Colors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductImages_Colors_ColorId",
                table: "ProductImages",
                column: "ColorId",
                principalTable: "Colors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductColors_Colors_ColorId",
                table: "ProductColors");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductImages_Colors_ColorId",
                table: "ProductImages");

            migrationBuilder.DropTable(
                name: "Colors");

            migrationBuilder.DropIndex(
                name: "IX_ProductImages_ColorId",
                table: "ProductImages");

            migrationBuilder.DropIndex(
                name: "IX_ProductColors_ColorId",
                table: "ProductColors");

            migrationBuilder.DropColumn(
                name: "ColorId",
                table: "ProductImages");

            migrationBuilder.DropColumn(
                name: "ColorId",
                table: "ProductColors");

            // Colour data cannot be perfectly restored (the original ProductColors.Name/HexCode
            // values are gone once dropped in Up()); the columns are recreated empty. Category
            // translations (NameKa/NameRu) are dropped; NameEn is renamed back to Name.
            migrationBuilder.DropColumn(
                name: "NameKa",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "NameRu",
                table: "Categories");

            migrationBuilder.RenameColumn(
                name: "NameEn",
                table: "Categories",
                newName: "Name");

            migrationBuilder.AddColumn<string>(
                name: "HexCode",
                table: "ProductColors",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "ProductColors",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }
    }
}
