using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    // Dữ liệu 1 dòng sản phẩm được chọn khi lập hóa đơn
    public class ChiTietSanPhamRequest
    {
        public string MaSP { get; set; } = string.Empty;
        public int SoLuongBan { get; set; }
        public decimal GiamGia { get; set; } = 0;
    }

    // Dữ liệu gửi lên khi Nhân viên tạo Hóa Đơn mới
    public class TaoHoaDonRequest
    {
        public string MaKhachHang { get; set; } = string.Empty;
        public string MaNV { get; set; } = string.Empty;
        public List<ChiTietSanPhamRequest> ChiTietSanPham { get; set; } = new();

        // Chỉ dùng khi SỬA hóa đơn (đổi trạng thái giao hàng).
        // Bỏ trống khi TẠO MỚI vì hóa đơn mới luôn khởi tạo "Chờ thanh toán".
        public string? TrangThaiGiaoHang { get; set; }
    }

    // Danh sách trạng thái hợp lệ mà Nhân viên/Quản trị có thể chọn khi sửa hóa đơn
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
    public class HoaDonController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HoaDonController(AppDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // GET: api/hoa-don  -> Danh sách hóa đơn (kèm tổng tiền)
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _context.HOADON
                .AsNoTracking()
                .Include(hd => hd.KhachHang)
                .Include(hd => hd.NhanVien)
                .Include(hd => hd.ChiTietHoaDons)
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
        // GET: api/hoa-don/HD001 -> Chi tiết 1 hóa đơn để xem/in
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
            {
                return NotFound(new { message = "Không tìm thấy hóa đơn." });
            }

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
                    ct.GiamGia,
                    ct.ThanhTien
                }),
                TongTien = hd.ChiTietHoaDons.Sum(ct => ct.ThanhTien ?? 0)
            };

            return Ok(result);
        }

        // =====================================================
        // POST: api/hoa-don -> Lập hóa đơn mới (chọn KH + thêm SP)
        // =====================================================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaoHoaDonRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.MaKhachHang))
                return BadRequest(new { message = "Vui lòng chọn khách hàng." });

            if (string.IsNullOrWhiteSpace(request.MaNV))
                return BadRequest(new { message = "Thiếu mã nhân viên lập hóa đơn." });

            if (request.ChiTietSanPham == null || request.ChiTietSanPham.Count == 0)
                return BadRequest(new { message = "Hóa đơn phải có ít nhất 1 sản phẩm." });

            bool khachHangTonTai = await _context.KHACHHANG.AnyAsync(x => x.MaKhachHang == request.MaKhachHang);
            if (!khachHangTonTai)
                return BadRequest(new { message = "Khách hàng không tồn tại." });

            bool nhanVienTonTai = await _context.NHANVIEN.AnyAsync(x => x.MaNV == request.MaNV);
            if (!nhanVienTonTai)
                return BadRequest(new { message = "Nhân viên lập hóa đơn không tồn tại." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // ---- Sinh mã hóa đơn mới dạng HD001, HD002... ----
                var maHDList = await _context.HOADON.Select(x => x.MaHD).ToListAsync();
                int maxSo = maHDList
                    .Select(ma => int.TryParse(ma.Replace("HD", ""), out int so) ? so : 0)
                    .DefaultIfEmpty(0)
                    .Max();
                string maHDMoi = $"HD{(maxSo + 1):000}";

                var hoaDonMoi = new HOADON
                {
                    MaHD = maHDMoi,
                    MaNV = request.MaNV,
                    MaKhachHang = request.MaKhachHang,
                    NgayLapHD = DateTime.Now,
                    NgayGiaoHang = null,
                    TrangThaiGiaoHang = "Chờ thanh toán"
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
                    decimal giamGia = item.GiamGia;
                    decimal thanhTien = (donGia * item.SoLuongBan) - giamGia;

                    var chiTiet = new CHITIETHOADON
                    {
                        MaHD = maHDMoi,
                        MaChiTietHD = $"{maHDMoi}-{stt:00}",
                        MaSP = item.MaSP,
                        SoLuongBan = item.SoLuongBan,
                        DonGiaBan = donGia,
                        GiamGia = giamGia,
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
        // PUT: api/hoa-don/HD001 -> Sửa hóa đơn (đổi KH, đổi danh sách SP)
        // =====================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] TaoHoaDonRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.MaKhachHang))
                return BadRequest(new { message = "Vui lòng chọn khách hàng." });

            if (request.ChiTietSanPham == null || request.ChiTietSanPham.Count == 0)
                return BadRequest(new { message = "Hóa đơn phải có ít nhất 1 sản phẩm." });

            var hoaDon = await _context.HOADON
                .Include(x => x.ChiTietHoaDons)
                .FirstOrDefaultAsync(x => x.MaHD == id);

            if (hoaDon == null)
                return NotFound(new { message = "Không tìm thấy hóa đơn." });

            if (hoaDon.TrangThaiGiaoHang == "Đã hủy" || hoaDon.TrangThaiGiaoHang == "Đã giao hàng")
                return BadRequest(new { message = "Hóa đơn đã hủy hoặc đã giao hàng, không thể chỉnh sửa." });

            bool khachHangTonTai = await _context.KHACHHANG.AnyAsync(x => x.MaKhachHang == request.MaKhachHang);
            if (!khachHangTonTai)
                return BadRequest(new { message = "Khách hàng không tồn tại." });

            // Nếu người dùng có đổi nhân viên thì kiểm tra nhân viên đó có tồn tại không
            if (!string.IsNullOrWhiteSpace(request.MaNV))
            {
                bool nhanVienTonTaiKhiSua = await _context.NHANVIEN.AnyAsync(x => x.MaNV == request.MaNV);
                if (!nhanVienTonTaiKhiSua)
                    return BadRequest(new { message = "Nhân viên không tồn tại." });
            }

            // Nếu người dùng có chọn trạng thái mới thì kiểm tra hợp lệ trước khi lưu
            if (!string.IsNullOrWhiteSpace(request.TrangThaiGiaoHang) &&
                !TrangThaiHoaDon.HopLe.Contains(request.TrangThaiGiaoHang))
            {
                return BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Hoàn lại tồn kho của các sản phẩm cũ trước khi ghi đè bằng danh sách mới
                foreach (var ctCu in hoaDon.ChiTietHoaDons.ToList())
                {
                    var spCu = await _context.SANPHAM.FirstOrDefaultAsync(x => x.MaSP == ctCu.MaSP);
                    if (spCu != null && spCu.SoLuongTon.HasValue && ctCu.SoLuongBan.HasValue)
                        spCu.SoLuongTon += ctCu.SoLuongBan.Value;

                    _context.CHITIETHOADON.Remove(ctCu);
                }

                // Lưu bước xóa chi tiết cũ trước để tránh trùng khóa chính khi thêm chi tiết mới
                await _context.SaveChangesAsync();

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
                    decimal giamGia = item.GiamGia;
                    decimal thanhTien = (donGia * item.SoLuongBan) - giamGia;

                    _context.CHITIETHOADON.Add(new CHITIETHOADON
                    {
                        MaHD = id,
                        MaChiTietHD = $"{id}-{stt:00}",
                        MaSP = item.MaSP,
                        SoLuongBan = item.SoLuongBan,
                        DonGiaBan = donGia,
                        GiamGia = giamGia,
                        ThanhTien = thanhTien
                    });

                    if (sanPham.SoLuongTon.HasValue)
                        sanPham.SoLuongTon -= item.SoLuongBan;

                    stt++;
                }

                hoaDon.MaKhachHang = request.MaKhachHang;

                // Cho phép đổi nhân viên phụ trách hóa đơn nếu người dùng có chọn
                if (!string.IsNullOrWhiteSpace(request.MaNV))
                    hoaDon.MaNV = request.MaNV;

                // Cập nhật trạng thái đơn hàng nếu người dùng có chọn (bỏ trống thì giữ nguyên)
                if (!string.IsNullOrWhiteSpace(request.TrangThaiGiaoHang))
                {
                    hoaDon.TrangThaiGiaoHang = request.TrangThaiGiaoHang;

                    // Tự động gán ngày giao hàng khi chuyển sang trạng thái Đã giao hàng
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
        // DELETE: api/hoa-don/HD001 -> Xóa hẳn hóa đơn + hoàn tồn kho
        // =====================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var hoaDon = await _context.HOADON
                .Include(x => x.ChiTietHoaDons)
                .FirstOrDefaultAsync(x => x.MaHD == id);

            if (hoaDon == null)
                return NotFound(new { message = "Không tìm thấy hóa đơn." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var ct in hoaDon.ChiTietHoaDons)
                {
                    var sp = await _context.SANPHAM.FirstOrDefaultAsync(x => x.MaSP == ct.MaSP);
                    if (sp != null && sp.SoLuongTon.HasValue && ct.SoLuongBan.HasValue)
                        sp.SoLuongTon += ct.SoLuongBan.Value;
                }

                _context.CHITIETHOADON.RemoveRange(hoaDon.ChiTietHoaDons);
                _context.HOADON.Remove(hoaDon);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Đã xóa hóa đơn và hoàn lại tồn kho." });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Có lỗi xảy ra khi xóa hóa đơn." });
            }
        }
    }
}
