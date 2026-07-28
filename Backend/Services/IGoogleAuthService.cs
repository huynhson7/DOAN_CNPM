namespace Backend.Services
{
    public class GooglePayload
    {
        public string Email { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public string GoogleId { get; set; } = string.Empty;
    }

    public interface IGoogleAuthService
    {
        /// <summary>
        /// Verify chữ ký + tính hợp lệ của Google ID Token với server Google (KHÔNG tự tin dữ liệu
        /// Frontend gửi lên mà không kiểm tra, tránh giả mạo token).
        /// Trả về null nếu token không hợp lệ.
        /// </summary>
        Task<GooglePayload?> ValidateAsync(string idToken);
    }
}
