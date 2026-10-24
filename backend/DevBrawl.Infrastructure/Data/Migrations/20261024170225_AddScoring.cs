using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevBrawl.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddScoring : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CategoryRatings",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryRatings", x => new { x.UserId, x.CategoryId });
                    table.ForeignKey(
                        name: "FK_CategoryRatings_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CategoryRatings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlayerProgress",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TotalXp = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerProgress", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_PlayerProgress_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RatingChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    DuelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Before = table.Column<int>(type: "integer", nullable: false),
                    After = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RatingChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RatingChanges_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RatingChanges_Duels_DuelId",
                        column: x => x.DuelId,
                        principalTable: "Duels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RatingChanges_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "XpEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Amount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_XpEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_XpEvents_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CategoryRatings_CategoryId_Rating",
                table: "CategoryRatings",
                columns: new[] { "CategoryId", "Rating" });

            migrationBuilder.CreateIndex(
                name: "IX_RatingChanges_CategoryId",
                table: "RatingChanges",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_RatingChanges_DuelId_UserId_CategoryId",
                table: "RatingChanges",
                columns: new[] { "DuelId", "UserId", "CategoryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RatingChanges_UserId_CreatedAt",
                table: "RatingChanges",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_XpEvents_UserId_Source_SourceId",
                table: "XpEvents",
                columns: new[] { "UserId", "Source", "SourceId" },
                unique: true);

            // Users who signed up before ratings existed: 1000 in every category and 0 XP.
            // New users get the same rows from AuthService.SignupAsync.
            migrationBuilder.Sql("""
                INSERT INTO "CategoryRatings" ("UserId", "CategoryId", "Rating", "UpdatedAt")
                SELECT u."Id", c."Id", 1000, now()
                FROM "Users" u CROSS JOIN "Categories" c
                ON CONFLICT DO NOTHING;

                INSERT INTO "PlayerProgress" ("UserId", "TotalXp")
                SELECT u."Id", 0
                FROM "Users" u
                ON CONFLICT DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CategoryRatings");

            migrationBuilder.DropTable(
                name: "PlayerProgress");

            migrationBuilder.DropTable(
                name: "RatingChanges");

            migrationBuilder.DropTable(
                name: "XpEvents");
        }
    }
}
