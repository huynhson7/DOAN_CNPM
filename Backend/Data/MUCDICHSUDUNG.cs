using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data
{
    [Table("MUCDICHSUDUNG")]
    public class MUCDICHSUDUNG
    {
        [Key]
        [StringLength(15)]
        public string MaMD { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên mục đích sử dụng không được để trống")]
        [StringLength(50)]
        public string TenMD { get; set; } = string.Empty;

        [StringLength(500)]
        public string? MoTaMD { get; set; }
    }
}