using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("NHOMSANPHAM")]
    public class NHOMSANPHAM
    {
        [Key]
        [StringLength(15)]
        public string MaNhomSP { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên nhóm sản phẩm không được để trống")]
        [StringLength(100)]
        public string TenNhomSP { get; set; } = string.Empty;

        public int? TrangThai { get; set; }
    }
}