using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    // ============================================================
    // LOGIN
    // ============================================================
    public class LoginRequestDto
    {
        [Required(ErrorMessage = "Vui lòng nhập tên đăng nhập hoặc email")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập mật khẩu")]
        public string Password { get; set; } = string.Empty;
    }

    // ============================================================
    // REGISTER (Chỉ dành cho Khách hàng tự đăng ký)
    // Cố ý KHÔNG có field Role/TrangThai/MaKhachHang để tránh Mass Assignment
    // ============================================================
    public class RegisterRequestDto
    {
        [Required(ErrorMessage = "Họ tên không được để trống")]
        [StringLength(100)]
        public string HoTen { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email không được để trống")]
        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Số điện thoại không được để trống")]
        [StringLength(15)]
        public string SoDienThoai { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên đăng nhập không được để trống")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu không được để trống")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng xác nhận mật khẩu")]
        [Compare(nameof(Password), ErrorMessage = "Mật khẩu xác nhận không khớp")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    // ============================================================
    // GOOGLE LOGIN / REGISTER (dùng chung 1 endpoint theo đúng chuẩn OAuth)
    // ============================================================
    public class GoogleLoginRequestDto
    {
        [Required(ErrorMessage = "Thiếu Google ID Token")]
        public string IdToken { get; set; } = string.Empty;
    }

    // ============================================================
    // FORGOT PASSWORD
    // ============================================================
    public class ForgotPasswordRequestDto
    {
        [Required(ErrorMessage = "Vui lòng nhập Email")]
        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        public string Email { get; set; } = string.Empty;
    }

    // ============================================================
    // RESET PASSWORD
    // ============================================================
    public class ResetPasswordRequestDto
    {
        [Required(ErrorMessage = "Thiếu Token")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu mới không được để trống")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng xác nhận mật khẩu")]
        [Compare(nameof(NewPassword), ErrorMessage = "Mật khẩu xác nhận không khớp")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    // ============================================================
    // CHANGE PASSWORD (đã đăng nhập, không cần nhập mật khẩu cũ theo yêu cầu)
    // ============================================================
    public class ChangePasswordRequestDto
    {
        [Required(ErrorMessage = "Mật khẩu mới không được để trống")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng xác nhận mật khẩu")]
        [Compare(nameof(NewPassword), ErrorMessage = "Mật khẩu xác nhận không khớp")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    // ============================================================
    // Response chuẩn hoá trả về sau khi Login/Register/Google thành công
    // ============================================================
    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "Quản trị Hệ thống" | "NV Bán Hàng" | "Khách hàng"
        public string HoTen { get; set; } = string.Empty;
        public string MaUser { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    // ============================================================
    // Admin tạo tài khoản Nhân viên (chọn Role tường minh, không tự đăng ký được)
    // ============================================================
    public class CreateNhanVienDto
    {
        [Required(ErrorMessage = "Tên nhân viên không được để trống")]
        [StringLength(50)]
        public string TenNV { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email không được để trống")]
        [EmailAddress]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên đăng nhập không được để trống")]
        public string TenDangNhap { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu không được để trống")]
        public string MatKhau { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng xác nhận mật khẩu")]
        [Compare(nameof(MatKhau), ErrorMessage = "Mật khẩu xác nhận không khớp")]
        public string ConfirmMatKhau { get; set; } = string.Empty;

        public DateTime? NgaySinh { get; set; }
        public string? GioiTinh { get; set; }
        public string? SoDT { get; set; }
        public string? DiaChiNV { get; set; }

        // Mô tả chức danh/khu vực hiển thị - KHÔNG dùng để phân quyền
        public string? VaiTroKhuVucPhuTrach { get; set; }

        /// <summary>
        /// Admin chọn 1 trong 2: "Quản trị Hệ thống" (Quản lý cửa hàng) hoặc "NV Bán Hàng" (Nhân viên cửa hàng).
        /// Đây là field duy nhất quyết định quyền hạn thật sự trong JWT.
        /// </summary>
        [Required(ErrorMessage = "Vui lòng chọn vai trò cho nhân viên")]
        [RegularExpression("^(Quản trị Hệ thống|NV Bán Hàng)$", ErrorMessage = "Vai trò không hợp lệ")]
        public string VaiTro { get; set; } = string.Empty;
    }
}
