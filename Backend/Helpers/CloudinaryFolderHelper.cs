using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Backend.Helpers
{
    /// <summary>
    /// Chuẩn hoá tên Nhóm Sản Phẩm (TenNhomSP, thường có dấu tiếng Việt, khoảng trắng,
    /// ký tự đặc biệt như "&") thành FolderName hợp lệ để dùng làm tên thư mục con trên
    /// Cloudinary: Do_Noi_That/{FolderName}.
    ///
    /// LƯU Ý QUAN TRỌNG: helper này CHỈ được dùng để tự sinh FolderName cho NHÓM SẢN PHẨM
    /// MỚI (chưa từng có FolderName). 5 nhóm sản phẩm hiện có (Sofa & Salon, Bàn, Ghế,
    /// Giường ngủ, Tủ & Kệ) đã có sẵn Folder tương ứng trên Cloudinary với tên tiếng Anh cố
    /// định (Sofa_Salon, Table, Chairs, Bed, Tu_Ke) KHÔNG PHẢI do sanitize tự động sinh ra
    /// (vd "Bàn" sanitize ra "Ban" chứ không phải "Table"). Vì vậy FolderName của 5 nhóm này
    /// được gán cứng qua script migration, không đi qua helper này.
    /// </summary>
    public static class CloudinaryFolderHelper
    {
        public static string ToFolderName(string? tenNhomSP)
        {
            if (string.IsNullOrWhiteSpace(tenNhomSP))
                return "Khac";

            // Bước 1: Bỏ dấu tiếng Việt (Unicode NFD rồi loại bỏ các Non-Spacing Mark)
            string normalized = tenNhomSP.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (char c in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(c);
                if (category != UnicodeCategory.NonSpacingMark)
                {
                    sb.Append(c);
                }
            }
            string noDiacritics = sb.ToString().Normalize(NormalizationForm.FormC);

            // Bước 2: Xử lý riêng chữ Đ/đ (không bị tách dấu bởi NFD)
            noDiacritics = noDiacritics.Replace('Đ', 'D').Replace('đ', 'd');

            // Bước 3: Mọi ký tự không phải chữ/số -> gạch dưới, gộp nhiều gạch dưới liên tiếp
            string underscored = Regex.Replace(noDiacritics, @"[^a-zA-Z0-9]+", "_").Trim('_');

            if (string.IsNullOrEmpty(underscored))
                return "Khac";

            return underscored;
        }
    }
}
