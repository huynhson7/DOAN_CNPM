using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("CUNG_CAP")]
    public class CUNGCAP
    {
        public string MaNcc { get; set; } = string.Empty;

        public string MaSP { get; set; } = string.Empty;

        public NHACUNGCAP? NhaCungCap { get; set; }

        public SANPHAM? SanPham { get; set; }
    }
}