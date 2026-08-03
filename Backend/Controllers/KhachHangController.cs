using Backend.Data;
using Backend.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/khach-hang")]
    [ApiController]
    // [SỬA] Bỏ Authorize ở mức Controller (class) - chuyển xuống từng API riêng, vì giờ có
    // thêm 2 API "me" (GetMe/UpdateMe) dành riêng cho role Khách hàng tự thao tác trên hồ sơ
    // của chính mình. Dữ liệu khách hàng vẫn là thông tin nhạy cảm - GetAll/GetById/Create/Update
    // theo ID cụ thể vẫn chỉ dành cho nội bộ (Admin/Nhân viên) như cũ.
    public class KhachHangController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly PasswordHasher<object> _passwordHasher = new();

        public KhachHangController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/khach-hang
        [HttpGet]
        [Authorize(Roles = "Quản trị Hệ thống,NV Bán Hàng")]
        public async Task<IActionResult> GetAll()
        {
            // [SỬA] Không trả MatKhau về Client
            var list = await _context.KHACHHANG
                .AsNoTracking()
                .Select(x => new
                {
                    x.MaKhachHang,
                    x.TenDangNhap,
                    x.TenKhachHang,
                    x.Email,
                    x.SDTKhachHang,
                    x.DiaChiKhachHang,
                    x.VaiTro,
                    x.TrangThai
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/khach-hang/KH001
        [HttpGet("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống,NV Bán Hàng")]
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _context.KHACHHANG
                .AsNoTracking()
                .Where(x => x.MaKhachHang == id)
                .Select(x => new
                {
                    x.MaKhachHang,
                    x.TenDangNhap,
                    x.TenKhachHang,
                    x.Email,
                    x.SDTKhachHang,
                    x.DiaChiKhachHang,
                    x.VaiTro,
                    x.TrangThai
                })
                .FirstOrDefaultAsync();

            if (item == null)
            {
                return NotFound(new { message = "Không tìm thấy khách hàng." });
            }

            return Ok(item);
        }

        // =====================================================
        // GET: api/khach-hang/me -> Khách hàng tự xem thông tin của CHÍNH MÌNH
        // =====================================================
        [HttpGet("me")]
        [Authorize(Roles = "Khách hàng")]
        public async Task<IActionResult> GetMe()
        {
            var myId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(myId))
                return Unauthorized();

            var item = await _context.KHACHHANG
                .AsNoTracking()
                .Where(x => x.MaKhachHang == myId)
                .Select(x => new
                {
                    x.MaKhachHang,
                    x.TenDangNhap,
                    x.TenKhachHang,
                    x.Email,
                    x.SDTKhachHang,
                    x.DiaChiKhachHang,
                    x.TrangThai
                })
                .FirstOrDefaultAsync();

            if (item == null)
                return NotFound(new { message = "Không tìm thấy tài khoản." });

            return Ok(item);
        }

        // =====================================================
        // PUT: api/khach-hang/me -> Khách hàng tự sửa thông tin cá nhân của CHÍNH MÌNH
        // (tên, SĐT, địa chỉ). KHÔNG cho sửa MatKhau/VaiTro/TrangThai qua API này -
        // đổi mật khẩu đi qua AuthController.ChangePassword, TrangThai (khóa/mở) do
        // Admin quản lý qua PUT api/khach-hang/{id} bên dưới.
        // =====================================================
        [HttpPut("me")]
        [Authorize(Roles = "Khách hàng")]
        public async Task<IActionResult> UpdateMe([FromBody] KHACHHANG model)
        {
            var myId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(myId))
                return Unauthorized();

            var customer = await _context.KHACHHANG.FindAsync(myId);
            if (customer == null)
                return NotFound(new { message = "Không tìm thấy tài khoản." });

            bool tenDangNhapTonTai = await _context.KHACHHANG
                .AnyAsync(x => x.TenDangNhap == model.TenDangNhap && x.MaKhachHang != myId);

            if (tenDangNhapTonTai)
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });

            bool soDienThoaiTonTai = await _context.KHACHHANG
                .AnyAsync(x => x.SDTKhachHang == model.SDTKhachHang && x.MaKhachHang != myId);

            if (soDienThoaiTonTai)
                return Conflict(new { message = "Số điện thoại này đã được đăng ký" });

            // CHỈ CẬP NHẬT CÁC TRƯỜNG CHO PHÉP - không đụng MatKhau/VaiTro/TrangThai/SecurityStamp
            customer.TenDangNhap = model.TenDangNhap;
            customer.TenKhachHang = model.TenKhachHang;
            customer.SDTKhachHang = model.SDTKhachHang;
            customer.DiaChiKhachHang = model.DiaChiKhachHang;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật thông tin cá nhân thành công." });
        }

        // POST: api/khach-hang
        // [SỬA] Dùng khi Nhân viên tạo hồ sơ khách hàng tại quầy (KHÔNG PHẢI đăng ký tự do - đăng ký công khai
        // đã chuyển sang AuthController.Register). VaiTro/SecurityStamp luôn bị ép, không nhận từ Client.
        [HttpPost]
        [Authorize(Roles = "Quản trị Hệ thống,NV Bán Hàng")]
        public async Task<IActionResult> Create([FromBody] KHACHHANG model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!PasswordPolicy.IsValidUsername(model.TenDangNhap))
                return BadRequest(new { message = "Tên đăng nhập chỉ gồm chữ, số, dấu gạch dưới, độ dài 4-20 ký tự." });

            // [SỬA] Kiểm tra null/rỗng tường minh trước khi validate/hash để hết cảnh báo
            // CS8604 (Possible null reference argument) khi gọi _passwordHasher.HashPassword bên dưới.
            if (string.IsNullOrWhiteSpace(model.MatKhau))
                return BadRequest(new { message = "Vui lòng nhập mật khẩu." });

            var passwordErrors = PasswordPolicy.Validate(model.MatKhau);
            if (passwordErrors.Count > 0)
                return BadRequest(new { message = string.Join(" ", passwordErrors) });

            bool tenDangNhapTonTai = await _context.KHACHHANG.AnyAsync(x => x.TenDangNhap == model.TenDangNhap)
                || await _context.NHANVIEN.AnyAsync(x => x.TenDangNhap == model.TenDangNhap);

            if (tenDangNhapTonTai)
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });

            bool emailTonTai = await _context.KHACHHANG.AnyAsync(x => x.Email == model.Email)
                || await _context.NHANVIEN.AnyAsync(x => x.Email == model.Email);

            if (emailTonTai)
                return Conflict(new { message = "Email này đã được sử dụng." });

            bool soDienThoaiTonTai = await _context.KHACHHANG.AnyAsync(x => x.SDTKhachHang == model.SDTKhachHang);

            if (soDienThoaiTonTai)
                return Conflict(new { message = "Số điện thoại này đã được đăng ký" });

            var existingIds = await _context.KHACHHANG.Select(x => x.MaKhachHang).Where(id => id.StartsWith("KH")).ToListAsync();
            int maxNumber = 0;
            foreach (var id in existingIds)
            {
                if (int.TryParse(id.Length > 2 ? id[2..] : "", out var number) && number > maxNumber)
                    maxNumber = number;
            }
            model.MaKhachHang = $"KH{(maxNumber + 1):D2}";

            model.MatKhau = _passwordHasher.HashPassword(new object(), model.MatKhau);
            model.VaiTro = "Khách hàng"; // Ép cứng - không nhận Role từ Client dù gửi lên gì
            model.SecurityStamp = Guid.NewGuid().ToString();
            model.TrangThai ??= 1;

            _context.KHACHHANG.Add(model);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = model.MaKhachHang },
                new { model.MaKhachHang, model.TenKhachHang, model.Email, model.VaiTro });
        }

        // PUT: api/khach-hang/KH001
        // [SỬA] Chỉ Admin được sửa hồ sơ khách hàng qua route theo ID cụ thể (bao gồm cả
        // khóa/mở TrangThai) - theo tài liệu phân quyền, NV Bán Hàng chỉ được XEM thông tin
        // cơ bản của khách hàng, không được sửa.
        // [SỬA - FIX BUG] Đổi sang nhận UpdateKhachHangDto (không có Email/MatKhau/VaiTro) thay vì
        // Entity KHACHHANG đầy đủ - trước đây Email là [Required] trên Entity nhưng Form Sửa Khách
        // hàng không có ô Email nên chỉ cần đổi Trạng Thái rồi Lưu là ModelState tự trả lỗi 400.
        [HttpPut("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")]
        public async Task<IActionResult> Update(string id, [FromBody] Backend.DTOs.UpdateKhachHangDto model)
        {
            var customer = await _context.KHACHHANG.FindAsync(id);

            if (customer == null)
            {
                return NotFound(new { message = "Không tìm thấy khách hàng." });
            }

            bool tenDangNhapTonTai = await _context.KHACHHANG
                .AnyAsync(x => x.TenDangNhap == model.TenDangNhap && x.MaKhachHang != id);

            if (tenDangNhapTonTai)
            {
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });
            }

            bool soDienThoaiTonTai = await _context.KHACHHANG
                .AnyAsync(x => x.SDTKhachHang == model.SDTKhachHang && x.MaKhachHang != id);

            if (soDienThoaiTonTai)
            {
                return Conflict(new { message = "Số điện thoại này đã được đăng ký" });
            }

            // [SỬA] KHÔNG cho phép ghi đè MatKhau/VaiTro/SecurityStamp qua endpoint cập nhật thông tin thường.
            // Đổi mật khẩu phải đi qua AuthController.ChangePassword; đổi Role không được hỗ trợ qua API này.
            customer.TenDangNhap = model.TenDangNhap;
            customer.TenKhachHang = model.TenKhachHang;
            customer.SDTKhachHang = model.SDTKhachHang;
            customer.DiaChiKhachHang = model.DiaChiKhachHang;

            // [SỬA - FIX BUG] Nếu Admin vừa khóa tài khoản (TrangThai chuyển từ khác 0 -> 0),
            // phải đổi SecurityStamp để JWT khách hàng đang giữ (nếu có) bị vô hiệu ngay lập tức,
            // không phải đợi token hết hạn mới hết hiệu lực.
            if (customer.TrangThai != 0 && model.TrangThai == 0)
            {
                customer.SecurityStamp = Guid.NewGuid().ToString();
            }
            customer.TrangThai = model.TrangThai;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật khách hàng thành công." });
        }

        // DELETE: api/khach-hang/KH001
        // [SỬA] Theo tài liệu phân quyền: "Xóa cứng chỉ với tài khoản chưa từng phát sinh hóa đơn".
        // Kiểm tra tường minh trước khi xóa - nếu khách hàng đã có Hóa đơn liên quan thì từ chối
        // xóa cứng (trả thông báo rõ ràng), thay vì để SQL Server tự chặn bằng lỗi khóa ngoại
        // (DeleteBehavior.Restrict giữa HOADON-KHACHHANG trong AppDbContext).
        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")] // [SỬA] Chỉ Admin được xoá khách hàng
        public async Task<IActionResult> Delete(string id)
        {
            var customer = await _context.KHACHHANG.FindAsync(id);

            if (customer == null)
            {
                return NotFound(new { message = "Không tìm thấy khách hàng." });
            }

            bool coHoaDonLienQuan = await _context.HOADON.AnyAsync(x => x.MaKhachHang == id);

            if (coHoaDonLienQuan)
            {
                return BadRequest(new
                {
                    message = "Không thể xóa khách hàng này vì đã có Hóa đơn liên quan. " +
                               "Chỉ được xóa cứng tài khoản khách hàng chưa từng phát sinh hóa đơn " +
                               "(có thể dùng chức năng Khóa tài khoản thay thế)."
                });
            }

            _context.KHACHHANG.Remove(customer);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa khách hàng thành công." });
        }
    }
}