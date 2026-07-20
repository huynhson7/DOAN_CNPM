using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/khach-hang")]
    [ApiController]
    public class KhachHangController : ControllerBase
    {
        private readonly AppDbContext _context;

        public KhachHangController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/khach-hang
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _context.KHACHHANG
                .AsNoTracking()
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/khach-hang/KH001
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _context.KHACHHANG
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaKhachHang == id);

            if (item == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy khách hàng."
                });
            }

            return Ok(item);
        }

        // POST: api/khach-hang
        [HttpPost]
        // [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Create([FromBody] KHACHHANG model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool maTonTai = await _context.KHACHHANG
                .AnyAsync(x => x.MaKhachHang == model.MaKhachHang);

            if (maTonTai)
            {
                return BadRequest(new
                {
                    message = "Mã khách hàng đã tồn tại."
                });
            }

            bool tenDangNhapTonTai = await _context.KHACHHANG
                .AnyAsync(x => x.TenDangNhap == model.TenDangNhap);

            if (tenDangNhapTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên đăng nhập đã tồn tại."
                });
            }

            // Kiểm tra số điện thoại
            bool soDienThoaiTonTai = await _context.KHACHHANG
                .AnyAsync(x => x.SDTKhachHang == model.SDTKhachHang);

            if (soDienThoaiTonTai)
            {
                return Conflict(new
                {
                    message = "Số điện thoại này đã được đăng ký"
                });
            }

            _context.KHACHHANG.Add(model);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = model.MaKhachHang },
                model);
        }

        // PUT: api/khach-hang/KH001
        [HttpPut("{id}")]
        // [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(string id, [FromBody] KHACHHANG model)
        {
            if (id != model.MaKhachHang)
            {
                return BadRequest(new
                {
                    message = "Mã khách hàng không khớp."
                });
            }

            var customer = await _context.KHACHHANG.FindAsync(id);

            if (customer == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy khách hàng."
                });
            }

            bool tenDangNhapTonTai = await _context.KHACHHANG
                .AnyAsync(x => x.TenDangNhap == model.TenDangNhap
                            && x.MaKhachHang != id);

            if (tenDangNhapTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên đăng nhập đã tồn tại."
                });
            }

            // Kiểm tra số điện thoại
            bool soDienThoaiTonTai = await _context.KHACHHANG
                .AnyAsync(x => x.SDTKhachHang == model.SDTKhachHang
                            && x.MaKhachHang != id);

            if (soDienThoaiTonTai)
            {
                return Conflict(new
                {
                    message = "Số điện thoại này đã được đăng ký"
                });
            }

            customer.TenDangNhap = model.TenDangNhap;
            customer.MatKhau = model.MatKhau;
            customer.TenKhachHang = model.TenKhachHang;
            customer.SDTKhachHang = model.SDTKhachHang;
            customer.DiaChiKhachHang = model.DiaChiKhachHang;
            customer.TrangThai = model.TrangThai;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật khách hàng thành công."
            });
        }

        // DELETE: api/khach-hang/KH001
        [HttpDelete("{id}")]
        // [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Delete(string id)
        {
            var customer = await _context.KHACHHANG.FindAsync(id);

            if (customer == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy khách hàng."
                });
            }

            _context.KHACHHANG.Remove(customer);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa khách hàng thành công."
            });
        }
    }
}