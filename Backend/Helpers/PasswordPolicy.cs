using System.Text.RegularExpressions;

namespace Backend.Helpers
{
    /// <summary>
    /// Quy tắc Validate Username/Password dùng chung cho toàn bộ Backend.
    /// Logic PHẢI khớp với validate phía Frontend (Frontend/js/validators.js)
    /// để tránh trường hợp Frontend cho qua nhưng Backend từ chối hoặc ngược lại.
    /// </summary>
    public static class PasswordPolicy
    {
        // Username: chỉ a-z, A-Z, 0-9, _ ; độ dài 4-20
        private static readonly Regex UsernameRegex = new(@"^[a-zA-Z0-9_]{4,20}$", RegexOptions.Compiled);

        // Password: 8-20 ký tự, không khoảng trắng, và kiểm tra riêng từng loại ký tự bên dưới
        private static readonly Regex PasswordLengthNoSpaceRegex = new(@"^\S{8,20}$", RegexOptions.Compiled);
        private static readonly Regex LowerRegex = new(@"[a-z]", RegexOptions.Compiled);
        private static readonly Regex UpperRegex = new(@"[A-Z]", RegexOptions.Compiled);
        private static readonly Regex DigitRegex = new(@"[0-9]", RegexOptions.Compiled);
        private static readonly Regex SpecialRegex = new(@"[^a-zA-Z0-9]", RegexOptions.Compiled);

        public static bool IsValidUsername(string? username)
        {
            return !string.IsNullOrEmpty(username) && UsernameRegex.IsMatch(username);
        }

        /// <summary>
        /// Trả về danh sách lỗi (rỗng nếu password hợp lệ). Dùng để trả message rõ ràng cho Frontend.
        /// </summary>
        public static List<string> Validate(string? password)
        {
            var errors = new List<string>();

            if (string.IsNullOrEmpty(password) || !PasswordLengthNoSpaceRegex.IsMatch(password))
            {
                errors.Add("Mật khẩu phải từ 8 đến 20 ký tự và không chứa khoảng trắng.");
                // Nếu sai cơ bản về độ dài/khoảng trắng thì các check ký tự bên dưới vẫn nên chạy
                // để trả đầy đủ checklist cho Frontend hiển thị real-time.
            }

            password ??= string.Empty;

            if (!LowerRegex.IsMatch(password)) errors.Add("Mật khẩu phải có ít nhất 1 chữ thường.");
            if (!UpperRegex.IsMatch(password)) errors.Add("Mật khẩu phải có ít nhất 1 chữ in hoa.");
            if (!DigitRegex.IsMatch(password)) errors.Add("Mật khẩu phải có ít nhất 1 chữ số.");
            if (!SpecialRegex.IsMatch(password)) errors.Add("Mật khẩu phải có ít nhất 1 ký tự đặc biệt.");

            return errors;
        }

        public static bool IsValidPassword(string? password) => Validate(password).Count == 0;
    }
}
