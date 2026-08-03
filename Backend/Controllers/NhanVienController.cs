using Backend.Data;
using Backend.DTOs;
using Backend.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/nhan-vien")]
    [ApiController]
    [Authorize] // Yêu cầu người dùng phải đăng nhập hợp lệ mới được truy cập Controller này
    public class NhanVienController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly PasswordHasher<object> _passwordHasher = new();

        public NhanVienController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/nhan-vien
        // [SỬA] Chỉ Admin/Nhân viên được xem danh sách Nhân viên - Khách hàng KHÔNG có quyền truy cập.
        [HttpGet]
        [Authorize(Roles = "Quản trị Hệ thống,NV Bán Hàng")]
        public async Task<IActionResult> GetAll()
        {
            // [SỬA] Không trả MatKhau (dữ liệu nhạy cảm) về Client
            var list = await _context.NHANVIEN
                .AsNoTracking()
                .Select(x => new
                {
                    x.MaNV,
                    x.TenDangNhap,
                    x.TenNV,
                    x.Email,
                    x.NgaySinh,
                    x.GioiTinh,
                    x.SoDT,
                    x.DiaChiNV,
                    //x.VaiTroKhuVucPhuTrach,
                    x.VaiTro,
                    x.TrangThaiLamViec,
                    x.TrangThai
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/nhan-vien/NV001
        // [SỬA] Chỉ Admin/Nhân viên được xem chi tiết Nhân viên - Khách hàng KHÔNG có quyền truy cập.
        [HttpGet("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống,NV Bán Hàng")]
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _context.NHANVIEN
                .AsNoTracking()
                .Where(x => x.MaNV == id)
                .Select(x => new
                {
                    x.MaNV,
                    x.TenDangNhap,
                    x.TenNV,
                    x.Email,
                    x.NgaySinh,
                    x.GioiTinh,
                    x.SoDT,
                    x.DiaChiNV,
                    //x.VaiTroKhuVucPhuTrach,
                    x.VaiTro,
                    x.TrangThaiLamViec,
                    x.TrangThai
                })
                .FirstOrDefaultAsync();

            if (item == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            return Ok(item);
        }

        // POST: api/nhan-vien
        // [SỬA] Chỉ Admin được tạo tài khoản Nhân viên/Admin. Role chọn tường minh qua DTO, không hard-code,
        // không cho phép đăng ký tự do (không có endpoint public nào khác tạo được NHANVIEN).
        [HttpPost]
        [Authorize(Roles = "Quản trị Hệ thống")]
        public async Task<IActionResult> Create([FromBody] CreateNhanVienDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!PasswordPolicy.IsValidUsername(model.TenDangNhap))
                return BadRequest(new { message = "Tên đăng nhập chỉ gồm chữ, số, dấu gạch dưới, độ dài 4-20 ký tự." });

            var passwordErrors = PasswordPolicy.Validate(model.MatKhau);
            if (passwordErrors.Count > 0)
                return BadRequest(new { message = string.Join(" ", passwordErrors) });

            bool emailTonTai = await _context.NHANVIEN.AnyAsync(x => x.Email == model.Email)
                || await _context.KHACHHANG.AnyAsync(x => x.Email == model.Email);
            if (emailTonTai)
                return Conflict(new { message = "Email đã được sử dụng." });

            bool tenDangNhapTonTai = await _context.NHANVIEN.AnyAsync(x => x.TenDangNhap == model.TenDangNhap)
                || await _context.KHACHHANG.AnyAsync(x => x.TenDangNhap == model.TenDangNhap);
            if (tenDangNhapTonTai)
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });

            var existingIds = await _context.NHANVIEN.Select(x => x.MaNV).Where(id => id.StartsWith("NV")).ToListAsync();
            int maxNumber = 0;
            foreach (var id in existingIds)
            {
                if (int.TryParse(id.Length > 2 ? id[2..] : "", out var number) && number > maxNumber)
                    maxNumber = number;
            }
            var maNV = $"NV{(maxNumber + 1):D2}";

            var nhanVien = new NHANVIEN
            {
                MaNV = maNV,
                TenDangNhap = model.TenDangNhap,
                MatKhau = _passwordHasher.HashPassword(new object(), model.MatKhau),
                TenNV = model.TenNV,
                Email = model.Email,
                NgaySinh = model.NgaySinh,
                GioiTinh = model.GioiTinh,
                SoDT = model.SoDT,
                DiaChiNV = model.DiaChiNV,
                //VaiTroKhuVucPhuTrach = model.VaiTroKhuVucPhuTrach,
                VaiTro = model.VaiTro, // "Quản trị Hệ thống" hoặc "NV Bán Hàng" - do Admin chọn tường minh qua Form
                TrangThaiLamViec = "Đang làm việc",
                TrangThai = 1,
                SecurityStamp = Guid.NewGuid().ToString()
            };

            _context.NHANVIEN.Add(nhanVien);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = nhanVien.MaNV },
                new { nhanVien.MaNV, nhanVien.TenNV, nhanVien.Email, nhanVien.VaiTro });
        }

        // PUT: api/nhan-vien/NV001
        [HttpPut("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")] // Chỉ tài khoản Admin mới được Sửa
        public async Task<IActionResult> Update(string id, [FromBody] NHANVIEN model)
        {
            if (id != model.MaNV)
            {
                return BadRequest(new { message = "Mã nhân viên không khớp." });
            }

            var employee = await _context.NHANVIEN.FindAsync(id);

            if (employee == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            bool tenDangNhapTonTai = await _context.NHANVIEN
                .AnyAsync(x => x.TenDangNhap == model.TenDangNhap && x.MaNV != id);

            if (tenDangNhapTonTai)
            {
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });
            }

            // Cập nhật các thông tin cơ bản
            employee.TenDangNhap = model.TenDangNhap;
            employee.TenNV = model.TenNV;
            employee.NgaySinh = model.NgaySinh;
            employee.GioiTinh = model.GioiTinh;
            employee.SoDT = model.SoDT;
            employee.DiaChiNV = model.DiaChiNV;
            employee.TrangThaiLamViec = model.TrangThaiLamViec;

            // [SỬA] Admin có thể đặt mật khẩu mới cho nhân viên ngay tại form Sửa.
            // Nếu ô mật khẩu để trống thì giữ nguyên mật khẩu cũ, không ghi đè.
            if (!string.IsNullOrWhiteSpace(model.MatKhau))
            {
                var passwordErrors = PasswordPolicy.Validate(model.MatKhau);
                if (passwordErrors.Count > 0)
                    return BadRequest(new { message = string.Join(" ", passwordErrors) });

                employee.MatKhau = _passwordHasher.HashPassword(new object(), model.MatKhau);
                employee.SecurityStamp = Guid.NewGuid().ToString(); // Thu hồi JWT cũ của nhân viên này
            }

            // Nếu form có gửi Vai trò/Khu vực phụ trách (chức danh hiển thị) thì mới cập nhật, không thì giữ nguyên
            //if (!string.IsNullOrEmpty(model.VaiTroKhuVucPhuTrach))
            //{
            //employee.VaiTroKhuVucPhuTrach = model.VaiTroKhuVucPhuTrach;
            //}

            // [SỬA] So khớp đúng cột VaiTro (quyết định quyền hạn) - không lẫn với VaiTroKhuVucPhuTrach (chỉ hiển thị)
            if (model.VaiTro == "Quản trị Hệ thống" || model.VaiTro == "NV Bán Hàng")
            {
                employee.VaiTro = model.VaiTro;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật nhân viên thành công." });
        }


        // PUT: api/nhan-vien/profile/NV001
        [HttpPut("profile/{id}")]
        [Authorize] // Bất kỳ ai đăng nhập cũng được gọi, nhưng chỉ sửa thông tin của chính mình
        public async Task<IActionResult> UpdateProfile(string id, [FromBody] NHANVIEN model)
        {
            if (id != model.MaNV)
            {
                return BadRequest(new { message = "Mã nhân viên không khớp." });
            }

            // [SỬA] Chặn Nhân viên sửa hồ sơ của Nhân viên KHÁC: id trên URL bắt buộc phải
            // trùng với chính tài khoản đang đăng nhập (lấy từ Token, không tin Client).
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentUserId) || currentUserId != id)
            {
                return StatusCode(403, new { message = "Bạn chỉ được sửa thông tin của chính mình." });
            }

            var employee = await _context.NHANVIEN.FindAsync(id);
            if (employee == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            bool tenDangNhapTonTai = await _context.NHANVIEN
                .AnyAsync(x => x.TenDangNhap == model.TenDangNhap && x.MaNV != id);

            if (tenDangNhapTonTai)
            {
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });
            }

            // CHỈ CẬP NHẬT CÁC TRƯỜNG CHO PHÉP (Bỏ qua VaiTro, TrangThai, TrangThaiLamViec, MatKhau)
            employee.TenDangNhap = model.TenDangNhap;
            employee.TenNV = model.TenNV;
            employee.NgaySinh = model.NgaySinh;
            employee.GioiTinh = model.GioiTinh;
            employee.SoDT = model.SoDT;
            employee.DiaChiNV = model.DiaChiNV;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật thông tin cá nhân thành công." });
        }

        // DELETE: api/nhan-vien/NV001
        // [SỬA - FIX BUG] Trước đây xóa thẳng (hard delete) nên nhân viên nào đã từng lập
        // Hóa đơn (HOADON.MaNV tham chiếu tới, ràng buộc DeleteBehavior.Restrict trong AppDbContext)
        // sẽ làm SQL Server chặn xóa (lỗi khóa ngoại) - hay gặp nhất ở nhân viên "Đã nghỉ việc" vì
        // họ thường đã có thời gian làm việc/lập hóa đơn trước đó. Giờ kiểm tra trước: nếu còn Hóa đơn
        // liên quan thì chuyển sang xóa mềm (khóa tài khoản + đánh dấu Đã nghỉ việc) để vẫn giữ toàn vẹn
        // dữ liệu Hóa đơn cũ; nếu không còn liên quan gì thì xóa cứng như cũ.
        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")] // Chỉ tài khoản Admin mới được Xóa
        public async Task<IActionResult> Delete(string id)
        {
            var employee = await _context.NHANVIEN.FindAsync(id);

            if (employee == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            bool coHoaDonLienQuan = await _context.HOADON.AnyAsync(x => x.MaNV == id);

            if (coHoaDonLienQuan)
            {
                // Không thể xóa cứng vì sẽ vi phạm khóa ngoại với Hóa đơn đã lập - xóa mềm thay thế.
                employee.TrangThai = 0;
                employee.TrangThaiLamViec = "Đã nghỉ việc";
                employee.SecurityStamp = Guid.NewGuid().ToString(); // Thu hồi JWT hiện tại của nhân viên này

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Nhân viên này đã có Hóa đơn liên quan nên không thể xóa hoàn toàn. " +
                               "Hệ thống đã khóa tài khoản và chuyển trạng thái sang \"Đã nghỉ việc\" thay thế."
                });
            }

            _context.NHANVIEN.Remove(employee);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa nhân viên thành công." });
        }
    }
}