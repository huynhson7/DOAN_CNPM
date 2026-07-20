using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("KHACHHANG")]
    public class KHACHHANG
    {
        [Key]
        [StringLength(15)]
        public string MaKhachHang { get; set; } = string.Empty;

        [StringLength(50)]
        public string? TenDangNhap { get; set; }

        [StringLength(100)]
        public string? MatKhau { get; set; }

        [Required(ErrorMessage = "Tên khách hàng không được để trống")]
        [StringLength(100)]
        public string TenKhachHang { get; set; } = string.Empty;

        [StringLength(15)]
        public string? SDTKhachHang { get; set; }

        [StringLength(255)]
        public string? DiaChiKhachHang { get; set; }

        public int? TrangThai { get; set; }
    }
}