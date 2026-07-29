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

        // Lưu đường dẫn tương đối (vd: /images/xxx.jpg) tới file ảnh vật lý trong
        // wwwroot/images. Khi chuyển dự án sang máy khác cần copy theo cả thư mục
        // wwwroot/images (không chỉ Database) để ảnh hiển thị đầy đủ.
        // Giữ kiểu nvarchar(max) để tương thích ngược với dữ liệu Base64 cũ (nếu có).
        [Column(TypeName = "nvarchar(max)")]
        public string? HinhAnh { get;set;}

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
