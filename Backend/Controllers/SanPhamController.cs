using Backend.Data;
using Backend.Helpers;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
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
        private readonly ICloudinaryImageService _cloudinaryService;
        private readonly ILogger<SanPhamController> _logger;

        public SanPhamController(AppDbContext context, ICloudinaryImageService cloudinaryService, ILogger<SanPhamController> logger)
        {
            _context = context;
            _cloudinaryService = cloudinaryService;
            _logger = logger;
        }

        // Chỉ 3 định dạng được phép theo yêu cầu (KHÔNG bao gồm GIF).
        // Kiểm tra CẢ Extension LẪN MIME Type, không chỉ dựa vào 1 trong 2.
        private static readonly Dictionary<string, string> _allowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp",
        };
        private const long MaxImageBytes = 5 * 1024 * 1024; // 5MB

        private IActionResult? ValidateImageFile(IFormFile? file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Không có file nào được tải lên hoặc file rỗng." });

            if (file.Length > MaxImageBytes)
                return BadRequest(new { message = "Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB." });

            string ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(ext) || !_allowedImageContentTypes.TryGetValue(ext, out var expectedMime))
                return BadRequest(new { message = "Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP." });

            // Kiểm tra MIME Type thực tế do trình duyệt gửi lên, không chỉ dựa vào đuôi file.
            bool mimeOk = !string.IsNullOrEmpty(file.ContentType) &&
                          (string.Equals(file.ContentType, expectedMime, StringComparison.OrdinalIgnoreCase)
                           || (expectedMime == "image/jpeg" && string.Equals(file.ContentType, "image/jpg", StringComparison.OrdinalIgnoreCase)));

            if (!mimeOk)
                return BadRequest(new { message = "MIME Type của file không khớp với định dạng ảnh được hỗ trợ (JPG, PNG, WEBP)." });

            return null;
        }

        // Xác định FolderName Cloudinary từ 1 nhóm sản phẩm: dùng FolderName nếu đã có,
        // nếu chưa có (dữ liệu cũ) thì tự sinh tạm từ TenNhomSP (không lưu lại vào DB ở đây,
        // việc gán FolderName chính thức cho nhóm sản phẩm thuộc trách nhiệm của
        // NhomSanPhamController).
        private static string ResolveFolderName(NHOMSANPHAM group)
        {
            return string.IsNullOrWhiteSpace(group.FolderName)
                ? CloudinaryFolderHelper.ToFolderName(group.TenNhomSP)
                : group.FolderName!;
        }

        // =====================================================
        // POST: api/san-pham/upload-image
        // =====================================================
        // Upload ảnh sản phẩm trực tiếp lên Cloudinary vào đúng thư mục của Nhóm Sản Phẩm
        // được chỉ định (form field "maNhomSP"). Trả về SecureUrl + PublicId để Frontend
        // giữ tạm trong state và gửi kèm khi gọi Create/Update.
        //
        // Chỉ Quản trị Hệ thống / NV Bán Hàng (người có quyền quản lý sản phẩm) mới được gọi
        // endpoint này - trước đây là [AllowAnonymous], đã khoá lại vì đây là hành động ghi dữ
        // liệu (tốn dung lượng/chi phí Cloudinary), không phải hành động xem công khai.
        [HttpPost("upload-image")]
        [Authorize(Roles = "Quản trị Hệ thống,NV Bán Hàng")]
        public async Task<IActionResult> UploadImage(IFormFile file, [FromForm] string maNhomSP)
        {
            var validationError = ValidateImageFile(file);
            if (validationError != null) return validationError;

            if (string.IsNullOrWhiteSpace(maNhomSP))
                return BadRequest(new { message = "Thiếu thông tin Nhóm Sản Phẩm để xác định thư mục lưu ảnh trên Cloudinary." });

            var group = await _context.NHOMSANPHAM.AsNoTracking().FirstOrDefaultAsync(x => x.MaNhomSP == maNhomSP);
            if (group == null)
                return BadRequest(new { message = "Nhóm sản phẩm không tồn tại." });

            string folderName = ResolveFolderName(group);

            try
            {
                await using var stream = file!.OpenReadStream();
                var uploadResult = await _cloudinaryService.UploadProductImageAsync(stream, file.FileName, folderName);

                return Ok(new
                {
                    secureUrl = uploadResult.SecureUrl,
                    publicId = uploadResult.PublicId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Upload ảnh sản phẩm lên Cloudinary thất bại. Nhóm={MaNhomSP}", maNhomSP);
                return StatusCode(502, new { message = "Tải ảnh lên Cloudinary thất bại. Vui lòng thử lại." });
            }
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
            NormalizeLegacyLocalImageUrls(list);

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

            NormalizeLegacyLocalImageUrls(new[] { item });

            var maVatLieus = await _context.LAMNEN
                .Where(x => x.MaSP == id)
                .Select(x => x.MaVL)
                .ToListAsync();

            var nhaCungCaps = await _context.CUNGCAP
                .Where(x => x.MaSP == id)
                .Include(x => x.NhaCungCap)
                .Select(x => new
                {
                    MaNcc = x.MaNcc,
                    TenNcc = x.NhaCungCap != null ? x.NhaCungCap.TenNcc : null
                })
                .ToListAsync();

            var maNhaCungCaps = nhaCungCaps.Select(x => x.MaNcc).ToList();

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
                // PublicId KHÔNG trả cho Frontend vì Frontend không sử dụng (theo yêu cầu) -
                // toàn bộ logic đổi/xoá ảnh cũ dùng PublicId đọc thẳng từ DB ở phía Backend.
                MaVatLieus = maVatLieus,
                MaNhaCungCaps = maNhaCungCaps,
                // [SỬA] Tên Nhà Cung Cấp (chỉ Mã + Tên, KHÔNG có thông tin nội bộ khác) để trang
                // Chi Tiết Sản Phẩm (chitiet-sanpham.html) hiển thị công khai cho Khách hàng -
                // đây là dữ liệu hiển thị nguồn gốc/xuất xứ sản phẩm, khác với việc "quản lý Nhà
                // Cung Cấp" (vẫn chỉ Admin/Nhân viên mới được truy cập qua NhaCungCapController).
                NhaCungCaps = nhaCungCaps
            });
        }

        // Chuẩn hoá HIỂN THỊ ảnh trước khi trả về Frontend. Có 3 dạng HinhAnh hợp lệ trong CSDL:
        //   1. "/images/xxx.ext"                -> ảnh local cũ, ghép domain hiện tại để hiển thị.
        //   2. "https://res.cloudinary.com/..."  -> đã migrate, giữ nguyên URL tuyệt đối.
        //   3. "data:image/..."                  -> dữ liệu Base64 cũ (hiếm), giữ nguyên.
        // Bất kỳ giá trị nào KHÁC 3 dạng trên (ví dụ tên file trần còn sót từ dữ liệu mẫu cũ
        // như "sofa_03.jpg", không rõ vị trí vật lý) đều KHÔNG đủ điều kiện để browser tải
        // được -> trả về null để Frontend rơi thẳng vào ảnh mặc định, TRÁNH bắn request ảnh
        // hỏng (404) ra Console/Network như acceptance criteria yêu cầu.
        //
        // QUAN TRỌNG: KHÔNG được đụng vào các URL tuyệt đối khác (Cloudinary...) - bản cũ
        // của code này từng dùng Uri.TryCreate để "chuẩn hoá lại domain" cho MỌI URL tuyệt
        // đối, dẫn đến việc URL Cloudinary (https://res.cloudinary.com/...) bị ghi đè nhầm
        // thành "http://localhost:xxxx/image/upload/..." - làm vỡ hiển thị ảnh. Đã loại bỏ
        // hoàn toàn nhánh xử lý đó.
        private void NormalizeLegacyLocalImageUrls(IEnumerable<SANPHAM> items)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host.Value}";
            foreach (var item in items)
            {
                if (string.IsNullOrEmpty(item.HinhAnh))
                    continue;

                if (item.HinhAnh.StartsWith("/images/"))
                {
                    item.HinhAnh = baseUrl + item.HinhAnh;
                }
                else if (item.HinhAnh.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                      || item.HinhAnh.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                      || item.HinhAnh.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                {
                    // URL tuyệt đối hợp lệ (Cloudinary hoặc domain khác) hoặc Base64 -> giữ nguyên.
                }
                else
                {
                    // Không xác định được vị trí vật lý (vd tên file trần "sofa_03.jpg" từ dữ
                    // liệu mẫu cũ chưa migrate và cũng không còn file thật) -> trả null thay vì
                    // để browser tự đoán URL tương đối rồi báo lỗi 404.
                    item.HinhAnh = null;
                }
            }
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

            // Ảnh (nếu có) đã được Frontend upload lên Cloudinary từ trước qua
            // POST /upload-image, HinhAnh ở đây phải là Secure URL Cloudinary - lưu nguyên
            // văn, KHÔNG cắt gọt/biến đổi URL (khác với code cũ từng cắt về AbsolutePath).
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

                // Nếu SQL thất bại SAU khi ảnh đã được upload lên Cloudinary (từ bước
                // upload-image riêng trước đó), phải dọn dẹp ảnh mồ côi ngay để không phát
                // sinh asset "rác" không gắn với sản phẩm nào.
                if (!string.IsNullOrEmpty(request.SanPham.PublicId))
                {
                    bool cleaned = await _cloudinaryService.DeleteImageAsync(request.SanPham.PublicId);
                    if (!cleaned)
                    {
                        _logger.LogError("Tạo sản phẩm thất bại VÀ không dọn được ảnh mồ côi trên Cloudinary. PublicId={PublicId}", request.SanPham.PublicId);
                    }
                }

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
            // PHÂN QUYỀN THEO ROLE (giữ nguyên logic gốc):
            // - Quản trị Hệ thống: toàn quyền sửa mọi trường (kể cả GiaBan, TrangThai, Nhóm).
            // - NV Bán Hàng: CHỈ được cập nhật SoLuongTon, MoTa, HinhAnh. Không được đổi nhóm
            //   sản phẩm -> với NV Bán Hàng, Trường hợp 3/4 (đổi nhóm) sẽ không bao giờ xảy ra.
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

            bool nhomMoiTonTai = await _context.NHOMSANPHAM.AnyAsync(x => x.MaNhomSP == request.SanPham.MaNhomSP);
            if (!nhomMoiTonTai) return BadRequest(new { message = "Nhóm sản phẩm không tồn tại." });

            // =====================================================
            // XÁC ĐỊNH 1 TRONG 4 TRƯỜNG HỢP (theo yêu cầu bắt buộc)
            // =====================================================
            bool anhDaDoi = !string.Equals(product.HinhAnh, request.SanPham.HinhAnh, StringComparison.Ordinal);
            bool nhomDaDoi = !string.Equals(product.MaNhomSP, request.SanPham.MaNhomSP, StringComparison.Ordinal);

            string? oldPublicId = product.PublicId;
            string? oldHinhAnh = product.HinhAnh;
            string finalHinhAnh;
            string? finalPublicId;

            if (!anhDaDoi && !nhomDaDoi)
            {
                // ---------------------------------------------------
                // TRƯỜNG HỢP 1: CHỈ SỬA THÔNG TIN - không upload/không xoá Cloudinary.
                // ---------------------------------------------------
                finalHinhAnh = product.HinhAnh ?? string.Empty;
                finalPublicId = product.PublicId;
            }
            else if (anhDaDoi && !nhomDaDoi)
            {
                // ---------------------------------------------------
                // TRƯỜNG HỢP 2: ĐỔI ẢNH, KHÔNG ĐỔI NHÓM.
                // Ảnh mới ĐÃ được Frontend upload lên Cloudinary (vào đúng Folder hiện tại)
                // qua POST /upload-image trước khi gọi Update này.
                // ---------------------------------------------------
                if (string.IsNullOrWhiteSpace(request.SanPham.HinhAnh) || string.IsNullOrWhiteSpace(request.SanPham.PublicId))
                    return BadRequest(new { message = "Thiếu thông tin ảnh mới (HinhAnh/PublicId) sau khi upload." });

                finalHinhAnh = request.SanPham.HinhAnh;
                finalPublicId = request.SanPham.PublicId;
            }
            else if (!anhDaDoi && nhomDaDoi)
            {
                // ---------------------------------------------------
                // TRƯỜNG HỢP 3: ĐỔI NHÓM, KHÔNG ĐỔI ẢNH.
                // Dùng Move/Rename của Cloudinary, KHÔNG tải ảnh về/upload lại.
                // ---------------------------------------------------
                var newGroup = await _context.NHOMSANPHAM.AsNoTracking().FirstOrDefaultAsync(x => x.MaNhomSP == request.SanPham.MaNhomSP);
                string newFolderName = ResolveFolderName(newGroup!);

                if (string.IsNullOrWhiteSpace(product.PublicId))
                {
                    // Sản phẩm chưa từng có ảnh trên Cloudinary (ảnh cũ local hoặc không có ảnh)
                    // -> không có gì để Move/Rename, chỉ đổi nhóm, giữ nguyên HinhAnh hiện tại.
                    finalHinhAnh = product.HinhAnh ?? string.Empty;
                    finalPublicId = product.PublicId;
                }
                else
                {
                    var moveResult = await _cloudinaryService.MoveImageAsync(product.PublicId, newFolderName);
                    if (moveResult == null)
                    {
                        // Move/Rename thất bại -> KHÔNG cập nhật SQL, giữ nguyên nhóm cũ.
                        return StatusCode(502, new { message = "Di chuyển ảnh sang thư mục nhóm sản phẩm mới trên Cloudinary thất bại. Nhóm sản phẩm KHÔNG được thay đổi." });
                    }
                    finalHinhAnh = moveResult.SecureUrl;
                    finalPublicId = moveResult.PublicId;
                }
            }
            else
            {
                // ---------------------------------------------------
                // TRƯỜNG HỢP 4: ĐỔI NHÓM + ĐỔI ẢNH.
                // Ảnh mới ĐÃ được Frontend upload thẳng vào Folder của NHÓM MỚI (Frontend biết
                // nhóm mới được chọn ngay khi gọi /upload-image).
                // ---------------------------------------------------
                if (string.IsNullOrWhiteSpace(request.SanPham.HinhAnh) || string.IsNullOrWhiteSpace(request.SanPham.PublicId))
                    return BadRequest(new { message = "Thiếu thông tin ảnh mới (HinhAnh/PublicId) sau khi upload." });

                finalHinhAnh = request.SanPham.HinhAnh;
                finalPublicId = request.SanPham.PublicId;
            }

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
                product.HinhAnh = finalHinhAnh;
                product.PublicId = finalPublicId;
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

                // SQL đã thành công -> chỉ BÂY GIỜ mới xoá ảnh CŨ (Trường hợp 2 và 4).
                // Trường hợp 3 không cần xoá gì (đã Move, không tạo ảnh mới).
                if ((anhDaDoi) && !string.IsNullOrEmpty(oldPublicId) && oldPublicId != finalPublicId)
                {
                    bool deleted = await _cloudinaryService.DeleteImageAsync(oldPublicId);
                    if (!deleted)
                    {
                        _logger.LogError("Cập nhật sản phẩm thành công nhưng KHÔNG xoá được ảnh cũ trên Cloudinary. MaSP={MaSP}, OldPublicId={OldPublicId}", id, oldPublicId);
                    }
                }

                return Ok(new { message = "Cập nhật sản phẩm thành công." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                // SQL thất bại SAU khi ảnh mới đã được upload/move -> dọn dẹp để tránh ảnh mồ côi,
                // đồng thời cố gắng khôi phục lại trạng thái ảnh/nhóm CŨ.
                if (anhDaDoi && !string.IsNullOrEmpty(finalPublicId) && finalPublicId != oldPublicId)
                {
                    // Trường hợp 2/4: ảnh mới đã được upload rời (endpoint upload-image), xoá nó đi.
                    var cleaned = await _cloudinaryService.DeleteImageAsync(finalPublicId);
                    if (!cleaned)
                    {
                        _logger.LogError("Cập nhật sản phẩm thất bại VÀ không dọn được ảnh mới trên Cloudinary. MaSP={MaSP}, NewPublicId={NewPublicId}", id, finalPublicId);
                    }
                }
                else if (!anhDaDoi && nhomDaDoi && !string.IsNullOrEmpty(finalPublicId) && finalPublicId != oldPublicId)
                {
                    // Trường hợp 3: đã Move ảnh sang thư mục mới, SQL lỗi -> cố gắng move ngược lại
                    // thư mục cũ để không làm "lạc" ảnh khỏi vị trí mà HinhAnh cũ (oldHinhAnh) đang trỏ tới.
                    var revert = await _cloudinaryService.MoveImageAsync(finalPublicId, ExtractFolderFromPublicId(oldPublicId));
                    if (revert == null)
                    {
                        _logger.LogError("Cập nhật sản phẩm thất bại VÀ không khôi phục được vị trí ảnh cũ trên Cloudinary sau khi Move. MaSP={MaSP}, PublicId={PublicId}", id, finalPublicId);
                    }
                }

                return BadRequest(new { message = "Cập nhật sản phẩm thất bại.", error = ex.Message });
            }
        }

        // Trích phần Folder (giữa RootFolder và tên file cuối) từ 1 PublicId đầy đủ, dùng để
        // khôi phục ảnh về đúng thư mục cũ khi cần rollback thao tác Move.
        private static string ExtractFolderFromPublicId(string? publicId)
        {
            if (string.IsNullOrWhiteSpace(publicId)) return "Khac";
            var parts = publicId.Split('/');
            // Định dạng chuẩn: Do_Noi_That/{FolderName}/{guid} -> lấy phần tử đứng trước cùng.
            return parts.Length >= 2 ? parts[^2] : "Khac";
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

            string? oldPublicId = product.PublicId;
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

                bool cloudinaryOk = true;
                if (!string.IsNullOrEmpty(oldPublicId))
                {
                    // Dùng PublicId lưu trong CSDL để xoá - KHÔNG suy đoán từ URL, đúng yêu cầu.
                    cloudinaryOk = await _cloudinaryService.DeleteImageAsync(oldPublicId);
                    if (!cloudinaryOk)
                    {
                        _logger.LogError("Xoá sản phẩm khỏi SQL thành công nhưng xoá ảnh Cloudinary thất bại. MaSP={MaSP}, PublicId={PublicId}", id, oldPublicId);
                    }
                }

                return Ok(new
                {
                    message = cloudinaryOk
                        ? "Xóa sản phẩm và dọn dẹp ảnh thành công."
                        : "Xóa sản phẩm thành công, nhưng xoá ảnh trên Cloudinary thất bại (đã ghi log để xử lý/dọn dẹp sau).",
                    cloudinaryCleanupSuccess = cloudinaryOk
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Xóa sản phẩm thất bại.", error = ex.Message });
            }
        }

        // =====================================================
        // POST: api/san-pham/migrate-legacy-images-to-cloudinary
        // =====================================================
        // Endpoint MỘT LẦN (one-time) để migrate toàn bộ ảnh sản phẩm cũ đang lưu vật lý
        // trong wwwroot/images lên Cloudinary. Idempotent: chạy lại nhiều lần vẫn an toàn,
        // tự bỏ qua các sản phẩm đã có ảnh Cloudinary (HinhAnh bắt đầu bằng https://res.cloudinary.com)
        // và các sản phẩm không tìm thấy file vật lý tương ứng (giữ nguyên, không báo lỗi).
        //
        // KHÔNG tự xoá file vật lý gốc trong wwwroot/images sau khi migrate xong - để an toàn,
        // việc dọn dẹp thư mục wwwroot/images do người vận hành thực hiện thủ công sau khi đã
        // xác nhận toàn bộ ảnh hiển thị đúng trên Cloudinary.
        [HttpPost("migrate-legacy-images-to-cloudinary")]
        [Authorize(Roles = "Quản trị Hệ thống")]
        public async Task<IActionResult> MigrateLegacyImagesToCloudinary([FromServices] IWebHostEnvironment env)
        {
            string webRootPath = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            string imagesFolder = Path.Combine(webRootPath, "images");

            var products = await _context.SANPHAM
                .Include(x => x.NhomSanPham)
                .Where(x => x.HinhAnh != null && x.HinhAnh != "")
                .ToListAsync();

            var migrated = new List<string>();
            var skippedAlready = new List<string>();
            var skippedNoFile = new List<string>();
            var errors = new List<object>();

            foreach (var product in products)
            {
                string hinhAnh = product.HinhAnh!;

                if (hinhAnh.StartsWith("https://res.cloudinary.com", StringComparison.OrdinalIgnoreCase))
                {
                    skippedAlready.Add(product.MaSP);
                    continue;
                }

                if (hinhAnh.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                {
                    // Dữ liệu Base64 cũ không thuộc phạm vi migrate vật lý -> bỏ qua, chỉ báo cáo.
                    skippedNoFile.Add(product.MaSP);
                    continue;
                }

                // Chuẩn hoá về tên file vật lý: hỗ trợ cả "/images/xxx.ext" và tên file trần
                // "xxx.jpg" (kiểu dữ liệu mẫu cũ trong SqlCNPM.sql).
                string fileName = hinhAnh.StartsWith("/images/")
                    ? hinhAnh.Substring("/images/".Length)
                    : hinhAnh.TrimStart('/');

                string physicalPath = Path.Combine(imagesFolder, fileName);

                if (!System.IO.File.Exists(physicalPath))
                {
                    skippedNoFile.Add(product.MaSP);
                    continue;
                }

                try
                {
                    string folderName = product.NhomSanPham != null
                        ? ResolveFolderName(product.NhomSanPham)
                        : "Khac";

                    await using var fs = System.IO.File.OpenRead(physicalPath);
                    var uploadResult = await _cloudinaryService.UploadProductImageAsync(fs, fileName, folderName);

                    product.HinhAnh = uploadResult.SecureUrl;
                    product.PublicId = uploadResult.PublicId;
                    migrated.Add(product.MaSP);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Migrate ảnh lên Cloudinary thất bại cho sản phẩm {MaSP}", product.MaSP);
                    errors.Add(new { maSP = product.MaSP, error = ex.Message });
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Hoàn tất migrate ảnh sản phẩm cũ lên Cloudinary.",
                tongSoSanPhamQuet = products.Count,
                daMigrate = migrated,
                daBoQuaVi_DaLaCloudinary = skippedAlready,
                daBoQuaVi_KhongTimThayFileVatLy = skippedNoFile,
                loi = errors
            });
        }

        public class SanPhamRequest
        {
            public SANPHAM SanPham { get; set; } = new SANPHAM();
            public List<string> MaVatLieus { get; set; } = new();
            public List<string> MaNhaCungCaps { get; set; } = new();
        }
    }
}