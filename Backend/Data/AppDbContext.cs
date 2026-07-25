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
        public DbSet<HOADON> HOADON { get; set; }
        public DbSet<CHITIETHOADON> CHITIETHOADON { get; set; }
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

            //=========================================================
            // CHITIETHOADON (khóa chính kép: MaHD + MaChiTietHD)
            //=========================================================
            modelBuilder.Entity<CHITIETHOADON>()
                .HasKey(x => new { x.MaHD, x.MaChiTietHD });

            modelBuilder.Entity<CHITIETHOADON>()
                .HasOne(x => x.HoaDon)
                .WithMany(x => x.ChiTietHoaDons)
                .HasForeignKey(x => x.MaHD)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CHITIETHOADON>()
                .HasOne(x => x.SanPham)
                .WithMany()
                .HasForeignKey(x => x.MaSP)
                .OnDelete(DeleteBehavior.Restrict);

            //=========================================================
            // HOADON -> KHACHHANG / NHANVIEN
            //=========================================================
            modelBuilder.Entity<HOADON>()
                .HasOne(x => x.KhachHang)
                .WithMany()
                .HasForeignKey(x => x.MaKhachHang)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<HOADON>()
                .HasOne(x => x.NhanVien)
                .WithMany()
                .HasForeignKey(x => x.MaNV)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}