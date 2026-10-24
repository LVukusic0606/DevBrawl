using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // Add a DbSet<T> per entity, e.g. public DbSet<Player> Players => Set<Player>();
}
