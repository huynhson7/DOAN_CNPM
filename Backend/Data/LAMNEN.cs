using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("LAM_NEN")]
    public class LAMNEN
    {
        public string MaVL { get; set; } = string.Empty;

        public string MaSP { get; set; } = string.Empty;

        public VATLIEU? VatLieu { get; set; }

        public SANPHAM? SanPham { get; set; }
    }
}