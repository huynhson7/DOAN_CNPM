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

        // Ghi chú: cột này CHỈ dùng để hiển thị chức danh/khu vực phụ trách (VD: "Quản lý cửa hàng Q1"),
        // KHÔNG dùng để phân quyền. Phân quyền dùng cột VaiTro chuẩn hoá bên dưới.
        [StringLength(100)]
        //public string? VaiTroKhuVucPhuTrach { get; set; }

        //[StringLength(150)]
        public string? TrangThaiLamViec { get; set; }

        // [THÊM MỚI] Email bắt buộc, duy nhất - dùng cho Quên mật khẩu
        [Required(ErrorMessage = "Email không được để trống")]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        // [THÊM MỚI] Role chuẩn hoá dùng cho JWT/Authorize: chỉ nhận "Quản trị Hệ thống" hoặc "NV Bán Hàng"
        // Do Admin tạo tài khoản chọn qua Form Thêm Nhân viên, không hard-code, không tự đăng ký được.
        // LƯU Ý: cột này KHÁC với VaiTroKhuVucPhuTrach ở trên (chỉ hiển thị chức danh, có thể là "NV Kho"...).
        // VaiTro là cột DUY NHẤT quyết định quyền hạn thật sự (dùng trong [Authorize(Roles=...)]).
        [Required]
        [StringLength(20)]
        public string VaiTro { get; set; } = "NV Bán Hàng";

        // [THÊM MỚI] Dùng để thu hồi JWT khi đổi/reset mật khẩu
        [StringLength(50)]
        public string SecurityStamp { get; set; } = Guid.NewGuid().ToString();

        public int? TrangThai { get; set; }
    }
}