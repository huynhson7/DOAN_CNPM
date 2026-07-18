using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/nhom-san-pham")]
    [ApiController]
    public class NhomSanPhamController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NhomSanPhamController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/nhom-san-pham
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _context.NHOMSANPHAM
                .AsNoTracking()
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/nhom-san-pham/NSP001
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _context.NHOMSANPHAM
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaNhomSP == id);

            if (item == null)
                return NotFound(new
                {
                    message = "Không tìm thấy nhóm sản phẩm."
                });

            return Ok(item);
        }

        // POST: api/nhom-san-pham
        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Create([FromBody] NHOMSANPHAM model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool maTonTai = await _context.NHOMSANPHAM
                .AnyAsync(x => x.MaNhomSP == model.MaNhomSP);

            if (maTonTai)
            {
                return BadRequest(new
                {
                    message = "Mã nhóm sản phẩm đã tồn tại."
                });
            }

            bool tenTonTai = await _context.NHOMSANPHAM
                .AnyAsync(x => x.TenNhomSP == model.TenNhomSP);

            if (tenTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên nhóm sản phẩm đã tồn tại."
                });
            }

            _context.NHOMSANPHAM.Add(model);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = model.MaNhomSP },
                model);
        }

        // PUT: api/nhom-san-pham/NSP001
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(string id, [FromBody] NHOMSANPHAM model)
        {
            if (id != model.MaNhomSP)
            {
                return BadRequest(new
                {
                    message = "Mã nhóm sản phẩm không khớp."
                });
            }

            var group = await _context.NHOMSANPHAM.FindAsync(id);

            if (group == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhóm sản phẩm."
                });
            }

            bool tenTonTai = await _context.NHOMSANPHAM
                .AnyAsync(x => x.TenNhomSP == model.TenNhomSP && x.MaNhomSP != id);

            if (tenTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên nhóm sản phẩm đã tồn tại."
                });
            }

            group.TenNhomSP = model.TenNhomSP;
            group.TrangThai = model.TrangThai;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật nhóm sản phẩm thành công."
            });
        }

        // DELETE: api/nhom-san-pham/NSP001
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Delete(string id)
        {
            var group = await _context.NHOMSANPHAM.FindAsync(id);

            if (group == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhóm sản phẩm."
                });
            }

            _context.NHOMSANPHAM.Remove(group);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa nhóm sản phẩm thành công."
            });
        }
    }
}