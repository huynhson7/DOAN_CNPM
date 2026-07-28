using Google.Apis.Auth;

namespace Backend.Services
{
    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<GoogleAuthService> _logger;

        public GoogleAuthService(IConfiguration configuration, ILogger<GoogleAuthService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<GooglePayload?> ValidateAsync(string idToken)
        {
            try
            {
                var clientId = _configuration["Google:ClientId"];

                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    // Chỉ chấp nhận token được cấp cho đúng ứng dụng của chúng ta,
                    // tránh trường hợp một token hợp lệ nhưng phát hành cho ứng dụng khác bị dùng lại
                    Audience = string.IsNullOrWhiteSpace(clientId) ? null : new[] { clientId }
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);

                if (!payload.EmailVerified)
                {
                    _logger.LogWarning("Google login bị từ chối: email chưa được Google xác minh");
                    return null;
                }

                return new GooglePayload
                {
                    Email = payload.Email,
                    DisplayName = payload.Name ?? payload.Email,
                    Avatar = payload.Picture,
                    GoogleId = payload.Subject
                };
            }
            catch (InvalidJwtException ex)
            {
                _logger.LogWarning(ex, "Google ID Token không hợp lệ");
                return null;
            }
        }
    }
}
