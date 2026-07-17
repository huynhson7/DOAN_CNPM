using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Sau này, các bảng dữ liệu (sản phẩm, vật liệu...) của Ninh làm 
        // sẽ được khai báo ở đây dưới dạng DbSet
    }
}