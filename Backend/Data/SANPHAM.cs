using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("SANPHAM")]
    public class SANPHAM
    {
        [Key]
        [StringLength(15)]
        public string MaSP { get;set;} = string.Empty;

        [Required]
        [StringLength(15)]
        public string MaMD { get;set;} = string.Empty;

        [Required]
        [StringLength(15)]
        public string MaNhomSP { get;set;} = string.Empty;

        [StringLength(100)]
        public string? TenSP { get;set;}

        [StringLength(50)]
        public string? DonViTinh { get;set;}

        public int? SoLuongTon { get;set;}

        [Column(TypeName="decimal(18,2)")]
        public decimal? GiaBan { get;set;}

        [StringLength(200)]
        public string? MoTa { get;set;}

        // Secure URL của ảnh sản phẩm trên Cloudinary, dùng để hiển thị trực tiếp ở Frontend.
        // Ví dụ: https://res.cloudinary.com/xxx/image/upload/v123/Do_Noi_That/Table/abc123.webp
        // Giữ kiểu nvarchar(max) để tương thích ngược với dữ liệu cũ (đường dẫn local /images/...
        // của các sản phẩm chưa được migrate lên Cloudinary).
        [Column(TypeName = "nvarchar(max)")]
        public string? HinhAnh { get;set;}

        // Public ID của Cloudinary dùng để quản lý (xoá/di chuyển) asset. Chỉ Backend sử dụng,
        // không nhất thiết phải trả về Frontend. NULL với các sản phẩm chưa migrate.
        [StringLength(500)]
        public string? PublicId { get; set; }

        public int? TrangThai { get;set;}

        //---------------------------------------
        // Navigation
        //---------------------------------------

        [ForeignKey(nameof(MaMD))]
        public MUCDICHSUDUNG? MucDichSuDung { get; set; }

        [ForeignKey(nameof(MaNhomSP))]
        public NHOMSANPHAM? NhomSanPham { get; set; }

        public ICollection<LAMNEN> LamNens { get; set; } = new List<LAMNEN>();

        public ICollection<CUNGCAP> CungCaps { get; set; } = new List<CUNGCAP>();
    }
}
