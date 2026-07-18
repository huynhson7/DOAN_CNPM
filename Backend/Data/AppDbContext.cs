using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
        public DbSet<NHOMSANPHAM> NHOMSANPHAM { get; set; }
        public DbSet<VATLIEU> VATLIEU { get; set; }
        public DbSet<MUCDICHSUDUNG> MUCDICHSUDUNG { get; set; }
    }

    // Sau này, các bảng dữ liệu (sản phẩm, vật liệu...) của Ninh làm 
    // sẽ được khai báo ở đây dưới dạng DbSet
}
