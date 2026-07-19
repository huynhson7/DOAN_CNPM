using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/vat-lieu")]
    [ApiController]
    public class VatLieuController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VatLieuController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/vat-lieu
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _context.VATLIEU
                .AsNoTracking()
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/vat-lieu/VL001
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _context.VATLIEU
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaVL == id);

            if (item == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy vật liệu."
                });
            }

            return Ok(item);
        }

        // POST: api/vat-lieu
        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Create([FromBody] VATLIEU model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool maTonTai = await _context.VATLIEU
                .AnyAsync(x => x.MaVL == model.MaVL);

            if (maTonTai)
            {
                return BadRequest(new
                {
                    message = "Mã vật liệu đã tồn tại."
                });
            }

            bool tenTonTai = await _context.VATLIEU
                .AnyAsync(x => x.TenVL == model.TenVL);

            if (tenTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên vật liệu đã tồn tại."
                });
            }

            _context.VATLIEU.Add(model);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = model.MaVL },
                model);
        }

        // PUT: api/vat-lieu/VL001
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(string id, [FromBody] VATLIEU model)
        {
            if (id != model.MaVL)
            {
                return BadRequest(new
                {
                    message = "Mã vật liệu không khớp."
                });
            }

            var material = await _context.VATLIEU.FindAsync(id);

            if (material == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy vật liệu."
                });
            }

            bool tenTonTai = await _context.VATLIEU
                .AnyAsync(x => x.TenVL == model.TenVL && x.MaVL != id);

            if (tenTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên vật liệu đã tồn tại."
                });
            }

            material.TenVL = model.TenVL;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật vật liệu thành công."
            });
        }

        // DELETE: api/vat-lieu/VL001
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Delete(string id)
        {
            var material = await _context.VATLIEU.FindAsync(id);

            if (material == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy vật liệu."
                });
            }

            _context.VATLIEU.Remove(material);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa vật liệu thành công."
            });
        }
    }
}