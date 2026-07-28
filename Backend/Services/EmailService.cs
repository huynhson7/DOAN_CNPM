using System.Net;
using System.Net.Mail;

namespace Backend.Services
{
    /// <summary>
    /// Gửi Email qua Gmail SMTP. Cấu hình đọc từ appsettings.json (mục "Smtp").
    /// Yêu cầu dùng "App Password" của Gmail (KHÔNG dùng mật khẩu đăng nhập Gmail thường)
    /// vì Google đã tắt "Less secure app access". Xem hướng dẫn tạo App Password tại:
    /// https://myaccount.google.com/apppasswords
    /// </summary>
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetLink)
        {
            var host = _configuration["Smtp:Host"] ?? "smtp.gmail.com";
            var port = int.Parse(_configuration["Smtp:Port"] ?? "587");
            var senderEmail = _configuration["Smtp:SenderEmail"];
            var senderPassword = _configuration["Smtp:SenderAppPassword"];
            var senderDisplayName = _configuration["Smtp:SenderDisplayName"] ?? "Cửa Hàng Nội Thất";

            if (string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(senderPassword))
            {
                // Không throw để tránh lộ chi tiết cấu hình ra ngoài, chỉ log để dev tự kiểm tra appsettings.json
                _logger.LogError("Chưa cấu hình Smtp:SenderEmail / Smtp:SenderAppPassword trong appsettings.json");
                throw new InvalidOperationException("Hệ thống chưa cấu hình gửi Email. Vui lòng liên hệ quản trị viên.");
            }

            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(senderEmail, senderPassword),
                EnableSsl = true
            };

            var mail = new MailMessage
            {
                From = new MailAddress(senderEmail, senderDisplayName),
                Subject = "Yêu cầu đặt lại mật khẩu",
                IsBodyHtml = true,
                Body = $@"
                    <div style='font-family:Arial,sans-serif;max-width:480px;margin:auto'>
                        <h2>Xin chào {WebUtility.HtmlEncode(toName)},</h2>
                        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                        <p>Liên kết dưới đây chỉ có hiệu lực trong <b>5 phút</b>:</p>
                        <p><a href='{resetLink}' style='display:inline-block;padding:10px 20px;background:#2d6cdf;color:#fff;text-decoration:none;border-radius:6px'>Đặt lại mật khẩu</a></p>
                        <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
                    </div>"
            };
            mail.To.Add(toEmail);

            await client.SendMailAsync(mail);
        }
    }
}
