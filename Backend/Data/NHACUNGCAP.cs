using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("NHACUNGCAP")]
    public class NHACUNGCAP
    {
        [Key]
        [StringLength(255)]
        public string MaNcc { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên nhà cung cấp không được để trống")]
        [StringLength(100)]
        public string TenNcc { get; set; } = string.Empty;

        [StringLength(500)]
        public string? MoTaNcc { get; set; }
    }
}