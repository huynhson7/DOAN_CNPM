using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Data;
using System.Linq;
using System.Threading.Tasks;
using System;
using Backend.Services;
using Microsoft.Extensions.Caching.Memory; // Thư viện dùng để lưu tạm OTP

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly EmailService _emailService;
        private readonly IMemoryCache _cache; // Biến quản lý bộ nhớ tạm

        // Đã tiêm IMemoryCache vào hàm khởi tạo
        public AuthController(IConfiguration configuration, AppDbContext context, EmailService emailService, IMemoryCache cache)
        {
            _configuration = configuration;
            _context = context;
            _emailService = emailService;
            _cache = cache;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            string userRole = "";
            string hoTen = "";
            string maUser = "";

            var nhanVien = _context.NHANVIEN.FirstOrDefault(nv => nv.TenDangNhap == request.Username && nv.MatKhau == request.Password);
            
            if (nhanVien != null)
            {
                if (nhanVien.TrangThai == 0) 
                    return Unauthorized(new { message = "Tài khoản nhân viên đã bị khóa hoặc ngừng hoạt động." });
                
                userRole = string.IsNullOrWhiteSpace(nhanVien.VaiTroKhuVucPhuTrach) 
                            ? "Nhân viên" 
                            : nhanVien.VaiTroKhuVucPhuTrach.Trim(); 
                            
                hoTen = nhanVien.TenNV;
                maUser = nhanVien.MaNV;
            }
            else
            {
                var khachHang = _context.KHACHHANG.FirstOrDefault(kh => kh.TenDangNhap == request.Username && kh.MatKhau == request.Password);
                
                if (khachHang != null)
                {
                    if (khachHang.TrangThai == 0) 
                        return Unauthorized(new { message = "Tài khoản khách hàng đã bị khóa." });

                    userRole = "Khách hàng"; 
                    hoTen = khachHang.TenKhachHang;
                    maUser = khachHang.MaKhachHang;
                }
            }

            if (string.IsNullOrEmpty(userRole))
            {
                return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không chính xác!" });
            }

            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"]!);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, maUser),
                    new Claim("Username", request.Username),
                    new Claim(ClaimTypes.Name, hoTen ?? ""),
                    new Claim(ClaimTypes.Role, userRole),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
                }),
                Expires = DateTime.UtcNow.AddMinutes(120),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var jwtToken = tokenHandler.WriteToken(token);

            return Ok(new 
            { 
                token = jwtToken,
                role = userRole,
                hoTen = hoTen,
                maUser = maUser
            });
        }

        // ==========================================
        // 1. API ĐĂNG KÝ (Không gửi email nữa)
        // ==========================================
        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest request)
        {
            bool isExistInNV = _context.NHANVIEN.Any(nv => nv.TenDangNhap == request.TenDangNhap);
            bool isExistInKH = _context.KHACHHANG.Any(kh => kh.TenDangNhap == request.TenDangNhap);

            if (isExistInNV || isExistInKH)
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." });

            bool isEmailExist = _context.KHACHHANG.Any(kh => kh.Email == request.Email);
            if (isEmailExist)
                return BadRequest(new { message = "Email này đã được sử dụng cho một tài khoản khác." });

            string newMaKH = "KH" + DateTime.Now.ToString("yyMMddHHmmss");

            var newKhachHang = new KHACHHANG
            {
                MaKhachHang = newMaKH,
                TenKhachHang = request.TenKhachHang,
                SDTKhachHang = request.SDTKhachHang,
                TenDangNhap = request.TenDangNhap,
                MatKhau = request.MatKhau,
                Email = request.Email,
                TrangThai = 1 
            };

            _context.KHACHHANG.Add(newKhachHang);
            _context.SaveChanges();

            return Ok(new { message = "Đăng ký tài khoản thành công!" });
        }

        // ==========================================
        // 2. API QUÊN MẬT KHẨU - GỬI MÃ OTP VÀO EMAIL
        // ==========================================
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            // Kiểm tra xem email có tồn tại trong hệ thống không
            var user = _context.KHACHHANG.FirstOrDefault(k => k.Email == request.Email);
            if (user == null)
            {
                return NotFound(new { message = "Email này chưa được đăng ký trong hệ thống." });
            }

            Random random = new Random();
            string otpCode = random.Next(100000, 999999).ToString();

            // Lưu mã OTP vào bộ nhớ Cache, gắn với chìa khóa là Email, thời gian sống 5 phút
            _cache.Set(request.Email, otpCode, TimeSpan.FromMinutes(5));

            try
            {
                await _emailService.SendOtpEmailAsync(request.Email, otpCode);
                return Ok(new { message = "Mã xác nhận OTP đã được gửi đến email của bạn. Mã có hiệu lực trong 5 phút." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi gửi email: " + ex.Message });
            }
        }

        // ==========================================
        // 3. API XÁC THỰC MÃ OTP
        // ==========================================
        [HttpPost("verify-otp")]
        public IActionResult VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            // Lấy mã OTP từ bộ nhớ ra dựa theo Email
            if (_cache.TryGetValue(request.Email, out string? savedOtp))
            {
                // So sánh mã khách hàng nhập với mã trong bộ nhớ
                if (savedOtp == request.Otp)
                {
                    return Ok(new { message = "Xác nhận OTP thành công! Bạn có thể đặt lại mật khẩu." });
                }
            }
            
            return BadRequest(new { message = "Mã OTP nhập vào không đúng hoặc đã hết hạn." });
        }

        // ==========================================
        // ==========================================
        // 4. API ĐẶT LẠI MẬT KHẨU MỚI
        // ==========================================
        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var user = _context.KHACHHANG.FirstOrDefault(k => k.Email == request.Email);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản để đặt lại mật khẩu." });
            }

            // Cập nhật mật khẩu mới
            user.MatKhau = request.NewPassword;
            
            // BẮT BUỘC THÊM DÒNG NÀY ĐỂ ÉP EF CORE LƯU XUỐNG SQL SERVER
            _context.KHACHHANG.Update(user);

            _context.SaveChanges();

            // Xóa mã OTP khỏi bộ nhớ để không dùng lại được nữa
            _cache.Remove(request.Email);

            return Ok(new { message = "Đặt lại mật khẩu thành công! Hãy đăng nhập lại bằng mật khẩu mới." });
        }
    }

    // ==========================================
    // CÁC CLASS ĐẠI DIỆN DỮ LIỆU ĐẦU VÀO
    // ==========================================
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string TenKhachHang { get; set; } = string.Empty;
        public string SDTKhachHang { get; set; } = string.Empty;
        public string TenDangNhap { get; set; } = string.Empty;
        public string MatKhau { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty; 
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class VerifyOtpRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}