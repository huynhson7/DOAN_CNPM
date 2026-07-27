using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/nha-cung-cap")]
    [ApiController]
    public class NhaCungCapController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NhaCungCapController(AppDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // 1. GET: Lấy danh sách (Quyền: Admin, Nhân viên)
        // =====================================================
        [HttpGet]
        [Authorize(Roles = "Quản trị Hệ thống, NV Bán Hàng")]
        public async Task<IActionResult> GetAll()
        {
            var list = await _context.NHACUNGCAP
                .AsNoTracking()
                .ToListAsync();

            return Ok(list);
        }

        // =====================================================
        // 2. GET: Lấy chi tiết theo ID (Quyền: Admin, Nhân viên)
        // =====================================================
        [HttpGet("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống, NV Bán Hàng")]
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _context.NHACUNGCAP
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaNcc == id);

            if (item == null)
            {
                return NotFound(new { message = "Không tìm thấy nhà cung cấp." });
            }

            return Ok(item);
        }

        // =====================================================
        // 3. POST: Thêm mới (Chỉ Admin)
        // =====================================================
        [HttpPost]
        [Authorize(Roles = "Quản trị Hệ thống")]
        public async Task<IActionResult> Create([FromBody] NHACUNGCAP model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool maTonTai = await _context.NHACUNGCAP.AnyAsync(x => x.MaNcc == model.MaNcc);
            if (maTonTai)
            {
                return BadRequest(new { message = "Mã nhà cung cấp đã tồn tại." });
            }

            bool tenTonTai = await _context.NHACUNGCAP.AnyAsync(x => x.TenNcc == model.TenNcc);
            if (tenTonTai)
            {
                return BadRequest(new { message = "Tên nhà cung cấp đã tồn tại." });
            }

            _context.NHACUNGCAP.Add(model);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = model.MaNcc }, model);
        }

        // =====================================================
        // 4. PUT: Cập nhật thông tin (Chỉ Admin)
        // =====================================================
        [HttpPut("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")]
        public async Task<IActionResult> Update(string id, [FromBody] NHACUNGCAP model)
        {
            if (id != model.MaNcc)
            {
                return BadRequest(new { message = "Mã nhà cung cấp không khớp." });
            }

            var supplier = await _context.NHACUNGCAP.FindAsync(id);
            if (supplier == null)
            {
                return NotFound(new { message = "Không tìm thấy nhà cung cấp." });
            }

            bool tenTonTai = await _context.NHACUNGCAP.AnyAsync(x => x.TenNcc == model.TenNcc && x.MaNcc != id);
            if (tenTonTai)
            {
                return BadRequest(new { message = "Tên nhà cung cấp đã tồn tại." });
            }

            supplier.TenNcc = model.TenNcc;
            supplier.MoTaNcc = model.MoTaNcc;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật nhà cung cấp thành công." });
        }

        // =====================================================
        // 5. DELETE: Xóa cứng (Chỉ Admin)
        // =====================================================
        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")]
        public async Task<IActionResult> Delete(string id)
        {
            var supplier = await _context.NHACUNGCAP.FindAsync(id);
            if (supplier == null)
            {
                return NotFound(new { message = "Không tìm thấy nhà cung cấp." });
            }

            _context.NHACUNGCAP.Remove(supplier);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa nhà cung cấp thành công." });
        }
    }
}