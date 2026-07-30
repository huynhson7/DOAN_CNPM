using Backend.Options;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;

namespace Backend.Services
{
    public class CloudinaryImageService : ICloudinaryImageService
    {
        private readonly CloudinaryOptions _config;
        private readonly string _rootFolder;
        private readonly ILogger<CloudinaryImageService> _logger;
        private readonly Lazy<Cloudinary> _cloudinaryLazy;

        // QUAN TRỌNG: KHÔNG validate/throw cấu hình Cloudinary ngay trong constructor.
        // Service này được đăng ký Singleton và inject vào SanPhamController - nếu throw ở
        // đây, MỌI request tới SanPhamController (kể cả GET công khai cho khách xem sản
        // phẩm) sẽ bị sập chỉ vì Cloudinary chưa cấu hình. Việc validate được dời vào lúc
        // Cloudinary client thực sự được khởi tạo (lần đầu có thao tác upload/xoá/move ảnh).
        public CloudinaryImageService(IOptions<CloudinaryOptions> options, ILogger<CloudinaryImageService> logger)
        {
            _logger = logger;
            _config = options.Value;
            _rootFolder = string.IsNullOrWhiteSpace(_config.RootFolder) ? "Do_Noi_That" : _config.RootFolder;
            _cloudinaryLazy = new Lazy<Cloudinary>(CreateClient);
        }

        private Cloudinary CreateClient()
        {
            if (string.IsNullOrWhiteSpace(_config.CloudName) ||
                string.IsNullOrWhiteSpace(_config.ApiKey) ||
                string.IsNullOrWhiteSpace(_config.ApiSecret))
            {
                throw new InvalidOperationException(
                    "Thiếu cấu hình Cloudinary (CloudName/ApiKey/ApiSecret). " +
                    "Kiểm tra appsettings.json mục \"Cloudinary\" hoặc User Secrets. " +
                    "Xem hướng dẫn cấu hình trong README.");
            }

            var account = new Account(_config.CloudName, _config.ApiKey, _config.ApiSecret);
            var client = new Cloudinary(account) { Api = { Secure = true } };
            return client;
        }

        private Cloudinary _cloudinary => _cloudinaryLazy.Value;

        // Tạo PublicId đầy đủ: Do_Noi_That/{FolderName}/{GUID}
        // Dùng GUID thay vì tên file gốc để không bao giờ trùng asset do tên file (theo yêu cầu).
        private string BuildFullPublicId(string folderName)
        {
            string safeFolder = string.IsNullOrWhiteSpace(folderName) ? "Khac" : folderName;
            return $"{_rootFolder}/{safeFolder}/{Guid.NewGuid()}";
        }

        public async Task<CloudinaryUploadResult> UploadProductImageAsync(Stream fileStream, string originalFileName, string folderName)
        {
            string fullPublicId = BuildFullPublicId(folderName);

            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(originalFileName, fileStream),
                PublicId = fullPublicId,
                UseFilename = false,
                UniqueFilename = false,
                Overwrite = false
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            if (result.Error != null || result.StatusCode != System.Net.HttpStatusCode.OK || string.IsNullOrEmpty(result.SecureUrl?.ToString()))
            {
                var errorMessage = result.Error?.Message ?? $"Cloudinary trả về mã trạng thái {result.StatusCode}.";
                _logger.LogError("Upload Cloudinary thất bại: {Error}", errorMessage);
                throw new InvalidOperationException($"Upload ảnh lên Cloudinary thất bại: {errorMessage}");
            }

            return new CloudinaryUploadResult
            {
                SecureUrl = result.SecureUrl.ToString(),
                PublicId = result.PublicId
            };
        }

        public async Task<bool> DeleteImageAsync(string publicId)
        {
            if (string.IsNullOrWhiteSpace(publicId))
                return true; // Không có gì để xoá, coi như thành công.

            try
            {
                var deleteParams = new DeletionParams(publicId)
                {
                    ResourceType = ResourceType.Image
                };

                var result = await _cloudinary.DestroyAsync(deleteParams);

                // Cloudinary trả "ok" khi xoá thành công, "not found" nếu asset không còn tồn tại
                // (coi như đã "sạch", không phải lỗi).
                bool success = result.Result == "ok" || result.Result == "not found";
                if (!success)
                {
                    _logger.LogError("Xoá ảnh Cloudinary thất bại. PublicId={PublicId}, Result={Result}", publicId, result.Result);
                }
                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi Cloudinary để xoá ảnh. PublicId={PublicId}", publicId);
                return false;
            }
        }

        public async Task<CloudinaryUploadResult?> MoveImageAsync(string oldPublicId, string newFolderName)
        {
            if (string.IsNullOrWhiteSpace(oldPublicId))
                return null;

            string newFullPublicId = BuildFullPublicId(newFolderName);

            try
            {
                var renameParams = new RenameParams(oldPublicId, newFullPublicId)
                {
                    ResourceType = ResourceType.Image,
                    Overwrite = false
                };

                var result = await _cloudinary.RenameAsync(renameParams);

                if (result.Error != null || result.StatusCode != System.Net.HttpStatusCode.OK || string.IsNullOrEmpty(result.SecureUrl?.ToString()))
                {
                    _logger.LogError("Di chuyển (rename) ảnh Cloudinary thất bại. OldPublicId={OldPublicId}, Error={Error}",
                        oldPublicId, result.Error?.Message);
                    return null;
                }

                return new CloudinaryUploadResult
                {
                    SecureUrl = result.SecureUrl.ToString(),
                    PublicId = result.PublicId
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi Cloudinary để di chuyển ảnh. OldPublicId={OldPublicId}", oldPublicId);
                return null;
            }
        }
    }
}
