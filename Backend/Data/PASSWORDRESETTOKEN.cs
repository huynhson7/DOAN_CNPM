using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    /// <summary>
    /// Lưu Reset Token cho chức năng "Quên mật khẩu".
    /// Mỗi token chỉ dùng được 1 lần và có hiệu lực đúng 5 phút (kiểm tra ở Service, không hard-code ở đây).
    /// UserType phân biệt token thuộc về NHANVIEN hay KHACHHANG vì 2 bảng account tách riêng.
    /// </summary>
    [Table("PASSWORDRESETTOKEN")]
    public class PASSWORDRESETTOKEN
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Token { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        // "NV Bán Hàng" hoặc "Khách hàng" - biết token này áp dụng để reset mật khẩu ở bảng NHANVIEN hay KHACHHANG
        [Required]
        [StringLength(20)]
        public string UserType { get; set; } = string.Empty;

        // Mã người dùng tương ứng (MaNV hoặc MaKhachHang) để cập nhật đúng bản ghi khi reset thành công
        [Required]
        [StringLength(15)]
        public string UserId { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime ExpiredAt { get; set; }

        public bool IsUsed { get; set; } = false;
    }
}
