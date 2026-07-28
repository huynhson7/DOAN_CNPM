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

        // [THÊM MỚI] Email bắt buộc, duy nhất - dùng cho Google OAuth và Quên mật khẩu
        [Required(ErrorMessage = "Email không được để trống")]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        // [THÊM MỚI] Role chuẩn hoá: chỉ nhận đúng 1 trong 3 giá trị "Quản trị Hệ thống" | "NV Bán Hàng" | "Khách hàng"
        // KHACHHANG luôn mặc định "Khách hàng" - không cho phép client tự set qua API đăng ký công khai
        [Required]
        [StringLength(20)]
        public string VaiTro { get; set; } = "Khách hàng";

        // [THÊM MỚI] Dùng để thu hồi JWT: mỗi lần đổi/reset mật khẩu sẽ sinh GUID mới
        // => mọi JWT phát hành trước đó (mang SecurityStamp cũ) sẽ bị middleware coi là không hợp lệ
        [StringLength(50)]
        public string SecurityStamp { get; set; } = Guid.NewGuid().ToString();

        // [THÊM MỚI] Định danh tài khoản Google liên kết (nếu đăng nhập/đăng ký qua Google). Null nếu chỉ dùng tài khoản thường
        [StringLength(100)]
        public string? GoogleId { get; set; }

        public int? TrangThai { get; set; }
    }
}