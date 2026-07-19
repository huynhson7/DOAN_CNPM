using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("NHANVIEN")]
    public class NHANVIEN
    {
        [Key]
        [StringLength(15)]
        public string MaNV { get; set; } = string.Empty;

        [StringLength(50)]
        public string? TenDangNhap { get; set; }

        [StringLength(100)]
        public string? MatKhau { get; set; }

        [Required(ErrorMessage = "Tên nhân viên không được để trống")]
        [StringLength(50)]
        public string TenNV { get; set; } = string.Empty;

        public DateTime? NgaySinh { get; set; }

        [StringLength(10)]
        public string? GioiTinh { get; set; }

        [StringLength(15)]
        public string? SoDT { get; set; }

        [StringLength(255)]
        public string? DiaChiNV { get; set; }

        [StringLength(100)]
        public string? VaiTroKhuVucPhuTrach { get; set; }

        [StringLength(150)]
        public string? TrangThaiLamViec { get; set; }

        public int? TrangThai { get; set; }
    }
}