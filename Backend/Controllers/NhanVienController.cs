using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/nhan-vien")]
    [ApiController]
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
        // Tạm thời ẩn yêu cầu phân quyền để test tính năng Thêm
        // [Authorize(Roles = "Admin,Manager")]
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
        [HttpPut("{id}")]
        // Tạm thời ẩn yêu cầu phân quyền để test tính năng Sửa
        // [Authorize(Roles = "Admin,Manager")]
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

            employee.TenDangNhap = model.TenDangNhap;
            employee.MatKhau = model.MatKhau;
            employee.TenNV = model.TenNV;
            employee.NgaySinh = model.NgaySinh;
            employee.GioiTinh = model.GioiTinh;
            employee.SoDT = model.SoDT;
            employee.DiaChiNV = model.DiaChiNV;
            employee.VaiTroKhuVucPhuTrach = model.VaiTroKhuVucPhuTrach;
            employee.TrangThaiLamViec = model.TrangThaiLamViec;
            employee.TrangThai = model.TrangThai;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật nhân viên thành công."
            });
        }

        // DELETE: api/nhan-vien/NV001
        [HttpDelete("{id}")]
        // Tạm thời ẩn yêu cầu phân quyền để test tính năng Xóa
        // [Authorize(Roles = "Admin,Manager")]
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