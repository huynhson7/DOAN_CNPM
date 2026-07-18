using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("VATLIEU")]
    public class VATLIEU
    {
        [Key]
        [StringLength(15)]
        public string MaVL { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên vật liệu không được để trống")]
        [StringLength(100)]
        public string TenVL { get; set; } = string.Empty;
    }
}