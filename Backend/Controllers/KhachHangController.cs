using Backend.Data;
using Backend.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/khach-hang")]
    [ApiController]
    [Authorize(Roles = "Quản trị Hệ thống,NV Bán Hàng")] // [SỬA] Dữ liệu khách hàng là thông tin nhạy cảm - chỉ nội bộ (Admin/NhanVien) được truy cập.
                                          // Khách hàng tự đăng ký/xem thông tin của MÌNH đi qua AuthController + KhachHangController.GetMe (bên dưới).
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

        // POST: api/khach-hang
        // [SỬA] Dùng khi Nhân viên tạo hồ sơ khách hàng tại quầy (KHÔNG PHẢI đăng ký tự do - đăng ký công khai
        // đã chuyển sang AuthController.Register). VaiTro/SecurityStamp luôn bị ép, không nhận từ Client.
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] KHACHHANG model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!PasswordPolicy.IsValidUsername(model.TenDangNhap))
                return BadRequest(new { message = "Tên đăng nhập chỉ gồm chữ, số, dấu gạch dưới, độ dài 4-20 ký tự." });

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
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] KHACHHANG model)
        {
            if (id != model.MaKhachHang)
            {
                return BadRequest(new { message = "Mã khách hàng không khớp." });
            }

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
            customer.TrangThai = model.TrangThai;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật khách hàng thành công." });
        }

        // DELETE: api/khach-hang/KH001
        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")] // [SỬA] Chỉ Admin được xoá khách hàng
        public async Task<IActionResult> Delete(string id)
        {
            var customer = await _context.KHACHHANG.FindAsync(id);

            if (customer == null)
            {
                return NotFound(new { message = "Không tìm thấy khách hàng." });
            }

            _context.KHACHHANG.Remove(customer);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa khách hàng thành công." });
        }
    }
}
