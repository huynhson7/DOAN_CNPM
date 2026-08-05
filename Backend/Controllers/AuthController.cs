using Backend.DTOs;
using Backend.Helpers;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IConfiguration _configuration;

        public AuthController(IAuthService authService, IConfiguration configuration)
        {
            _authService = authService;
            _configuration = configuration;
        }

        // POST: api/auth/login
        // Màn hình đăng nhập DUY NHẤT cho cả Admin/NhanVien/KhachHang - Backend tự xác định Role.
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _authService.LoginAsync(request);
                return Ok(result);
            }
            catch (AuthOperationException ex)
            {
                return StatusCode(ex.StatusCode, new { message = ex.Message });
            }
        }

        // POST: api/auth/register
        // Đăng ký công khai - CHỈ dành cho Khách hàng, Role luôn = KhachHang, không nhận input Role từ Client.
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _authService.RegisterAsync(request);
                return Ok(result);
            }
            catch (AuthOperationException ex)
            {
                return StatusCode(ex.StatusCode, new { message = ex.Message });
            }
        }

        // POST: api/auth/google
        // Dùng chung cho cả Google Login lẫn Google Register theo đúng chuẩn OAuth
        // (Backend tự kiểm tra Email đã tồn tại hay chưa để quyết định tạo mới hay đăng nhập).
        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _authService.GoogleLoginAsync(request);
                return Ok(result);
            }
            catch (AuthOperationException ex)
            {
                return StatusCode(ex.StatusCode, new { message = ex.Message });
            }
        }

        // POST: api/auth/forgot-password
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Gốc URL của Frontend để dựng link reset - lấy từ cấu hình, không cho Client tự truyền lên
            // (tránh Open Redirect / Host Header Injection).
            //var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? "http://127.0.0.1:5500/DOAN_CNPM/Frontend";

            // [SỬA LẦN 2] Hệ thống hiện chạy bằng Docker + Nginx (xem docker-compose.yml), Nginx đang
            // mount thẳng thư mục "./Frontend" làm root ("/usr/share/nginx/html"), KHÔNG còn tiền tố
            // "/DOAN_CNPM/Frontend" như thời chạy Live Server nữa. Do đó trang "reset-password.html"
            // thực tế nằm ở "http://127.0.0.1:5500/html/reset-password.html" - tiền tố đúng là "/html".
            var frontendBaseUrl = "http://127.0.0.1:5500/html";

            await _authService.ForgotPasswordAsync(request, frontendBaseUrl);

            // Luôn trả về cùng 1 thông báo dù Email có tồn tại hay không - không tiết lộ thông tin tài khoản.
            return Ok(new { message = "Nếu Email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu." });
        }

        // POST: api/auth/reset-password
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                await _authService.ResetPasswordAsync(request);
                return Ok(new { message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
            }
            catch (AuthOperationException ex)
            {
                return StatusCode(ex.StatusCode, new { message = ex.Message });
            }
        }

        // POST: api/auth/change-password
        // Yêu cầu đã đăng nhập. Không yêu cầu nhập mật khẩu hiện tại (theo đúng yêu cầu nghiệp vụ).
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var role = User.FindFirstValue(ClaimTypes.Role);

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(role))
                return Unauthorized();

            try
            {
                await _authService.ChangePasswordAsync(userId, role, request);
                return Ok(new { message = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });
            }
            catch (AuthOperationException ex)
            {
                return StatusCode(ex.StatusCode, new { message = ex.Message });
            }
        }
    }
}