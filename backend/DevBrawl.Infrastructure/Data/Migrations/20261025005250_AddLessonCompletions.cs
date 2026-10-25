using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevBrawl.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLessonCompletions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LessonCompletions",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LessonId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonCompletions", x => new { x.UserId, x.LessonId });
                    table.ForeignKey(
                        name: "FK_LessonCompletions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LessonCompletions");
        }
    }
}
