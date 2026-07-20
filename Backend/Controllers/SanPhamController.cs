using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace Backend.Controllers
{
    [Route("api/san-pham")]
    [ApiController]
    public partial class SanPhamController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public SanPhamController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // =====================================================
        // POST: api/san-pham/upload-image
        // =====================================================
        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Không có file nào được tải lên." });

            string webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            string uploadsFolder = Path.Combine(webRootPath, "images");

            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            string uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;
            string filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            string fileUrl = $"http://localhost:5129/images/{uniqueFileName}";
            return Ok(new { url = fileUrl });
        }

        // =====================================================
        // GET: api/san-pham
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _context.SANPHAM
                .AsNoTracking()
                .OrderBy(x => x.MaSP)
                .ToListAsync();

            return Ok(list);
        }

        // =====================================================
        // GET: api/san-pham/SP001
        // =====================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _context.SANPHAM
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaSP == id);

            if (item == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy sản phẩm."
                });
            }

            return Ok(item);
        }

        // =====================================================
        // POST: api/san-pham
        // =====================================================
        [HttpPost]
        //[Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Create([FromBody] SanPhamRequest request)
        {
            if (!ModelState.IsValid || request?.SanPham == null)
                return BadRequest(ModelState);

            // Kiểm tra mã sản phẩm
            bool maTonTai = await _context.SANPHAM
                .AnyAsync(x => x.MaSP == request.SanPham.MaSP);

            if (maTonTai)
            {
                return BadRequest(new { message = "Mã sản phẩm đã tồn tại." });
            }

            // Kiểm tra tên sản phẩm
            bool tenTonTai = await _context.SANPHAM
                .AnyAsync(x => x.TenSP == request.SanPham.TenSP);

            if (tenTonTai)
            {
                return BadRequest(new { message = "Tên sản phẩm đã tồn tại." });
            }

            // Kiểm tra nhóm sản phẩm
            bool nhomTonTai = await _context.NHOMSANPHAM
                .AnyAsync(x => x.MaNhomSP == request.SanPham.MaNhomSP);

            if (!nhomTonTai)
            {
                return BadRequest(new { message = "Nhóm sản phẩm không tồn tại." });
            }

            // Kiểm tra mục đích sử dụng
            bool mucDichTonTai = await _context.MUCDICHSUDUNG
                .AnyAsync(x => x.MaMD == request.SanPham.MaMD);

            if (!mucDichTonTai)
            {
                return BadRequest(new { message = "Mục đích sử dụng không tồn tại." });
            }

            var reqMaVLs = request.MaVatLieus.Distinct().ToList();
            if (reqMaVLs.Any())
            {
                var countVL = await _context.VATLIEU.CountAsync(x => reqMaVLs.Contains(x.MaVL));
                if (countVL != reqMaVLs.Count)
                {
                    return BadRequest(new { message = "Một hoặc nhiều mã vật liệu không tồn tại." });
                }
            }

            var reqMaNCCs = request.MaNhaCungCaps.Distinct().ToList();
            if (reqMaNCCs.Any())
            {
                var countNCC = await _context.NHACUNGCAP.CountAsync(x => reqMaNCCs.Contains(x.MaNcc));
                if (countNCC != reqMaNCCs.Count)
                {
                    return BadRequest(new { message = "Một hoặc nhiều mã nhà cung cấp không tồn tại." });
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Thêm sản phẩm
                _context.SANPHAM.Add(request.SanPham);
                await _context.SaveChangesAsync();

                // Thêm danh sách vật liệu (LAM_NEN)
                foreach (var maVL in reqMaVLs)
                {
                    _context.LAMNEN.Add(new LAMNEN
                    {
                        MaSP = request.SanPham.MaSP,
                        MaVL = maVL
                    });
                }

                // Thêm danh sách nhà cung cấp (CUNG_CAP)
                foreach (var maNCC in reqMaNCCs)
                {
                    _context.CUNGCAP.Add(new CUNGCAP
                    {
                        MaSP = request.SanPham.MaSP,
                        MaNcc = maNCC
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = request.SanPham.MaSP },
                    request.SanPham);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Thêm sản phẩm thất bại.",
                    error = ex.Message
                });
            }
        }

        // =====================================================
        // PUT: api/san-pham/SP001
        // =====================================================
        [HttpPut("{id}")]
        //[Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(string id, [FromBody] SanPhamRequest request)
        {
            if (request?.SanPham == null || id != request.SanPham.MaSP)
            {
                return BadRequest(new { message = "Mã sản phẩm không khớp hoặc dữ liệu rỗng." });
            }

            var product = await _context.SANPHAM.FindAsync(id);

            if (product == null)
            {
                return NotFound(new { message = "Không tìm thấy sản phẩm." });
            }

            bool tenTonTai = await _context.SANPHAM
                .AnyAsync(x => x.TenSP == request.SanPham.TenSP && x.MaSP != id);

            if (tenTonTai)
            {
                return BadRequest(new { message = "Tên sản phẩm đã tồn tại." });
            }

            var reqMaVLs = request.MaVatLieus.Distinct().ToList();
            if (reqMaVLs.Any())
            {
                var countVL = await _context.VATLIEU.CountAsync(x => reqMaVLs.Contains(x.MaVL));
                if (countVL != reqMaVLs.Count)
                {
                    return BadRequest(new { message = "Một hoặc nhiều mã vật liệu không tồn tại." });
                }
            }

            var reqMaNCCs = request.MaNhaCungCaps.Distinct().ToList();
            if (reqMaNCCs.Any())
            {
                var countNCC = await _context.NHACUNGCAP.CountAsync(x => reqMaNCCs.Contains(x.MaNcc));
                if (countNCC != reqMaNCCs.Count)
                {
                    return BadRequest(new { message = "Một hoặc nhiều mã nhà cung cấp không tồn tại." });
                }
            }

            // 1. LƯU LẠI ĐƯỜNG DẪN ẢNH CŨ TRƯỚC KHI CẬP NHẬT
            string oldImageUrl = product.HinhAnh;
            string newImageUrl = request.SanPham.HinhAnh;

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Cập nhật thuộc tính sản phẩm
                product.MaMD = request.SanPham.MaMD;
                product.MaNhomSP = request.SanPham.MaNhomSP;
                product.TenSP = request.SanPham.TenSP;
                product.DonViTinh = request.SanPham.DonViTinh;
                product.SoLuongTon = request.SanPham.SoLuongTon;
                product.GiaBan = request.SanPham.GiaBan;
                product.MoTa = request.SanPham.MoTa;
                product.HinhAnh = request.SanPham.HinhAnh;
                product.TrangThai = request.SanPham.TrangThai;

                // Xóa vật liệu & nhà cung cấp cũ
                var oldVatLieus = await _context.LAMNEN.Where(x => x.MaSP == id).ToListAsync();
                _context.LAMNEN.RemoveRange(oldVatLieus);

                var oldNhaCC = await _context.CUNGCAP.Where(x => x.MaSP == id).ToListAsync();
                _context.CUNGCAP.RemoveRange(oldNhaCC);

                await _context.SaveChangesAsync();

                // Thêm vật liệu mới
                foreach (var maVL in reqMaVLs)
                {
                    _context.LAMNEN.Add(new LAMNEN { MaSP = id, MaVL = maVL });
                }

                // Thêm nhà cung cấp mới
                foreach (var maNCC in reqMaNCCs)
                {
                    _context.CUNGCAP.Add(new CUNGCAP { MaSP = id, MaNcc = maNCC });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // ====================================================
                // 2. NẾU ẢNH BỊ THAY ĐỔI, TIẾN HÀNH XÓA FILE ẢNH CŨ
                // ====================================================
                if (!string.IsNullOrEmpty(oldImageUrl) && oldImageUrl != newImageUrl)
                {
                    try
                    {
                        // Lấy tên file cũ
                        string oldFileName = oldImageUrl.Substring(oldImageUrl.LastIndexOf('/') + 1);

                        string webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        string oldFilePath = Path.Combine(webRootPath, "images", oldFileName);

                        // Nếu file cũ tồn tại thì xóa
                        if (System.IO.File.Exists(oldFilePath))
                        {
                            System.IO.File.Delete(oldFilePath);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Không thể xóa file ảnh cũ: {ex.Message}");
                    }
                }

                return Ok(new { message = "Cập nhật sản phẩm thành công." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Cập nhật sản phẩm thất bại.",
                    error = ex.Message
                });
            }
        }
        // =====================================================
        // DELETE: api/san-pham/SP001
        // =====================================================
        [HttpDelete("{id}")]
        //[Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Delete(string id)
        {
            var product = await _context.SANPHAM.FindAsync(id);

            if (product == null)
            {
                return NotFound(new { message = "Không tìm thấy sản phẩm." });
            }

            // Giữ lại đường dẫn ảnh trước khi xóa dữ liệu
            string oldImageUrl = product.HinhAnh;

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Xóa các bản ghi liên quan ở bảng trung gian
                var vatLieus = await _context.LAMNEN.Where(x => x.MaSP == id).ToListAsync();
                if (vatLieus.Any()) _context.LAMNEN.RemoveRange(vatLieus);

                var nhaCungCaps = await _context.CUNGCAP.Where(x => x.MaSP == id).ToListAsync();
                if (nhaCungCaps.Any()) _context.CUNGCAP.RemoveRange(nhaCungCaps);

                await _context.SaveChangesAsync();

                // Xóa sản phẩm
                _context.SANPHAM.Remove(product);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // ====================================================
                // XÓA FILE ẢNH VẬT LÝ TRONG THƯ MỤC WWWROOT
                // ====================================================
                if (!string.IsNullOrEmpty(oldImageUrl))
                {
                    try
                    {
                        // Cắt lấy tên file từ chuỗi URL
                        string fileName = oldImageUrl.Substring(oldImageUrl.LastIndexOf('/') + 1);

                        string webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        string filePath = Path.Combine(webRootPath, "images", fileName);

                        // Kiểm tra nếu file tồn tại trên máy thì xóa
                        if (System.IO.File.Exists(filePath))
                        {
                            System.IO.File.Delete(filePath);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Không thể xóa file ảnh vật lý: {ex.Message}");
                    }
                }

                return Ok(new { message = "Xóa sản phẩm và dọn dẹp ảnh thành công." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Xóa sản phẩm thất bại.",
                    error = ex.Message
                });
            }
        }

        // =====================================================
        // DTO nhận dữ liệu từ Frontend
        // =====================================================
        public class SanPhamRequest
        {
            public SANPHAM SanPham { get; set; } = new SANPHAM();
            public List<string> MaVatLieus { get; set; } = new();
            public List<string> MaNhaCungCaps { get; set; } = new();
        }
    }
}