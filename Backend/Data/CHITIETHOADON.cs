using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("CHITIETHOADON")]
    public class CHITIETHOADON
    {
        [Key, Column(Order = 0)]
        [StringLength(15)]
        public string MaHD { get; set; } = string.Empty;

        [Key, Column(Order = 1)]
        [StringLength(20)]
        public string MaChiTietHD { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        public string MaSP { get; set; } = string.Empty;

        public int? SoLuongBan { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? DonGiaBan { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ThanhTien { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? GiamGia { get; set; }

        //---------------------------------------
        // Navigation
        //---------------------------------------
        [ForeignKey(nameof(MaHD))]
        public HOADON? HoaDon { get; set; }

        [ForeignKey(nameof(MaSP))]
        public SANPHAM? SanPham { get; set; }
    }
}
