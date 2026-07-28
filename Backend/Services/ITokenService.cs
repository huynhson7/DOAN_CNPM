namespace Backend.Services
{
    public interface ITokenService
    {
        /// <summary>
        /// Sinh JWT chứa đúng các Claim yêu cầu: UserId, Username, FullName, Email, Role, Expiration.
        /// Ngoài ra nhúng thêm Claim "SecurityStamp" (không nằm trong yêu cầu hiển thị nhưng bắt buộc
        /// về mặt bảo mật) để middleware có thể thu hồi token khi người dùng đổi/reset mật khẩu.
        /// </summary>
        string GenerateToken(string userId, string username, string fullName, string email, string role, string securityStamp);
    }
}
