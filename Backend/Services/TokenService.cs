using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _configuration;

        public TokenService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateToken(string userId, string username, string fullName, string email, string role, string securityStamp)
        {
            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!);
            var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "120");

            var claims = new List<Claim>
            {
                // UserId: định danh duy nhất người dùng (MaNV hoặc MaKhachHang) - dùng để BE tra cứu chủ sở hữu tài nguyên
                new Claim(ClaimTypes.NameIdentifier, userId),
                // Username: tên đăng nhập, hiển thị hoặc dùng để tra cứu lại tài khoản khi cần
                new Claim("Username", username),
                // FullName: họ tên đầy đủ để Frontend hiển thị ngay không cần gọi thêm API
                new Claim(ClaimTypes.Name, fullName),
                // Email: dùng để hiển thị và các thao tác liên quan tới email (không dùng để xác thực quyền)
                new Claim(ClaimTypes.Email, email),
                // Role: DUY NHẤT nguồn quyết định phân quyền phía Backend - luôn lấy từ Database
                new Claim(ClaimTypes.Role, role),
                // Jti: định danh duy nhất của token, hỗ trợ truy vết/log
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                // SecurityStamp: dùng để thu hồi token khi đổi/reset mật khẩu (so sánh với DB ở middleware)
                new Claim("SecurityStamp", securityStamp)
            };

            var tokenDescriptor = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                // Expiration: thời điểm token hết hạn - claim "exp" chuẩn JWT, ASP.NET tự kiểm tra qua ValidateLifetime
                expires: DateTime.UtcNow.AddMinutes(expireMinutes),
                signingCredentials: new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            );

            return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
        }
    }
}
