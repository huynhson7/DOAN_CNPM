namespace Backend.Options
{
    /// <summary>
    /// Cấu hình kết nối Cloudinary, được bind từ section "Cloudinary" trong
    /// appsettings.json (CloudName - không nhạy cảm, có thể để trong appsettings.json)
    /// và từ User Secrets / Environment Variables (ApiKey, ApiSecret - KHÔNG được commit lên Git).
    /// Xem hướng dẫn cấu hình ở cuối báo cáo triển khai.
    /// </summary>
    public class CloudinaryOptions
    {
        public const string SectionName = "Cloudinary";

        public string CloudName { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string ApiSecret { get; set; } = string.Empty;

        /// <summary>
        /// Folder gốc trên Cloudinary chứa toàn bộ ảnh sản phẩm nội thất.
        /// Cấu trúc bắt buộc: Do_Noi_That/{FolderName nhóm sản phẩm}/{publicId}
        /// </summary>
        public string RootFolder { get; set; } = "Do_Noi_That";
    }
}
