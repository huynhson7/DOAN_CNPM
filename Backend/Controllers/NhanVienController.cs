using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/nhan-vien")]
    [ApiController]
    [Authorize] // Yêu cầu người dùng phải đăng nhập hợp lệ mới được truy cập Controller này
    public class NhanVienController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NhanVienController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/nhan-vien
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _context.NHANVIEN
                .AsNoTracking()
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/nhan-vien/NV001
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _context.NHANVIEN
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaNV == id);

            if (item == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhân viên."
                });
            }

            return Ok(item);
        }

        // POST: api/nhan-vien
        [HttpPost]
        [Authorize(Roles = "Quản trị Hệ thống")] // Chỉ tài khoản Quản trị mới được Thêm
        public async Task<IActionResult> Create([FromBody] NHANVIEN model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool maTonTai = await _context.NHANVIEN
                .AnyAsync(x => x.MaNV == model.MaNV);

            if (maTonTai)
            {
                return BadRequest(new
                {
                    message = "Mã nhân viên đã tồn tại."
                });
            }

            bool tenDangNhapTonTai = await _context.NHANVIEN
                .AnyAsync(x => x.TenDangNhap == model.TenDangNhap);

            if (tenDangNhapTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên đăng nhập đã tồn tại."
                });
            }

            _context.NHANVIEN.Add(model);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = model.MaNV },
                model);
        }

        // PUT: api/nhan-vien/NV001
       // PUT: api/nhan-vien/NV001
        [HttpPut("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")] // Chỉ tài khoản Quản trị mới được Sửa
        public async Task<IActionResult> Update(string id, [FromBody] NHANVIEN model)
        {
            if (id != model.MaNV)
            {
                return BadRequest(new
                {
                    message = "Mã nhân viên không khớp."
                });
            }

            var employee = await _context.NHANVIEN.FindAsync(id);

            if (employee == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhân viên."
                });
            }

            bool tenDangNhapTonTai = await _context.NHANVIEN
                .AnyAsync(x => x.TenDangNhap == model.TenDangNhap && x.MaNV != id);

            if (tenDangNhapTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên đăng nhập đã tồn tại."
                });
            }

            // Cập nhật các thông tin cơ bản
            employee.TenDangNhap = model.TenDangNhap;
            employee.MatKhau = model.MatKhau;
            employee.TenNV = model.TenNV;
            employee.NgaySinh = model.NgaySinh;
            employee.GioiTinh = model.GioiTinh;
            employee.SoDT = model.SoDT;
            employee.DiaChiNV = model.DiaChiNV;
            
            // Nếu form có gửi VaiTro lên thì mới cập nhật, không thì giữ nguyên
            if (!string.IsNullOrEmpty(model.VaiTroKhuVucPhuTrach))
            {
                employee.VaiTroKhuVucPhuTrach = model.VaiTroKhuVucPhuTrach;
            }

            // Cập nhật trạng thái làm việc (Đang làm việc / Đã nghỉ việc)
            if (!string.IsNullOrEmpty(model.TrangThaiLamViec))
            {
                employee.TrangThaiLamViec = model.TrangThaiLamViec;
            }

            if (model.TrangThai.HasValue)
            {
                employee.TrangThai = model.TrangThai;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật nhân viên thành công."
            });
        }
        

        // ---------------- THÊM MỚI TẠI ĐÂY ----------------
        // PUT: api/nhan-vien/profile/NV001
        [HttpPut("profile/{id}")]
        [Authorize] // Bất kỳ ai đăng nhập cũng được gọi, nhưng chỉ sửa thông tin của mình
        public async Task<IActionResult> UpdateProfile(string id, [FromBody] NHANVIEN model)
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

            // CHỈ CẬP NHẬT CÁC TRƯỜNG CHO PHÉP (Bỏ qua VaiTro, TrangThai, TrangThaiLamViec)
            employee.TenDangNhap = model.TenDangNhap;
            employee.MatKhau = model.MatKhau;
            employee.TenNV = model.TenNV;
            employee.NgaySinh = model.NgaySinh;
            employee.GioiTinh = model.GioiTinh;
            employee.SoDT = model.SoDT;
            employee.DiaChiNV = model.DiaChiNV;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật thông tin cá nhân thành công." });
        }
        // ---------------- KẾT THÚC THÊM MỚI ----------------

        // DELETE: api/nhan-vien/NV001
        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")] // Chỉ tài khoản Quản trị mới được Xóa
        public async Task<IActionResult> Delete(string id)
        {
            var employee = await _context.NHANVIEN.FindAsync(id);

            if (employee == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhân viên."
                });
            }

            _context.NHANVIEN.Remove(employee);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa nhân viên thành công."
            });
        }
    }
}