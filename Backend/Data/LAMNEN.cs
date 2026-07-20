using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization; // Thêm thư viện này để xử lý JSON

namespace Backend.Data
{
    [Table("LAM_NEN")]
    public class LAMNEN
    {
        public string MaVL { get; set; } = string.Empty;

        public string MaSP { get; set; } = string.Empty;

        public VATLIEU? VatLieu { get; set; }

        [JsonIgnore] // Thêm thẻ này để ngắt vòng lặp tham chiếu khi trả về JSON
        public SANPHAM? SanPham { get; set; }
    }
}