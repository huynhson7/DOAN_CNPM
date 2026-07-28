using Microsoft.AspNetCore.Mvc;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Data;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthGoogleController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthGoogleController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto model)
        {
            try
            {
                if (model == null || string.IsNullOrEmpty(model.IdToken))
                {
                    return BadRequest(new { message = "Token không hợp lệ." });
                }

                // 1. Xác thực Google ID Token
                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new List<string> { "752944647798-uboq7mb4rco6hfrl8heo503tcens0kbq.apps.googleusercontent.com" }
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(model.IdToken, settings);
                string email = payload.Email;
                string name = payload.Name;

                // 2. Kiểm tra email trong bảng KHACHHANG
                var khachHang = await _context.KHACHHANG.FirstOrDefaultAsync(kh => kh.Email == email);

                if (khachHang != null)
                {
                    if (khachHang.TrangThai == 0) 
                        return Unauthorized(new { message = "Tài khoản khách hàng đã bị khóa." });
                }
                else
                {
                    // Tự động tạo tài khoản mới nếu đăng nhập Google lần đầu
                    string newMaKH = "KH" + DateTime.Now.ToString("yyMMddHHmmss");
                    khachHang = new KHACHHANG
                    {
                        MaKhachHang = newMaKH,
                        TenKhachHang = string.IsNullOrEmpty(name) ? email.Split('@')[0] : name,
                        TenDangNhap = email.Split('@')[0] + "_" + new Random().Next(100, 999),
                        Email = email,
                        MatKhau = Guid.NewGuid().ToString(), // Mật khẩu ngẫu nhiên vì dùng Google
                        TrangThai = 1
                    };
                    _context.KHACHHANG.Add(khachHang);
                    await _context.SaveChangesAsync();
                }

                // 3. Tạo JWT Token hệ thống (đồng bộ với cơ chế đăng nhập thường)
                var issuer = _configuration["Jwt:Issuer"];
                var audience = _configuration["Jwt:Audience"];
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"]!);

                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, khachHang.MaKhachHang),
                        new Claim("Username", khachHang.TenDangNhap ?? ""),
                        new Claim(ClaimTypes.Name, khachHang.TenKhachHang ?? ""),
                        new Claim(ClaimTypes.Role, "Khách hàng"),
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
                    message = "Đăng nhập Google thành công",
                    token = jwtToken,
                    role = "Khách hàng",
                    hoTen = khachHang.TenKhachHang,
                    maUser = khachHang.MaKhachHang
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Xác thực Google thất bại: " + ex.Message });
            }
        }
    }

    public class GoogleLoginDto
    {
        public string IdToken { get; set; } = string.Empty;
    }
}