using Backend.Data;
using Backend.DTOs;
using Backend.Helpers;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly IEmailService _emailService;
        private readonly IGoogleAuthService _googleAuthService;
        // PasswordHasher<object>: tham số generic <T> không ảnh hưởng tới thuật toán hash,
        // chỉ dùng object vì Backend có 2 loại tài khoản (NHANVIEN/KHACHHANG) muốn dùng chung 1 hasher.
        private readonly PasswordHasher<object> _passwordHasher = new();

        public AuthService(
            AppDbContext context,
            ITokenService tokenService,
            IEmailService emailService,
            IGoogleAuthService googleAuthService)
        {
            _context = context;
            _tokenService = tokenService;
            _emailService = emailService;
            _googleAuthService = googleAuthService;
        }

        // ================================================================
        // LOGIN
        // ================================================================
        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto)
        {
            var nhanVien = await _context.NHANVIEN.FirstOrDefaultAsync(nv =>
                nv.TenDangNhap == dto.Username || nv.Email == dto.Username);

            if (nhanVien != null)
            {
                if (string.IsNullOrEmpty(nhanVien.MatKhau) ||
                    _passwordHasher.VerifyHashedPassword(new object(), nhanVien.MatKhau, dto.Password) == PasswordVerificationResult.Failed)
                {
                    throw new AuthOperationException("Tên đăng nhập hoặc mật khẩu không chính xác!", 401);
                }

                if (nhanVien.TrangThai == 0)
                    throw new AuthOperationException("Tài khoản nhân viên đã bị khóa hoặc ngừng hoạt động.", 401);

                var token = _tokenService.GenerateToken(nhanVien.MaNV, nhanVien.TenDangNhap ?? string.Empty,
                    nhanVien.TenNV, nhanVien.Email, nhanVien.VaiTro, nhanVien.SecurityStamp);

                return new AuthResponseDto
                {
                    Token = token,
                    Role = nhanVien.VaiTro,
                    HoTen = nhanVien.TenNV,
                    MaUser = nhanVien.MaNV,
                    Email = nhanVien.Email
                };
            }

            var khachHang = await _context.KHACHHANG.FirstOrDefaultAsync(kh =>
                kh.TenDangNhap == dto.Username || kh.Email == dto.Username);

            if (khachHang != null)
            {
                if (string.IsNullOrEmpty(khachHang.MatKhau) ||
                    _passwordHasher.VerifyHashedPassword(new object(), khachHang.MatKhau, dto.Password) == PasswordVerificationResult.Failed)
                {
                    throw new AuthOperationException("Tên đăng nhập hoặc mật khẩu không chính xác!", 401);
                }

                if (khachHang.TrangThai == 0)
                    throw new AuthOperationException("Tài khoản khách hàng đã bị khóa.", 401);

                var token = _tokenService.GenerateToken(khachHang.MaKhachHang, khachHang.TenDangNhap ?? string.Empty,
                    khachHang.TenKhachHang, khachHang.Email, khachHang.VaiTro, khachHang.SecurityStamp);

                return new AuthResponseDto
                {
                    Token = token,
                    Role = khachHang.VaiTro,
                    HoTen = khachHang.TenKhachHang,
                    MaUser = khachHang.MaKhachHang,
                    Email = khachHang.Email
                };
            }

            // Cố ý dùng chung 1 thông báo cho "không tìm thấy" và "sai mật khẩu" ở trên
            // để tránh lộ thông tin tài khoản nào tồn tại trong hệ thống (User Enumeration).
            throw new AuthOperationException("Tên đăng nhập hoặc mật khẩu không chính xác!", 401);
        }

        // ================================================================
        // REGISTER (chỉ Khách hàng, luôn ép VaiTro = "Khách hàng")
        // ================================================================
        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto)
        {
            if (!PasswordPolicy.IsValidUsername(dto.Username))
                throw new AuthOperationException("Tên đăng nhập chỉ gồm chữ, số, dấu gạch dưới, độ dài 4-20 ký tự.");

            var passwordErrors = PasswordPolicy.Validate(dto.Password);
            if (passwordErrors.Count > 0)
                throw new AuthOperationException(string.Join(" ", passwordErrors));

            bool emailTrungKH = await _context.KHACHHANG.AnyAsync(x => x.Email == dto.Email);
            bool emailTrungNV = await _context.NHANVIEN.AnyAsync(x => x.Email == dto.Email);
            if (emailTrungKH || emailTrungNV)
                throw new AuthOperationException("Email này đã được sử dụng.", 409);

            bool usernameTrungKH = await _context.KHACHHANG.AnyAsync(x => x.TenDangNhap == dto.Username);
            bool usernameTrungNV = await _context.NHANVIEN.AnyAsync(x => x.TenDangNhap == dto.Username);
            if (usernameTrungKH || usernameTrungNV)
                throw new AuthOperationException("Tên đăng nhập đã tồn tại.", 409);

            bool sdtTrung = await _context.KHACHHANG.AnyAsync(x => x.SDTKhachHang == dto.SoDienThoai);
            if (sdtTrung)
                throw new AuthOperationException("Số điện thoại này đã được đăng ký.", 409);

            var maKhachHang = await GenerateNextIdAsync("KH", async prefix =>
                await _context.KHACHHANG.Select(x => x.MaKhachHang).Where(id => id.StartsWith(prefix)).ToListAsync());

            var khachHang = new KHACHHANG
            {
                MaKhachHang = maKhachHang,
                TenDangNhap = dto.Username,
                MatKhau = _passwordHasher.HashPassword(new object(), dto.Password),
                TenKhachHang = dto.HoTen,
                Email = dto.Email,
                SDTKhachHang = dto.SoDienThoai,
                VaiTro = "Khách hàng", // Ép cứng - người dùng KHÔNG được tự chọn Role
                SecurityStamp = Guid.NewGuid().ToString(),
                TrangThai = 1
            };

            _context.KHACHHANG.Add(khachHang);
            await _context.SaveChangesAsync();

            var token = _tokenService.GenerateToken(khachHang.MaKhachHang, khachHang.TenDangNhap!,
                khachHang.TenKhachHang, khachHang.Email, khachHang.VaiTro, khachHang.SecurityStamp);

            return new AuthResponseDto
            {
                Token = token,
                Role = khachHang.VaiTro,
                HoTen = khachHang.TenKhachHang,
                MaUser = khachHang.MaKhachHang,
                Email = khachHang.Email
            };
        }

        // ================================================================
        // GOOGLE LOGIN / REGISTER
        // ================================================================
        public async Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginRequestDto dto)
        {
            var payload = await _googleAuthService.ValidateAsync(dto.IdToken);
            if (payload == null)
                throw new AuthOperationException("Google Token không hợp lệ.", 401);

            var khachHang = await _context.KHACHHANG.FirstOrDefaultAsync(x => x.Email == payload.Email);

            if (khachHang == null)
            {
                // Email chưa tồn tại -> tạo tài khoản mới, luôn với VaiTro= KhachHang
                var maKhachHang = await GenerateNextIdAsync("KH", async prefix =>
                    await _context.KHACHHANG.Select(x => x.MaKhachHang).Where(id => id.StartsWith(prefix)).ToListAsync());

                khachHang = new KHACHHANG
                {
                    MaKhachHang = maKhachHang,
                    TenKhachHang = payload.DisplayName,
                    Email = payload.Email,
                    GoogleId = payload.GoogleId,
                    VaiTro = "Khách hàng", // Ép cứng - người dùng KHÔNG được tự chọn Role
                    SecurityStamp = Guid.NewGuid().ToString(),
                    TrangThai = 1
                    // TenDangNhap/MatKhau để null: tài khoản Google chỉ đăng nhập qua Google,
                    // tránh sinh mật khẩu giả rồi phải quản lý rủi ro lộ mật khẩu đó.
                };

                _context.KHACHHANG.Add(khachHang);
                await _context.SaveChangesAsync();
            }
            else
            {
                if (khachHang.TrangThai == 0)
                    throw new AuthOperationException("Tài khoản khách hàng đã bị khóa.", 401);

                // Liên kết GoogleId nếu tài khoản này trước đó đăng ký thường và giờ mới lần đầu dùng Google
                if (string.IsNullOrEmpty(khachHang.GoogleId))
                {
                    khachHang.GoogleId = payload.GoogleId;
                    await _context.SaveChangesAsync();
                }
            }

            var token = _tokenService.GenerateToken(khachHang.MaKhachHang, khachHang.TenDangNhap ?? string.Empty,
                khachHang.TenKhachHang, khachHang.Email, khachHang.VaiTro, khachHang.SecurityStamp);

            return new AuthResponseDto
            {
                Token = token,
                Role = khachHang.VaiTro,
                HoTen = khachHang.TenKhachHang,
                MaUser = khachHang.MaKhachHang,
                Email = khachHang.Email
            };
        }

        // ================================================================
        // FORGOT PASSWORD
        // ================================================================
        public async Task ForgotPasswordAsync(ForgotPasswordRequestDto dto, string frontendResetBaseUrl)
        {
            var nhanVien = await _context.NHANVIEN.FirstOrDefaultAsync(x => x.Email == dto.Email);
            var khachHang = nhanVien == null ? await _context.KHACHHANG.FirstOrDefaultAsync(x => x.Email == dto.Email) : null;

            // Không tìm thấy Email -> KHÔNG throw, âm thầm return để tránh lộ thông tin (User Enumeration).
            // Controller sẽ luôn trả về cùng 1 thông báo chung chung cho người dùng.
            if (nhanVien == null && khachHang == null)
                return;

            var userType = nhanVien != null ? "NV Bán Hàng" : "Khách hàng";
            var userId = nhanVien != null ? nhanVien.MaNV : khachHang!.MaKhachHang;

            var resetToken = new PASSWORDRESETTOKEN
            {
                Token = Guid.NewGuid().ToString("N"),
                Email = dto.Email,
                UserType = userType,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                ExpiredAt = DateTime.UtcNow.AddMinutes(5), // Hiệu lực đúng 5 phút theo yêu cầu
                IsUsed = false
            };

            _context.PASSWORDRESETTOKEN.Add(resetToken);
            await _context.SaveChangesAsync();

            var resetLink = $"{frontendResetBaseUrl.TrimEnd('/')}/reset-password.html?token={resetToken.Token}";
            Console.WriteLine(resetLink);
            var displayName = nhanVien != null ? nhanVien.TenNV : khachHang!.TenKhachHang;

            await _emailService.SendPasswordResetEmailAsync(dto.Email, displayName, resetLink);
        }

        // ================================================================
        // RESET PASSWORD
        // ================================================================
        public async Task ResetPasswordAsync(ResetPasswordRequestDto dto)
        {
            var passwordErrors = PasswordPolicy.Validate(dto.NewPassword);
            if (passwordErrors.Count > 0)
                throw new AuthOperationException(string.Join(" ", passwordErrors));

            var resetToken = await _context.PASSWORDRESETTOKEN.FirstOrDefaultAsync(x => x.Token == dto.Token);

            if (resetToken == null || resetToken.IsUsed)
                throw new AuthOperationException("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.", 400);

            if (resetToken.ExpiredAt < DateTime.UtcNow)
                throw new AuthOperationException("Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.", 400);

            var hashedPassword = _passwordHasher.HashPassword(new object(), dto.NewPassword);

            if (resetToken.UserType == "NV Bán Hàng")
            {
                var nhanVien = await _context.NHANVIEN.FirstOrDefaultAsync(x => x.MaNV == resetToken.UserId);
                if (nhanVien == null)
                    throw new AuthOperationException("Không tìm thấy tài khoản.", 404);

                nhanVien.MatKhau = hashedPassword;
                nhanVien.SecurityStamp = Guid.NewGuid().ToString(); // Thu hồi mọi JWT cũ
            }
            else
            {
                var khachHang = await _context.KHACHHANG.FirstOrDefaultAsync(x => x.MaKhachHang == resetToken.UserId);
                if (khachHang == null)
                    throw new AuthOperationException("Không tìm thấy tài khoản.", 404);

                khachHang.MatKhau = hashedPassword;
                khachHang.SecurityStamp = Guid.NewGuid().ToString(); // Thu hồi mọi JWT cũ
            }

            resetToken.IsUsed = true; // Token chỉ dùng được một lần

            await _context.SaveChangesAsync();
        }

        // ================================================================
        // CHANGE PASSWORD (đã đăng nhập)
        // ================================================================
        public async Task ChangePasswordAsync(string userId, string role, ChangePasswordRequestDto dto)
        {
            var passwordErrors = PasswordPolicy.Validate(dto.NewPassword);
            if (passwordErrors.Count > 0)
                throw new AuthOperationException(string.Join(" ", passwordErrors));

            var hashedPassword = _passwordHasher.HashPassword(new object(), dto.NewPassword);

            if (role == "NV Bán Hàng" || role == "Quản trị Hệ thống")
            {
                var nhanVien = await _context.NHANVIEN.FirstOrDefaultAsync(x => x.MaNV == userId);
                if (nhanVien == null)
                    throw new AuthOperationException("Không tìm thấy tài khoản.", 404);

                nhanVien.MatKhau = hashedPassword;
                nhanVien.SecurityStamp = Guid.NewGuid().ToString();
            }
            else
            {
                var khachHang = await _context.KHACHHANG.FirstOrDefaultAsync(x => x.MaKhachHang == userId);
                if (khachHang == null)
                    throw new AuthOperationException("Không tìm thấy tài khoản.", 404);

                khachHang.MatKhau = hashedPassword;
                khachHang.SecurityStamp = Guid.NewGuid().ToString();
            }

            await _context.SaveChangesAsync();
        }

        // ================================================================
        // Helper: sinh mã tiếp theo dạng "KH01", "NV01"... dựa trên mã lớn nhất hiện có
        // ================================================================
        private static async Task<string> GenerateNextIdAsync(string prefix, Func<string, Task<List<string>>> fetchExistingIds)
        {
            var existingIds = await fetchExistingIds(prefix);

            int maxNumber = 0;
            foreach (var id in existingIds)
            {
                var numericPart = id.Length > prefix.Length ? id[prefix.Length..] : string.Empty;
                if (int.TryParse(numericPart, out var number) && number > maxNumber)
                    maxNumber = number;
            }

            var nextNumber = maxNumber + 1;
            return $"{prefix}{nextNumber:D2}";
        }
    }
}
