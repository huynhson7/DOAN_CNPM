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
            string fromEmail = "limbusbleed321@gmail.com"; 
            string appPassword = "ztammcaqvmropidi"; 

            Console.WriteLine($"[EMAIL SERVICE] Đang chuẩn bị gửi OTP tới: {toEmail}");

            MailMessage message = new MailMessage(fromEmail, toEmail)
            {
                Subject = "Mã xác nhận đặt lại mật khẩu - Cửa Hàng Nội Thất",
                Body = $@"
                    <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px;'>
                        <h2 style='color: #333;'>Cửa Hàng Nội Thất - Khôi phục mật khẩu</h2>
                        <p style='color: #555; font-size: 16px;'>Mã xác nhận (OTP) của bạn là:</p>
                        <h1 style='color: #4CAF50; letter-spacing: 5px; text-align: center; background-color: #f9f9f9; padding: 15px; border-radius: 5px;'>{otpCode}</h1>
                        <p style='color: #777; font-size: 14px;'>Mã có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ cho bất kỳ ai.</p>
                    </div>",
                IsBodyHtml = true
            };

            using (SmtpClient smtpClient = new SmtpClient("smtp.gmail.com"))
            {
                smtpClient.Port = 587;
                smtpClient.Credentials = new NetworkCredential(fromEmail, appPassword);
                smtpClient.EnableSsl = true;

                try
                {
                    await smtpClient.SendMailAsync(message);
                    Console.WriteLine($"[EMAIL SERVICE] Gửi thành công tới: {toEmail}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[EMAIL SERVICE ERROR] Lỗi khi gửi tới {toEmail}: " + ex.ToString());
                    throw new Exception("Lỗi khi gửi email: " + ex.Message);
                }
            }
        }
    }
}