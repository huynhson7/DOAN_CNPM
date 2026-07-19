using Microsoft.EntityFrameworkCore;
// Đảm bảo import thư mục chứa các file Model nếu chúng nằm ở thư mục khác
// Ví dụ: using Backend.Models; 

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Khai báo danh sách các bảng trong Database
        public DbSet<NHANVIEN> NHANVIEN { get; set; }
        public DbSet<NHOMSANPHAM> NHOMSANPHAM { get; set; }
        public DbSet<MUCDICHSUDUNG> MUCDICHSUDUNG { get; set; }
        public DbSet<VATLIEU> VATLIEU { get; set; }
        public DbSet<NHACUNGCAP> NHACUNGCAP { get; set; }
    }
}