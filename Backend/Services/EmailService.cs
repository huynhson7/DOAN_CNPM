using System.Net;
using System.Net.Mail;
using System;
using System.Threading.Tasks;

namespace Backend.Services
{
    public class EmailService
    {
        public async Task SendOtpEmailAsync(string toEmail, string otpCode)
        {
            // BẠN HÃY THAY ĐỊA CHỈ GMAIL CỦA BẠN VÀO DÒNG DƯỚI ĐÂY
            string fromEmail = "limbusbleed321@gmail.com"; 
            
            // Mật khẩu ứng dụng 16 ký tự của bạn
            string appPassword = "ztam mcaq vmro pidi"; 

            MailMessage message = new MailMessage(fromEmail, toEmail)
            {
                Subject = "Mã xác nhận đăng ký tài khoản - Cửa Hàng Nội Thất",
                Body = $@"
                    <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px;'>
                        <h2 style='color: #333;'>Chào mừng bạn đến với Cửa Hàng Nội Thất!</h2>
                        <p style='color: #555; font-size: 16px;'>Mã xác nhận (OTP) để hoàn tất đăng ký của bạn là:</p>
                        <h1 style='color: #4CAF50; letter-spacing: 5px; text-align: center; background-color: #f9f9f9; padding: 15px; border-radius: 5px;'>{otpCode}</h1>
                        <p style='color: #777; font-size: 14px;'>Vui lòng không chia sẻ mã này cho bất kỳ ai. Mã có hiệu lực trong vòng 5 phút.</p>
                    </div>",
                IsBodyHtml = true
            };

            SmtpClient smtpClient = new SmtpClient("smtp.gmail.com")
            {
                Port = 587,
                Credentials = new NetworkCredential(fromEmail, appPassword),
                EnableSsl = true
            };

            try
            {
                await smtpClient.SendMailAsync(message);
            }
            catch (Exception ex)
            {
                throw new Exception("Lỗi khi gửi email: " + ex.Message);
            }
        }
    }
}