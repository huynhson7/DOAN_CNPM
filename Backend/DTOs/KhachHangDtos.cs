using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    // ============================================================
    // [SỬA - FIX BUG] Admin sửa hồ sơ Khách hàng qua PUT api/khach-hang/{id}.
    // Trước đây endpoint này nhận thẳng Entity KHACHHANG (có [Required] trên Email) nhưng
    // Form Sửa Khách hàng phía Admin không hề có ô Email -> mỗi lần Admin chỉ đổi Trạng Thái
    // rồi Lưu là bị ModelState tự động trả lỗi 400 (thiếu Email) trước khi vào tới Action.
    // Dùng DTO riêng, chỉ đúng những trường Admin thật sự được phép sửa theo tài liệu phân quyền:
    // Tên Đăng Nhập, Họ Tên, SĐT, Địa Chỉ, Trạng Thái. KHÔNG có MatKhau/Email/VaiTro để không thể
    // bị ghi đè qua endpoint này (Admin không được tự ý xem/sửa MatKhau của khách).
    // ============================================================
    public class UpdateKhachHangDto
    {
        [StringLength(50)]
        public string? TenDangNhap { get; set; }

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