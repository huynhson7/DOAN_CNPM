using Backend.Data;
using Backend.Options;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Bổ sung Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Cấu hình Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// [SỬA] Thu hẹp CORS: chỉ cho phép đúng domain Frontend đang chạy (thay vì AllowAnyOrigin)
// Đọc từ appsettings.json mục "Frontend:AllowedOrigins" để dễ đổi khi deploy.
var allowedOrigins = builder.Configuration.GetSection("Frontend:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://127.0.0.1:5500", "http://localhost:5500" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy",
        policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});

// [THÊM MỚI] Đăng ký các Service cho Authentication/Authorization
builder.Services.AddHttpClient(); // Cần cho GoogleAuthService gọi verify token
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();

// [THÊM MỚI] Cấu hình & Service Cloudinary cho chức năng quản lý hình ảnh sản phẩm.
// ApiKey/ApiSecret PHẢI được cấu hình qua User Secrets (development) hoặc Environment
// Variables (production) - xem hướng dẫn README, KHÔNG commit lên Git trong appsettings.json.
builder.Services.Configure<CloudinaryOptions>(builder.Configuration.GetSection(CloudinaryOptions.SectionName));
builder.Services.AddSingleton<ICloudinaryImageService, CloudinaryImageService>();

// Cấu hình JWT
var jwtKey = builder.Configuration["Jwt:Key"];
var keyBytes = Encoding.UTF8.GetBytes(jwtKey!);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes)
        };

        // [THÊM MỚI] Thu hồi JWT theo yêu cầu nghiệp vụ (đổi/reset mật khẩu => JWT cũ vô hiệu ngay lập tức)
        // bằng cách so sánh Claim "SecurityStamp" trong Token với giá trị mới nhất trong Database.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var securityStampClaim = context.Principal?.FindFirst("SecurityStamp")?.Value;
                var userId = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var role = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

                if (string.IsNullOrEmpty(securityStampClaim) || string.IsNullOrEmpty(userId))
                {
                    context.Fail("Token không hợp lệ.");
                    return;
                }

                var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                string? currentStamp = null;
                int? currentTrangThai = null;

                if (role == "Quản trị Hệ thống" || role == "NV Bán Hàng")
                {
                    var nv = await dbContext.NHANVIEN.FindAsync(userId);
                    currentStamp = nv?.SecurityStamp;
                    currentTrangThai = nv?.TrangThai;
                }
                else
                {
                    var kh = await dbContext.KHACHHANG.FindAsync(userId);
                    currentStamp = kh?.SecurityStamp;
                    currentTrangThai = kh?.TrangThai;
                }

                if (currentStamp == null || currentStamp != securityStampClaim)
                {
                    // Mật khẩu đã được đổi/reset sau khi Token này được cấp -> Token cũ bị vô hiệu ngay lập tức.
                    context.Fail("Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.");
                    return;
                }

                // [THÊM MỚI - FIX BUG] Chặn ngay lập tức tài khoản đã bị khóa/nghỉ việc (TrangThai = 0),
                // kể cả khi Token vẫn còn mang đúng SecurityStamp hiện tại (ví dụ TrangThai bị đổi bởi
                // một luồng khác mà không rotate SecurityStamp). Không chờ Token hết hạn mới bị chặn.
                if (currentTrangThai == 0)
                {
                    context.Fail("Tài khoản đã bị khóa hoặc ngừng hoạt động.");
                }
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Bật giao diện Swagger khi chạy ở chế độ Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Kích hoạt CORS (Bắt buộc phải đặt TRƯỚC Authentication và Authorization)
app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseAuthorization();
app.UseStaticFiles(); // Cho phép truy cập các file tĩnh (như ảnh) từ wwwroot
app.MapControllers();


using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var hasher = new PasswordHasher<NHANVIEN>();

    var nhanViens = db.NHANVIEN.ToList();

    foreach (var nv in nhanViens)
    {
        // Chỉ hash những mật khẩu đang ở dạng thường
        if (!string.IsNullOrEmpty(nv.MatKhau) &&
            !nv.MatKhau.StartsWith("AQAAAA"))
        {
            nv.MatKhau = hasher.HashPassword(nv, nv.MatKhau);
        }
    }

    db.SaveChanges();

    Console.WriteLine("Đã hash xong toàn bộ mật khẩu nhân viên.");

    // [SỬA - FIX BUG] Trước đây chỉ hash lại mật khẩu dạng thường cho NHANVIEN, bỏ sót KHACHHANG.
    // Khách hàng nào còn MatKhau ở dạng thường (VD: dữ liệu mẫu trong SqlCNPM.sql) khi đăng nhập sẽ
    // làm PasswordHasher.VerifyHashedPassword ném lỗi định dạng (không phải hash hợp lệ) -> Server trả
    // về lỗi 500 không phải JSON -> Frontend hiểu nhầm thành "Không thể kết nối tới máy chủ".
    // Hash lại tương tự NHANVIEN ở trên để khách hàng đăng nhập được bình thường.
    var khachHangHasher = new PasswordHasher<KHACHHANG>();

    var khachHangs = db.KHACHHANG.ToList();

    foreach (var kh in khachHangs)
    {
        if (!string.IsNullOrEmpty(kh.MatKhau) &&
            !kh.MatKhau.StartsWith("AQAAAA"))
        {
            kh.MatKhau = khachHangHasher.HashPassword(kh, kh.MatKhau);
        }
    }

    db.SaveChanges();

    Console.WriteLine("Đã hash xong toàn bộ mật khẩu khách hàng.");
}
app.Run();