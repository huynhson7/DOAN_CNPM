using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("HOADON")]
    public class HOADON
    {
        [Key]
        [StringLength(15)]
        public string MaHD { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        public string MaNV { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        public string MaKhachHang { get; set; } = string.Empty;

        public DateTime? NgayLapHD { get; set; }

        public DateTime? NgayGiaoHang { get; set; }

        [StringLength(50)]
        public string? TrangThaiGiaoHang { get; set; }

        //---------------------------------------
        // Navigation
        //---------------------------------------
        [ForeignKey(nameof(MaNV))]
        public NHANVIEN? NhanVien { get; set; }

        [ForeignKey(nameof(MaKhachHang))]
        public KHACHHANG? KhachHang { get; set; }

        public ICollection<CHITIETHOADON> ChiTietHoaDons { get; set; } = new List<CHITIETHOADON>();
    }
}
