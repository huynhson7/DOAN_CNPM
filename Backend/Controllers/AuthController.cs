using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Data;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;

        public AuthController(IConfiguration configuration, AppDbContext context)
        {
            _configuration = configuration;
            _context = context;
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
                
                // ĐÃ SỬA: Xử lý dứt điểm chuỗi rỗng và khoảng trắng thừa
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
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}