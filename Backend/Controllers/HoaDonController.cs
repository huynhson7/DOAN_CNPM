using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers
{
    public class ChiTietSanPhamRequest
    {
        public string MaSP { get; set; } = string.Empty;
        public int SoLuongBan { get; set; }
        public string? MoTa { get; set; }
    }

    public class TaoHoaDonRequest
    {
        public string MaKhachHang { get; set; } = string.Empty;
        public string MaNV { get; set; } = string.Empty;
        public List<ChiTietSanPhamRequest> ChiTietSanPham { get; set; } = new();
        public string? TrangThaiGiaoHang { get; set; }
    }

    public static class TrangThaiHoaDon
    {
        public const string ChoThanhToan = "Chờ thanh toán";
        public const string DangXuLy = "Đang xử lý";
        public const string DaGiaoHang = "Đã giao hàng";
        public const string DaHuy = "Đã hủy";

        public static readonly HashSet<string> HopLe = new()
        {
            ChoThanhToan, DangXuLy, DaGiaoHang, DaHuy
        };
    }

    [Route("api/hoa-don")]
    [ApiController]
    [Authorize] // Bắt buộc phải có Token JWT để gọi các API này
    public class HoaDonController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HoaDonController(AppDbContext context)
        {
            _context = context;
        }

        // Hàm hỗ trợ lấy thông tin User đang đăng nhập từ Token
        private (string Role, string UserId) GetCurrentUser()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst("UserId")?.Value ?? "";
            return (role, userId);
        }

        // =====================================================
        // GET: api/hoa-don -> Danh sách hóa đơn 
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var (role, userId) = GetCurrentUser();
            bool isAdmin = role.Contains("Admin", StringComparison.OrdinalIgnoreCase) || 
                           role.Contains("Quản trị", StringComparison.OrdinalIgnoreCase);

            var query = _context.HOADON
                .AsNoTracking()
                .Include(hd => hd.KhachHang)
                .Include(hd => hd.NhanVien)
                .Include(hd => hd.ChiTietHoaDons)
                .AsQueryable();

            // LỌC DỮ LIỆU DỰA TRÊN QUYỀN
            if (!isAdmin)
            {
                // Nếu là nhân viên, chỉ lấy hóa đơn của chính họ HOẶC hóa đơn online (NV01)
                query = query.Where(hd => hd.MaNV == userId || hd.MaNV == "NV01");
            }
            // Nếu là Admin thì query giữ nguyên, không filter -> Thấy toàn bộ

            var list = await query
                .OrderByDescending(hd => hd.NgayLapHD)
                .Select(hd => new
                {
                    hd.MaHD,
                    hd.NgayLapHD,
                    hd.NgayGiaoHang,
                    hd.TrangThaiGiaoHang,
                    MaKhachHang = hd.MaKhachHang,
                    TenKhachHang = hd.KhachHang != null ? hd.KhachHang.TenKhachHang : null,
                    MaNV = hd.MaNV,
                    TenNV = hd.NhanVien != null ? hd.NhanVien.TenNV : null,
                    TongTien = hd.ChiTietHoaDons.Sum(ct => (decimal?)ct.ThanhTien) ?? 0
                })
                .ToListAsync();

            return Ok(list);
        }
        

        // =====================================================
        // GET: api/hoa-don/{id} -> Chi tiết 1 hóa đơn
        // =====================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var hd = await _context.HOADON
                .AsNoTracking()
                .Include(x => x.KhachHang)
                .Include(x => x.NhanVien)
                .Include(x => x.ChiTietHoaDons)
                    .ThenInclude(ct => ct.SanPham)
                .FirstOrDefaultAsync(x => x.MaHD == id);

            if (hd == null)
                return NotFound(new { message = "Không tìm thấy hóa đơn." });

            var result = new
            {
                hd.MaHD,
                hd.NgayLapHD,
                hd.NgayGiaoHang,
                hd.TrangThaiGiaoHang,
                KhachHang = hd.KhachHang == null ? null : new
                {
                    hd.KhachHang.MaKhachHang,
                    hd.KhachHang.TenKhachHang,
                    hd.KhachHang.SDTKhachHang,
                    hd.KhachHang.DiaChiKhachHang
                },
                NhanVien = hd.NhanVien == null ? null : new
                {
                    hd.NhanVien.MaNV,
                    hd.NhanVien.TenNV
                },
                ChiTiet = hd.ChiTietHoaDons.Select(ct => new
                {
                    ct.MaChiTietHD,
                    ct.MaSP,
                    TenSP = ct.SanPham != null ? ct.SanPham.TenSP : null,
                    ct.SoLuongBan,
                    ct.DonGiaBan,
                    ct.MoTa,
                    ct.ThanhTien
                }),
                TongTien = hd.ChiTietHoaDons.Sum(ct => ct.ThanhTien ?? 0)
            };

            return Ok(result);
        }

        // =====================================================
        // POST: api/hoa-don -> Lập hóa đơn mới
        // =====================================================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaoHoaDonRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.MaKhachHang))
                return BadRequest(new { message = "Vui lòng chọn khách hàng." });

            if (request.ChiTietSanPham == null || request.ChiTietSanPham.Count == 0)
                return BadRequest(new { message = "Hóa đơn phải có ít nhất 1 sản phẩm." });

            bool khachHangTonTai = await _context.KHACHHANG.AnyAsync(x => x.MaKhachHang == request.MaKhachHang);
            if (!khachHangTonTai)
                return BadRequest(new { message = "Khách hàng không tồn tại." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var maHDList = await _context.HOADON.Select(x => x.MaHD).ToListAsync();
                int maxSo = maHDList
                    .Select(ma => int.TryParse(ma.Replace("HD", ""), out int so) ? so : 0)
                    .DefaultIfEmpty(0)
                    .Max();
                string maHDMoi = $"HD{(maxSo + 1):000}";

                // Lấy mã nhân viên từ request do Frontend gửi lên
                string maNhanVienPhuTrach = request.MaNV;
                if (string.IsNullOrWhiteSpace(maNhanVienPhuTrach))
                {
                    maNhanVienPhuTrach = "NV01"; // Mặc định nếu trống (Đơn Online)
                }

                var hoaDonMoi = new HOADON
                {
                    MaHD = maHDMoi,
                    MaNV = maNhanVienPhuTrach,
                    MaKhachHang = request.MaKhachHang,
                    NgayLapHD = DateTime.Now,
                    NgayGiaoHang = null,
                    TrangThaiGiaoHang = TrangThaiHoaDon.ChoThanhToan
                };
                _context.HOADON.Add(hoaDonMoi);

                int stt = 1;
                foreach (var item in request.ChiTietSanPham)
                {
                    var sanPham = await _context.SANPHAM.FirstOrDefaultAsync(x => x.MaSP == item.MaSP);
                    if (sanPham == null)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = $"Sản phẩm {item.MaSP} không tồn tại." });
                    }

                    if (item.SoLuongBan <= 0)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = $"Số lượng sản phẩm {sanPham.TenSP} phải lớn hơn 0." });
                    }

                    if (sanPham.SoLuongTon.HasValue && sanPham.SoLuongTon.Value < item.SoLuongBan)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = $"Sản phẩm {sanPham.TenSP} không đủ tồn kho (còn {sanPham.SoLuongTon})." });
                    }

                    decimal donGia = sanPham.GiaBan ?? 0;
                    decimal thanhTien = donGia * item.SoLuongBan;

                    var chiTiet = new CHITIETHOADON
                    {
                        MaHD = maHDMoi,
                        MaChiTietHD = $"{maHDMoi}-{stt:00}",
                        MaSP = item.MaSP,
                        SoLuongBan = item.SoLuongBan,
                        DonGiaBan = donGia,
                        MoTa = item.MoTa,
                        ThanhTien = thanhTien
                    };
                    _context.CHITIETHOADON.Add(chiTiet);

                    // Trừ tồn kho
                    if (sanPham.SoLuongTon.HasValue)
                        sanPham.SoLuongTon -= item.SoLuongBan;

                    stt++;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetById), new { id = maHDMoi }, new
                {
                    message = "Lập hóa đơn thành công.",
                    maHD = maHDMoi
                });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Có lỗi xảy ra khi lập hóa đơn." });
            }
        }

        // =====================================================
        // PUT: api/hoa-don/{id} -> Sửa thông tin / Trạng thái hóa đơn
        // =====================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] TaoHoaDonRequest request)
        {
            var (role, userId) = GetCurrentUser();
            bool isAdmin = role.Contains("Admin", StringComparison.OrdinalIgnoreCase) || 
                           role.Contains("Quản trị", StringComparison.OrdinalIgnoreCase);

            var hoaDon = await _context.HOADON
                .Include(x => x.ChiTietHoaDons)
                .FirstOrDefaultAsync(x => x.MaHD == id);

            if (hoaDon == null)
                return NotFound(new { message = "Không tìm thấy hóa đơn." });

            // Quy tắc chung: Đã hủy hoặc Giao hàng thì ngưng tác động
            if (hoaDon.TrangThaiGiaoHang == TrangThaiHoaDon.DaHuy || hoaDon.TrangThaiGiaoHang == TrangThaiHoaDon.DaGiaoHang)
            {
                return BadRequest(new { message = "Hóa đơn đã chốt, không thể chỉnh sửa." });
            }

            // --- KIỂM SOÁT QUYỀN NHÂN VIÊN ---
            if (!isAdmin)
            {
                // BƯỚC 1: Xử lý nghiệp vụ "Nhận đơn Online"
                if (hoaDon.MaNV == "NV01" && !string.IsNullOrWhiteSpace(request.MaNV) && request.MaNV == userId)
                {
                    hoaDon.MaNV = userId; // Gán đơn hàng cho nhân viên đang thao tác
                    
                    // Tự động cập nhật trạng thái nếu đơn đang chờ thanh toán
                    if (hoaDon.TrangThaiGiaoHang == TrangThaiHoaDon.ChoThanhToan)
                    {
                        hoaDon.TrangThaiGiaoHang = TrangThaiHoaDon.DangXuLy;
                    }
                }
                // Chốt chặn bảo mật: Cấm sửa hóa đơn của người khác
                else if (hoaDon.MaNV != userId && hoaDon.MaNV != "NV01")
                {
                    return StatusCode(403, new { message = "Bạn không có quyền thao tác trên hóa đơn của người khác." });
                }

                // BƯỚC 2: Cập nhật Trạng thái giao hàng
                if (!string.IsNullOrWhiteSpace(request.TrangThaiGiaoHang) && TrangThaiHoaDon.HopLe.Contains(request.TrangThaiGiaoHang))
                {
                    hoaDon.TrangThaiGiaoHang = request.TrangThaiGiaoHang;
                    if (request.TrangThaiGiaoHang == TrangThaiHoaDon.DaGiaoHang)
                        hoaDon.NgayGiaoHang = DateTime.Now;
                }
                
                await _context.SaveChangesAsync();
                return Ok(new { message = "Cập nhật đơn hàng thành công.", maHD = id });
            }

            // --- QUYỀN ADMIN: ĐƯỢC CHỈNH SỬA TOÀN BỘ (KHÁCH HÀNG, SẢN PHẨM) ---
            if (string.IsNullOrWhiteSpace(request.MaKhachHang))
                return BadRequest(new { message = "Vui lòng chọn khách hàng." });

            bool khachHangTonTai = await _context.KHACHHANG.AnyAsync(x => x.MaKhachHang == request.MaKhachHang);
            if (!khachHangTonTai)
                return BadRequest(new { message = "Khách hàng không tồn tại." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Hoàn tồn kho cũ
                foreach (var ctCu in hoaDon.ChiTietHoaDons.ToList())
                {
                    var spCu = await _context.SANPHAM.FirstOrDefaultAsync(x => x.MaSP == ctCu.MaSP);
                    if (spCu != null && spCu.SoLuongTon.HasValue && ctCu.SoLuongBan.HasValue)
                        spCu.SoLuongTon += ctCu.SoLuongBan.Value;

                    _context.CHITIETHOADON.Remove(ctCu);
                }
                await _context.SaveChangesAsync();

                // Thêm chi tiết mới
                int stt = 1;
                foreach (var item in request.ChiTietSanPham)
                {
                    var sanPham = await _context.SANPHAM.FirstOrDefaultAsync(x => x.MaSP == item.MaSP);
                    if (sanPham == null)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = $"Sản phẩm {item.MaSP} không tồn tại." });
                    }
                    if (sanPham.SoLuongTon.HasValue && sanPham.SoLuongTon.Value < item.SoLuongBan)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = $"Sản phẩm {sanPham.TenSP} không đủ tồn kho." });
                    }

                    decimal donGia = sanPham.GiaBan ?? 0;
                    _context.CHITIETHOADON.Add(new CHITIETHOADON
                    {
                        MaHD = id,
                        MaChiTietHD = $"{id}-{stt:00}",
                        MaSP = item.MaSP,
                        SoLuongBan = item.SoLuongBan,
                        DonGiaBan = donGia,
                        MoTa = item.MoTa,
                        ThanhTien = donGia * item.SoLuongBan
                    });

                    if (sanPham.SoLuongTon.HasValue)
                        sanPham.SoLuongTon -= item.SoLuongBan;
                    stt++;
                }

                hoaDon.MaKhachHang = request.MaKhachHang;
                if (!string.IsNullOrWhiteSpace(request.MaNV))
                    hoaDon.MaNV = request.MaNV;

                if (!string.IsNullOrWhiteSpace(request.TrangThaiGiaoHang) && TrangThaiHoaDon.HopLe.Contains(request.TrangThaiGiaoHang))
                {
                    hoaDon.TrangThaiGiaoHang = request.TrangThaiGiaoHang;
                    if (request.TrangThaiGiaoHang == TrangThaiHoaDon.DaGiaoHang)
                        hoaDon.NgayGiaoHang = DateTime.Now;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Cập nhật hóa đơn thành công.", maHD = id });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Có lỗi xảy ra khi cập nhật hóa đơn." });
            }
        }

        // =====================================================
        // PUT: api/hoa-don/huy/{id} -> HỦY HÓA ĐƠN (SOFT DELETE)
        // =====================================================
        [HttpPut("huy/{id}")]
        public async Task<IActionResult> HuyHoaDon(string id)
        {
            var (role, userId) = GetCurrentUser();
            bool isAdmin = role.Contains("Admin", StringComparison.OrdinalIgnoreCase) || 
                           role.Contains("Quản trị", StringComparison.OrdinalIgnoreCase);

            // Chỉ Admin mới có quyền thao tác API này
            if (!isAdmin)
                return StatusCode(403, new { message = "Chỉ Quản trị viên mới có quyền hủy hóa đơn." });

            var hoaDon = await _context.HOADON
                .Include(x => x.ChiTietHoaDons)
                .FirstOrDefaultAsync(x => x.MaHD == id);

            if (hoaDon == null)
                return NotFound(new { message = "Không tìm thấy hóa đơn." });

            if (hoaDon.TrangThaiGiaoHang == TrangThaiHoaDon.DaHuy)
                return BadRequest(new { message = "Hóa đơn này đã được hủy trước đó." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Hoàn lại số lượng tồn kho cho các sản phẩm trong hóa đơn
                foreach (var ct in hoaDon.ChiTietHoaDons)
                {
                    var sp = await _context.SANPHAM.FirstOrDefaultAsync(x => x.MaSP == ct.MaSP);
                    if (sp != null && sp.SoLuongTon.HasValue && ct.SoLuongBan.HasValue)
                    {
                        sp.SoLuongTon += ct.SoLuongBan.Value;
                    }
                }

                // Chuyển trạng thái sang Đã Hủy thay vì xóa cứng
                hoaDon.TrangThaiGiaoHang = TrangThaiHoaDon.DaHuy;
                hoaDon.NgayGiaoHang = null; 

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Hủy hóa đơn thành công, đã hoàn lại tồn kho." });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Có lỗi xảy ra khi hủy hóa đơn." });
            }
        }
    }
}