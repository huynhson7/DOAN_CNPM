using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/muc-dich-su-dung")]
    [ApiController]
    public class MucDichSuDungController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MucDichSuDungController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/muc-dich-su-dung
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _context.MUCDICHSUDUNG
                .AsNoTracking()
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/muc-dich-su-dung/MD001
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _context.MUCDICHSUDUNG
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaMD == id);

            if (item == null)
                return NotFound(new
                {
                    message = "Không tìm thấy mục đích sử dụng."
                });

            return Ok(item);
        }

        // POST: api/muc-dich-su-dung
        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Create([FromBody] MUCDICHSUDUNG model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool maTonTai = await _context.MUCDICHSUDUNG
                .AnyAsync(x => x.MaMD == model.MaMD);

            if (maTonTai)
            {
                return BadRequest(new
                {
                    message = "Mã mục đích sử dụng đã tồn tại."
                });
            }

            bool tenTonTai = await _context.MUCDICHSUDUNG
                .AnyAsync(x => x.TenMD == model.TenMD);

            if (tenTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên mục đích sử dụng đã tồn tại."
                });
            }

            _context.MUCDICHSUDUNG.Add(model);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = model.MaMD },
                model);
        }

        // PUT: api/muc-dich-su-dung/MD001
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(string id, [FromBody] MUCDICHSUDUNG model)
        {
            if (id != model.MaMD)
            {
                return BadRequest(new
                {
                    message = "Mã mục đích sử dụng không khớp."
                });
            }

            var purpose = await _context.MUCDICHSUDUNG.FindAsync(id);

            if (purpose == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy mục đích sử dụng."
                });
            }

            bool tenTonTai = await _context.MUCDICHSUDUNG
                .AnyAsync(x => x.TenMD == model.TenMD && x.MaMD != id);

            if (tenTonTai)
            {
                return BadRequest(new
                {
                    message = "Tên mục đích sử dụng đã tồn tại."
                });
            }

            purpose.TenMD = model.TenMD;
            purpose.MoTaMD = model.MoTaMD;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật mục đích sử dụng thành công."
            });
        }

        // DELETE: api/muc-dich-su-dung/MD001
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Delete(string id)
        {
            var purpose = await _context.MUCDICHSUDUNG.FindAsync(id);

            if (purpose == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy mục đích sử dụng."
                });
            }

            _context.MUCDICHSUDUNG.Remove(purpose);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa mục đích sử dụng thành công."
            });
        }
    }
}