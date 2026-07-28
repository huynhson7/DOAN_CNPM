using Backend.DTOs;

namespace Backend.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDto> LoginAsync(LoginRequestDto dto);

        Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto);

        Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginRequestDto dto);

        /// <summary>
        /// Luôn trả về thành công (không tiết lộ Email có tồn tại hay không), kể cả khi Email không tồn tại.
        /// frontendResetBaseUrl: gốc URL của trang Frontend để dựng link reset (VD: http://127.0.0.1:5500)
        /// </summary>
        Task ForgotPasswordAsync(ForgotPasswordRequestDto dto, string frontendResetBaseUrl);

        Task ResetPasswordAsync(ResetPasswordRequestDto dto);

        /// <summary>
        /// userId + role lấy từ Claims của JWT hiện tại (người dùng đã đăng nhập).
        /// </summary>
        Task ChangePasswordAsync(string userId, string role, ChangePasswordRequestDto dto);
    }
}
