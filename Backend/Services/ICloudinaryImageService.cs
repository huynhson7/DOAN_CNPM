namespace Backend.Services
{
    /// <summary>
    /// Kết quả trả về sau khi upload hoặc di chuyển (rename) một ảnh trên Cloudinary.
    /// </summary>
    public class CloudinaryUploadResult
    {
        public string SecureUrl { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
    }

    /// <summary>
    /// Service DUY NHẤT trong toàn bộ Backend được phép giao tiếp trực tiếp với Cloudinary
    /// bằng API Secret. Controller không bao giờ gọi thẳng CloudinaryDotNet SDK.
    /// </summary>
    public interface ICloudinaryImageService
    {
        /// <summary>
        /// Upload 1 ảnh sản phẩm vào đúng thư mục Do_Noi_That/{folderName} với PublicId
        /// duy nhất (GUID), không dùng tên file gốc của người dùng để tránh trùng lặp.
        /// </summary>
        Task<CloudinaryUploadResult> UploadProductImageAsync(Stream fileStream, string originalFileName, string folderName);

        /// <summary>
        /// Xoá 1 asset trên Cloudinary theo PublicId. Trả về false nếu Cloudinary báo lỗi
        /// (không throw exception ra ngoài) để Controller tự quyết định cách xử lý/log.
        /// </summary>
        Task<bool> DeleteImageAsync(string publicId);

        /// <summary>
        /// Di chuyển (move/rename) 1 asset sang thư mục của nhóm sản phẩm mới mà KHÔNG tải
        /// lại/không giảm chất lượng ảnh. Dùng khi đổi Nhóm Sản Phẩm nhưng không đổi ảnh.
        /// Trả về null nếu thao tác thất bại.
        /// </summary>
        Task<CloudinaryUploadResult?> MoveImageAsync(string oldPublicId, string newFolderName);
    }
}
