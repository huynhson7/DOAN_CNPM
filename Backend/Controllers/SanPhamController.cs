using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

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

        // Các định dạng ảnh được chấp nhận và giới hạn dung lượng cho việc lưu Base64 vào CSDL.
        private static readonly Dictionary<string, string> _allowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".gif"] = "image/gif",
            [".webp"] = "image/webp",
        };
        private const long MaxImageBytes = 5 * 1024 * 1024; // 5MB

        // =====================================================
        // POST: api/san-pham/upload-image
        // =====================================================
        // [SỬA] Không lưu ảnh ra file vật lý trong wwwroot nữa. Thay vào đó, ảnh được
        // đọc thành chuỗi Base64 (data URI) và trả về để Frontend lưu thẳng vào cột
        // HinhAnh trong CSDL (xem SanPhamRequest -> Create/Update bên dưới).
        //
        // LÝ DO: file vật lý trong wwwroot/images KHÔNG đi theo khi export/import hay
        // backup/restore Database sang máy khác => ảnh "mất" dù dữ liệu SQL vẫn còn.
        // Lưu thẳng Base64 vào SQL đảm bảo ảnh luôn đi kèm dữ liệu, mở dự án ở máy nào
        // (miễn là dùng đúng Database đó) cũng thấy được ảnh trên web.
        [HttpPost("upload-image")]
        [AllowAnonymous]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Không có file nào được tải lên." });

            if (file.Length > MaxImageBytes)
                return BadRequest(new { message = "Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB." });

            string ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(ext) || !_allowedImageContentTypes.TryGetValue(ext, out var mimeType))
                return BadRequest(new { message = "Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận JPG, PNG, GIF, WEBP." });

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            string base64 = Convert.ToBase64String(memoryStream.ToArray());
            string dataUri = $"data:{mimeType};base64,{base64}";

            return Ok(new { url = dataUri });
        }

        

        // =====================================================
        // GET: api/san-pham
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool? chiHoatDong)
        {
            var query = _context.SANPHAM
                .AsNoTracking()
                .Include(x => x.NhomSanPham)
                .Include(x => x.MucDichSuDung)
                .Include(x => x.LamNens)
                    .ThenInclude(l => l.VatLieu)
                .Include(x => x.CungCaps)
                    .ThenInclude(c => c.NhaCungCap)
                .AsQueryable();

            if (chiHoatDong == true)
            {
                query = query.Where(x => x.TrangThai == 1)
                             .OrderBy(x => x.TenSP);
            }
            else
            {
                query = query.OrderBy(x => x.MaSP.Length)
                             .ThenBy(x => x.MaSP);
            }

            var list = await query.ToListAsync();
            var baseUrl = $"{Request.Scheme}://{Request.Host.Value}";

            foreach (var item in list)
            {
                if (!string.IsNullOrEmpty(item.HinhAnh) && !item.HinhAnh.StartsWith("data:"))
                {
                    // Ảnh mới (Base64/data URI) giữ nguyên - chỉ ảnh CŨ (file vật lý còn sót lại
                    // từ trước khi chuyển sang lưu Base64) mới cần chuẩn hóa URL theo baseUrl.
                    if (item.HinhAnh.StartsWith("/images/"))
                    {
                        item.HinhAnh = baseUrl + item.HinhAnh;
                    }
                    else if (Uri.TryCreate(item.HinhAnh, UriKind.Absolute, out Uri? absoluteUri))
                    {
                        // Chuẩn hóa lại domain/port theo máy chủ hiện tại đang thực thi
                        item.HinhAnh = $"{baseUrl}{absoluteUri.AbsolutePath}";
                    }
                }
            }

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
                return NotFound(new { message = "Không tìm thấy sản phẩm." });
            }

            if (!string.IsNullOrEmpty(item.HinhAnh) && !item.HinhAnh.StartsWith("data:"))
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host.Value}";
                if (item.HinhAnh.StartsWith("/images/"))
                {
                    item.HinhAnh = baseUrl + item.HinhAnh;
                }
                else if (Uri.TryCreate(item.HinhAnh, UriKind.Absolute, out Uri? absoluteUri))
                {
                    item.HinhAnh = $"{baseUrl}{absoluteUri.AbsolutePath}";
                }
            }

            var maVatLieus = await _context.LAMNEN
                .Where(x => x.MaSP == id)
                .Select(x => x.MaVL)
                .ToListAsync();

            var maNhaCungCaps = await _context.CUNGCAP
                .Where(x => x.MaSP == id)
                .Select(x => x.MaNcc)
                .ToListAsync();

            return Ok(new
            {
                MaSP = item.MaSP,
                TenSP = item.TenSP,
                MaNhomSP = item.MaNhomSP,
                MaMD = item.MaMD,
                DonViTinh = item.DonViTinh,
                SoLuongTon = item.SoLuongTon,
                GiaBan = item.GiaBan,
                MoTa = item.MoTa,
                TrangThai = item.TrangThai,
                HinhAnh = item.HinhAnh,
                MaVatLieus = maVatLieus,
                MaNhaCungCaps = maNhaCungCaps
            });
        }

        // =====================================================
        // POST: api/san-pham
        // =====================================================
        [HttpPost]
        [Authorize(Roles = "Quản trị Hệ thống")]
        public async Task<IActionResult> Create([FromBody] SanPhamRequest request)
        {
            if (!ModelState.IsValid || request?.SanPham == null)
                return BadRequest(ModelState);

            bool maTonTai = await _context.SANPHAM.AnyAsync(x => x.MaSP == request.SanPham.MaSP);
            if (maTonTai) return BadRequest(new { message = "Mã sản phẩm đã tồn tại." });

            bool tenTonTai = await _context.SANPHAM.AnyAsync(x => x.TenSP == request.SanPham.TenSP);
            if (tenTonTai) return BadRequest(new { message = "Tên sản phẩm đã tồn tại." });

            bool nhomTonTai = await _context.NHOMSANPHAM.AnyAsync(x => x.MaNhomSP == request.SanPham.MaNhomSP);
            if (!nhomTonTai) return BadRequest(new { message = "Nhóm sản phẩm không tồn tại." });

            bool mucDichTonTai = await _context.MUCDICHSUDUNG.AnyAsync(x => x.MaMD == request.SanPham.MaMD);
            if (!mucDichTonTai) return BadRequest(new { message = "Mục đích sử dụng không tồn tại." });

            var reqMaVLs = request.MaVatLieus.Distinct().ToList();
            if (reqMaVLs.Any())
            {
                var countVL = await _context.VATLIEU.CountAsync(x => reqMaVLs.Contains(x.MaVL));
                if (countVL != reqMaVLs.Count)
                    return BadRequest(new { message = "Một hoặc nhiều mã vật liệu không tồn tại." });
            }

            var reqMaNCCs = request.MaNhaCungCaps.Distinct().ToList();
            if (reqMaNCCs.Any())
            {
                var countNCC = await _context.NHACUNGCAP.CountAsync(x => reqMaNCCs.Contains(x.MaNcc));
                if (countNCC != reqMaNCCs.Count)
                    return BadRequest(new { message = "Một hoặc nhiều mã nhà cung cấp không tồn tại." });
            }

            if (!string.IsNullOrEmpty(request.SanPham.HinhAnh) && !request.SanPham.HinhAnh.StartsWith("data:"))
            {
                if (Uri.TryCreate(request.SanPham.HinhAnh, UriKind.Absolute, out Uri? uri))
                {
                     request.SanPham.HinhAnh = uri?.AbsolutePath;
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.SANPHAM.Add(request.SanPham);
                await _context.SaveChangesAsync();

                foreach (var maVL in reqMaVLs)
                {
                    _context.LAMNEN.Add(new LAMNEN { MaSP = request.SanPham.MaSP, MaVL = maVL });
                }

                foreach (var maNCC in reqMaNCCs)
                {
                    _context.CUNGCAP.Add(new CUNGCAP { MaSP = request.SanPham.MaSP, MaNcc = maNCC });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetById), new { id = request.SanPham.MaSP }, request.SanPham);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Thêm sản phẩm thất bại.", error = ex.Message });
            }
        }

        // =====================================================
        // PUT: api/san-pham/SP001
        // =====================================================
        [HttpPut("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống,NV Bán Hàng")]
        public async Task<IActionResult> Update(string id, [FromBody] SanPhamRequest request)
        {
            if (request?.SanPham == null || id != request.SanPham.MaSP)
                return BadRequest(new { message = "Mã sản phẩm không khớp hoặc dữ liệu rỗng." });

            var product = await _context.SANPHAM.FindAsync(id);
            if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm." });

            // =====================================================
            // PHÂN QUYỀN THEO ROLE:
            // - Quản trị Hệ thống: toàn quyền sửa mọi trường (kể cả GiaBan, TrangThai).
            // - NV Bán Hàng: CHỈ được cập nhật SoLuongTon, MoTa, HinhAnh.
            //   Mọi trường khác (kể cả nếu Frontend lỡ gửi lên do bị can thiệp)
            //   đều bị ép về lại đúng giá trị hiện có trong CSDL, không tin
            //   tưởng Frontend - đây là lớp bảo vệ THẬT SỰ, không chỉ ẩn nút UI.
            // =====================================================
            bool isAdmin = User.IsInRole("Quản trị Hệ thống");
            if (!isAdmin)
            {
                request.SanPham.MaMD = product.MaMD;
                request.SanPham.MaNhomSP = product.MaNhomSP;
                request.SanPham.TenSP = product.TenSP;
                request.SanPham.DonViTinh = product.DonViTinh;
                request.SanPham.GiaBan = product.GiaBan;
                request.SanPham.TrangThai = product.TrangThai;

                request.MaVatLieus = await _context.LAMNEN.Where(x => x.MaSP == id).Select(x => x.MaVL).ToListAsync();
                request.MaNhaCungCaps = await _context.CUNGCAP.Where(x => x.MaSP == id).Select(x => x.MaNcc).ToListAsync();
            }

            bool tenTonTai = await _context.SANPHAM.AnyAsync(x => x.TenSP == request.SanPham.TenSP && x.MaSP != id);
            if (tenTonTai) return BadRequest(new { message = "Tên sản phẩm đã tồn tại." });

            var reqMaVLs = request.MaVatLieus.Distinct().ToList();
            if (reqMaVLs.Any())
            {
                var countVL = await _context.VATLIEU.CountAsync(x => reqMaVLs.Contains(x.MaVL));
                if (countVL != reqMaVLs.Count)
                    return BadRequest(new { message = "Một hoặc nhiều mã vật liệu không tồn tại." });
            }

            var reqMaNCCs = request.MaNhaCungCaps.Distinct().ToList();
            if (reqMaNCCs.Any())
            {
                var countNCC = await _context.NHACUNGCAP.CountAsync(x => reqMaNCCs.Contains(x.MaNcc));
                if (countNCC != reqMaNCCs.Count)
                    return BadRequest(new { message = "Một hoặc nhiều mã nhà cung cấp không tồn tại." });
            }

            if (!string.IsNullOrEmpty(request.SanPham.HinhAnh) && !request.SanPham.HinhAnh.StartsWith("data:"))
            {
                if (Uri.TryCreate(request.SanPham.HinhAnh, UriKind.Absolute, out Uri? uri))
                {
                    request.SanPham.HinhAnh = uri?.AbsolutePath;
                }
            }

            string? oldImageUrl = product.HinhAnh;
            string? newImageUrl = request.SanPham.HinhAnh;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                product.MaMD = request.SanPham.MaMD;
                product.MaNhomSP = request.SanPham.MaNhomSP;
                product.TenSP = request.SanPham.TenSP;
                product.DonViTinh = request.SanPham.DonViTinh;
                product.SoLuongTon = request.SanPham.SoLuongTon;
                product.GiaBan = request.SanPham.GiaBan;
                product.MoTa = request.SanPham.MoTa;
                product.HinhAnh = request.SanPham.HinhAnh;
                product.TrangThai = request.SanPham.TrangThai;

                var oldVatLieus = await _context.LAMNEN.Where(x => x.MaSP == id).ToListAsync();
                _context.LAMNEN.RemoveRange(oldVatLieus);

                var oldNhaCC = await _context.CUNGCAP.Where(x => x.MaSP == id).ToListAsync();
                _context.CUNGCAP.RemoveRange(oldNhaCC);
                await _context.SaveChangesAsync();

                foreach (var maVL in reqMaVLs)
                {
                    _context.LAMNEN.Add(new LAMNEN { MaSP = id, MaVL = maVL });
                }

                foreach (var maNCC in reqMaNCCs)
                {
                    _context.CUNGCAP.Add(new CUNGCAP { MaSP = id, MaNcc = maNCC });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (!string.IsNullOrEmpty(oldImageUrl) && oldImageUrl != newImageUrl
                    && !oldImageUrl.StartsWith("data:") && oldImageUrl.Contains("/images/"))
                {
                    try
                    {
                        string oldFileName = oldImageUrl.Substring(oldImageUrl.LastIndexOf('/') + 1);
                        string webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        string oldFilePath = Path.Combine(webRootPath, "images", oldFileName);

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
                return BadRequest(new { message = "Cập nhật sản phẩm thất bại.", error = ex.Message });
            }
        }

        // =====================================================
        // DELETE: api/san-pham/SP001
        // =====================================================
        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị Hệ thống")]
        public async Task<IActionResult> Delete(string id)
        {
            var product = await _context.SANPHAM.FindAsync(id);
            if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm." });

            string? oldImageUrl = product.HinhAnh;
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var vatLieus = await _context.LAMNEN.Where(x => x.MaSP == id).ToListAsync();
                if (vatLieus.Any()) _context.LAMNEN.RemoveRange(vatLieus);

                var nhaCungCaps = await _context.CUNGCAP.Where(x => x.MaSP == id).ToListAsync();
                if (nhaCungCaps.Any()) _context.CUNGCAP.RemoveRange(nhaCungCaps);

                await _context.SaveChangesAsync();
                _context.SANPHAM.Remove(product);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (!string.IsNullOrEmpty(oldImageUrl) && !oldImageUrl.StartsWith("data:") && oldImageUrl.Contains("/images/"))
                {
                    try
                    {
                        string fileName = oldImageUrl.Substring(oldImageUrl.LastIndexOf('/') + 1);
                        string webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        string filePath = Path.Combine(webRootPath, "images", fileName);

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
                return BadRequest(new { message = "Xóa sản phẩm thất bại.", error = ex.Message });
            }
        }

        public class SanPhamRequest
        {
            public SANPHAM SanPham { get; set; } = new SANPHAM();
            public List<string> MaVatLieus { get; set; } = new();
            public List<string> MaNhaCungCaps { get; set; } = new();
        }
    }
}