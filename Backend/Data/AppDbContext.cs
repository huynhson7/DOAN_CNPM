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
        public DbSet<KHACHHANG> KHACHHANG { get; set; }
        public DbSet<SANPHAM> SANPHAM { get; set; }
        public DbSet<LAMNEN> LAMNEN { get; set; }
        public DbSet<CUNGCAP> CUNGCAP { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            //=========================================================
            // LAM_NEN (SANPHAM - VATLIEU)
            //=========================================================
            modelBuilder.Entity<LAMNEN>()
                .HasKey(x => new { x.MaVL, x.MaSP });

            modelBuilder.Entity<LAMNEN>()
                .HasOne(x => x.VatLieu)
                .WithMany()
                .HasForeignKey(x => x.MaVL)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LAMNEN>()
                .HasOne(x => x.SanPham)
                .WithMany(x => x.LamNens)
                .HasForeignKey(x => x.MaSP)
                .OnDelete(DeleteBehavior.Cascade);

            //=========================================================
            // CUNG_CAP (SANPHAM - NHACUNGCAP)
            //=========================================================
            modelBuilder.Entity<CUNGCAP>()
                .HasKey(x => new { x.MaNcc, x.MaSP });

            modelBuilder.Entity<CUNGCAP>()
                .HasOne(x => x.NhaCungCap)
                .WithMany()
                .HasForeignKey(x => x.MaNcc)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CUNGCAP>()
                .HasOne(x => x.SanPham)
                .WithMany(x => x.CungCaps)
                .HasForeignKey(x => x.MaSP)
                .OnDelete(DeleteBehavior.Cascade);

            //=========================================================
            // SANPHAM -> NHOMSANPHAM
            //=========================================================
            modelBuilder.Entity<SANPHAM>()
                .HasOne(x => x.NhomSanPham)
                .WithMany()
                .HasForeignKey(x => x.MaNhomSP)
                .HasPrincipalKey(x => x.MaNhomSP)
                .OnDelete(DeleteBehavior.Restrict);

            //=========================================================
            // SANPHAM -> MUCDICHSUDUNG
            //=========================================================
            modelBuilder.Entity<SANPHAM>()
                .HasOne(x => x.MucDichSuDung)
                .WithMany()
                .HasForeignKey(x => x.MaMD)
                .HasPrincipalKey(x => x.MaMD)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}