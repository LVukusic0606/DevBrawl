using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace DevBrawl.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    Slug = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Description", "Name", "Slug", "SortOrder" },
                values: new object[,]
                {
                    { 1, "How clients and servers talk: HTTP, REST, status codes, headers, caching and network failures.", "APIs & Networking", "apis-networking", 1 },
                    { 2, "Storing and querying data: relational models, joins, indexes, transactions and query performance.", "Databases", "databases", 2 },
                    { 3, "Protecting systems and users: authentication, authorization, tokens and common vulnerabilities.", "Security", "security", 3 },
                    { 4, "Finding out why things break: reading logs, tracing requests and separating symptoms from root causes.", "Debugging", "debugging", 4 },
                    { 5, "Designing systems that scale: trade-offs, caching, queues, load balancing and reliability.", "System Design", "system-design", 5 },
                    { 6, "Where software runs: servers, containers, deployments, configuration and monitoring.", "Infrastructure", "infrastructure", 6 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                table: "Categories",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Categories");
        }
    }
}
