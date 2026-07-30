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

        // Tên thư mục con trên Cloudinary tương ứng với nhóm sản phẩm này:
        // Do_Noi_That/{FolderName}. Được gán 1 lần khi tạo nhóm (tự sinh từ TenNhomSP nếu
        // không truyền lên) và GIỮ NGUYÊN ổn định sau đó - không tự đổi theo TenNhomSP khi
        // cập nhật, để không làm "lạc" các ảnh sản phẩm đã upload vào thư mục cũ trên Cloudinary.
        [StringLength(100)]
        public string? FolderName { get; set; }

        public int? TrangThai { get; set; }
    }
}