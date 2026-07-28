namespace Backend.Helpers
{
    /// <summary>
    /// Exception dùng riêng cho AuthService để Controller có thể map đúng HTTP status code
    /// (400/401/404/409...) mà không cần Service phải biết về ASP.NET MVC (giữ Service thuần business logic).
    /// </summary>
    public class AuthOperationException : Exception
    {
        public int StatusCode { get; }

        public AuthOperationException(string message, int statusCode = 400) : base(message)
        {
            StatusCode = statusCode;
        }
    }
}
