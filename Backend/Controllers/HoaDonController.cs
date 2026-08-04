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
            // Khách hàng: chỉ được xem lịch sử đơn hàng (hóa đơn) CỦA CHÍNH MÌNH,
            // dùng cho trang "Lịch Sử Đơn Hàng" phía Frontend (lichsudonhang.html)
            bool isKhachHang = role.Contains("Khách hàng", StringComparison.OrdinalIgnoreCase);

            var query = _context.HOADON
                .AsNoTracking()
                .Include(hd => hd.KhachHang)
                .Include(hd => hd.NhanVien)
                .Include(hd => hd.ChiTietHoaDons)
                .AsQueryable();

            // LỌC DỮ LIỆU DỰA TRÊN QUYỀN
            if (!isAdmin)
            {
                if (isKhachHang)
                {
                    // Khách hàng chỉ thấy hóa đơn mà họ chính là chủ đơn (MaKhachHang == chính họ)
                    query = query.Where(hd => hd.MaKhachHang == userId);
                }
                else
                {
                    // Nếu là nhân viên, chỉ lấy hóa đơn của chính họ HOẶC hóa đơn online (NV01)
                    query = query.Where(hd => hd.MaNV == userId || hd.MaNV == "NV01");
                }
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
        // GET: api/hoa-don/san-pham-ban-chay -> Top sản phẩm bán chạy nhất
        // (Tổng hợp SoLuongBan từ CHITIETHOADON của mọi hóa đơn CHƯA bị hủy,
        // dùng cho mục "Sản Phẩm Bán Chạy" ở trang Bảng Điều Khiển)
        // =====================================================
        [HttpGet("san-pham-ban-chay")]
        [Authorize(Roles = "Quản trị Hệ thống,NV Bán Hàng")]
        public async Task<IActionResult> GetSanPhamBanChay(int top = 5)
        {
            var thongKe = await _context.CHITIETHOADON
                .AsNoTracking()
                .Where(ct => ct.HoaDon != null && ct.HoaDon.TrangThaiGiaoHang != TrangThaiHoaDon.DaHuy)
                .GroupBy(ct => ct.MaSP)
                .Select(g => new
                {
                    MaSP = g.Key,
                    SoLuongDaBan = g.Sum(x => x.SoLuongBan ?? 0)
                })
                .OrderByDescending(x => x.SoLuongDaBan)
                .Take(top)
                .ToListAsync();

            var maSPs = thongKe.Select(x => x.MaSP).ToList();
            var tenSPs = await _context.SANPHAM
                .AsNoTracking()
                .Where(sp => maSPs.Contains(sp.MaSP))
                .ToDictionaryAsync(sp => sp.MaSP, sp => sp.TenSP);

            var ketQua = thongKe.Select(x => new
            {
                x.MaSP,
                TenSP = tenSPs.TryGetValue(x.MaSP, out var ten) ? ten : x.MaSP,
                x.SoLuongDaBan
            });

            return Ok(ketQua);
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

            // Nhân viên (không phải Admin) chỉ được xem hóa đơn do chính mình đã
            // nhận/lập, hoặc hóa đơn online đang chờ trong "kho chung" (NV01).
            // Hóa đơn đã có nhân viên khác nhận thì không được xem.
            // Khách hàng (không phải Admin) chỉ được xem hóa đơn của CHÍNH MÌNH -
            // dùng để xem trạng thái đơn hàng của mình trong trang Lịch Sử Đơn Hàng.
            var (role, userId) = GetCurrentUser();
            bool isAdmin = role.Contains("Admin", StringComparison.OrdinalIgnoreCase) ||
                           role.Contains("Quản trị", StringComparison.OrdinalIgnoreCase);
            bool isKhachHang = role.Contains("Khách hàng", StringComparison.OrdinalIgnoreCase);

            if (!isAdmin)
            {
                if (isKhachHang)
                {
                    if (hd.MaKhachHang != userId)
                        return StatusCode(403, new { message = "Bạn không có quyền xem hóa đơn của người khác." });
                }
                else if (hd.MaNV != userId && hd.MaNV != "NV01")
                {
                    return StatusCode(403, new { message = "Bạn không có quyền xem hóa đơn của người khác." });
                }
            }

            // Địa chỉ hiển thị trên hóa đơn: ƯU TIÊN địa chỉ giao hàng THỰC TẾ của
            // chính đơn hàng này (được nhập ở trang thanh toán - thanhtoan.html -
            // và lưu kèm trong trường MoTa của mỗi dòng chi tiết hóa đơn, xem
            // hàm buildGhiChuGiaoHang() bên Frontend), vì đây mới là địa chỉ giao
            // hàng đúng cho đơn này. Nếu đơn không có ghi chú giao hàng (VD: hóa
            // đơn do Nhân viên/Admin lập tại quầy) thì lấy tạm địa chỉ hồ sơ
            // (DiaChiKhachHang) của khách hàng làm phương án dự phòng.
            string? diaChiHienThi = TrichDiaChiGiaoHangTuMoTa(hd.ChiTietHoaDons)
                ?? hd.KhachHang?.DiaChiKhachHang;

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
                    DiaChiKhachHang = diaChiHienThi
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
        // Hàm hỗ trợ: trích chuỗi "Địa chỉ giao hàng: ..." đã được Frontend
        // (thanhtoan.js -> buildGhiChuGiaoHang) đính kèm vào đầu trường MoTa
        // của dòng chi tiết hóa đơn, dạng:
        // "Người nhận: X | SĐT: Y | Địa chỉ giao hàng: Z | Ghi chú: W"
        // Trả về null nếu không tìm thấy (hóa đơn không có ghi chú giao hàng).
        // =====================================================
        private static string? TrichDiaChiGiaoHangTuMoTa(IEnumerable<CHITIETHOADON> chiTietHoaDons)
        {
            const string nhan = "Địa chỉ giao hàng:";

            var moTaCoDiaChi = chiTietHoaDons
                .Select(ct => ct.MoTa)
                .FirstOrDefault(mt => !string.IsNullOrWhiteSpace(mt) && mt.Contains(nhan));

            if (moTaCoDiaChi == null)
                return null;

            int viTriBatDau = moTaCoDiaChi.IndexOf(nhan, StringComparison.OrdinalIgnoreCase) + nhan.Length;
            string phanConLai = moTaCoDiaChi.Substring(viTriBatDau);

            // Địa chỉ kết thúc trước dấu " | " tiếp theo (nếu có "Ghi chú" theo sau), hoặc hết chuỗi
            int viTriKetThuc = phanConLai.IndexOf('|');
            string diaChi = (viTriKetThuc >= 0 ? phanConLai.Substring(0, viTriKetThuc) : phanConLai).Trim();

            return string.IsNullOrWhiteSpace(diaChi) ? null : diaChi;
        }

        // =====================================================
        // POST: api/hoa-don -> Lập hóa đơn mới
        // =====================================================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaoHoaDonRequest request)
        {
            // [SỬA] Nếu người gọi là Khách hàng: ép MaKhachHang = chính họ (không tin Client
            // gửi lên - tránh việc 1 khách hàng đặt hàng "giùm" người khác), đồng thời bỏ qua
            // MaNV Client gửi (đơn khách tự đặt luôn coi là "đơn online" -> mặc định NV01).
            //
            // [SỬA - FIX BUG] Nếu người gọi là NHÂN VIÊN (không phải Admin) lập hóa đơn trực
            // tiếp tại quầy: LUÔN tự động ép MaNV = chính nhân viên đang đăng nhập (không tin/
            // không dùng MaNV do Client gửi lên). Trước đây nếu Nhân viên để trống (hoặc field
            // bị gửi rỗng) ô "Chọn Nhân Viên" trên Form, Backend chỉ dựa vào việc MaNV có rỗng
            // hay không để coi đó là "đơn online" -> mặc định gán nhầm cho NV01 (Admin) thay vì
            // chính nhân viên vừa lập đơn. Chỉ đơn hàng do KHÁCH HÀNG tự đặt online (Role =
            // "Khách hàng") mới thật sự rơi vào nhánh "đơn online" -> mặc định NV01 bên dưới.
            var (currentRole, currentUserId) = GetCurrentUser();
            bool laKhachHangDangTao = currentRole.Contains("Khách hàng", StringComparison.OrdinalIgnoreCase);
            bool laNhanVienDangTao = currentRole.Contains("NV Bán Hàng", StringComparison.OrdinalIgnoreCase);

            if (laKhachHangDangTao)
            {
                request.MaKhachHang = currentUserId;
                request.MaNV = string.Empty;
            }
            else if (laNhanVienDangTao)
            {
                request.MaNV = currentUserId;
            }
            // Admin lập hóa đơn tại quầy: vẫn được tự chọn Nhân viên phụ trách qua request.MaNV
            // (Frontend bắt buộc Admin phải chọn 1 Nhân viên trước khi gửi).

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

                // Lấy mã nhân viên từ request do Frontend gửi lên.
                // Nếu Frontend không gửi (trường hợp KHÁCH HÀNG tự đặt hàng online
                // qua trang thanhtoan.html) thì mặc định gán cho NV01
                // (Phạm Huỳnh Thiên Sơn - Admin) để làm "hóa đơn dùng chung",
                // chờ nhân viên trực nào rảnh sẽ vào nhận xử lý.
                string maNhanVienPhuTrach = request.MaNV;
                bool laDonKhachTuDatOnline = string.IsNullOrWhiteSpace(maNhanVienPhuTrach);
                if (laDonKhachTuDatOnline)
                {
                    maNhanVienPhuTrach = "NV01"; // Mặc định nếu trống (Đơn Online)
                }

                // Đơn khách tự đặt online: coi như đã "chốt đơn" xong ở phía khách hàng,
                // nên vào thẳng trạng thái "Đang xử lý" để nhân viên xử lý giao hàng.
                // Đơn do Nhân viên/Admin tự lập tại quầy (có chọn MaNV) thì vẫn giữ
                // trạng thái khởi tạo "Chờ thanh toán" như cũ (khách thanh toán tại quầy).
                string trangThaiKhoiTao = laDonKhachTuDatOnline
                    ? TrangThaiHoaDon.DangXuLy
                    : TrangThaiHoaDon.ChoThanhToan;

                var hoaDonMoi = new HOADON
                {
                    MaHD = maHDMoi,
                    MaNV = maNhanVienPhuTrach,
                    MaKhachHang = request.MaKhachHang,
                    NgayLapHD = DateTime.Now,
                    NgayGiaoHang = null,
                    TrangThaiGiaoHang = trangThaiKhoiTao
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

            // [SỬA] Khách hàng KHÔNG có quyền sửa/cập nhật hóa đơn (chỉ được Tạo đơn và Xem
            // lịch sử/trạng thái đơn của chính mình) - việc cập nhật TrangThaiGiaoHang/NgayGiaoHang
            // và "nhận đơn" chỉ dành cho Nhân viên/Admin.
            if (role.Contains("Khách hàng", StringComparison.OrdinalIgnoreCase))
                return StatusCode(403, new { message = "Khách hàng không có quyền cập nhật hóa đơn." });

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
                // Đơn đang ở "kho chung" (MaNV = NV01, tức là do khách tự đặt online
                // và chưa nhân viên nào xử lý) thì NHÂN VIÊN ĐANG ĐĂNG NHẬP là người
                // đầu tiên thao tác (đổi trạng thái/ngày giao) sẽ nghiễm nhiên "nhận đơn":
                // hóa đơn được gán lại MaNV = chính nhân viên đó (không còn là NV01/
                // Phạm Huỳnh Thiên Sơn nữa) -> kể từ lúc này hóa đơn sẽ ẩn khỏi các
                // tài khoản nhân viên khác, chỉ nhân viên vừa nhận + Admin còn thấy được.
                // Lưu ý: KHÔNG dựa vào request.MaNV do Frontend gửi lên (không tin dữ liệu
                // client) mà lấy thẳng userId từ JWT để đảm bảo đúng người đang thao tác.
                if (hoaDon.MaNV == "NV01")
                {
                    hoaDon.MaNV = userId; // Gán đơn hàng cho nhân viên đang thao tác
                }
                // Chốt chặn bảo mật: Cấm sửa hóa đơn đã có nhân viên khác nhận/lập
                else if (hoaDon.MaNV != userId)
                {
                    return StatusCode(403, new { message = "Bạn không có quyền thao tác trên hóa đơn của người khác." });
                }

                // BƯỚC 2: Cập nhật Trạng thái giao hàng
                // [SỬA - FIX LỖI PHÂN QUYỀN] Theo tài liệu phân quyền: chỉ Admin mới được "Sửa/hủy
                // hóa đơn khi cần xử lý sai sót, khiếu nại"; Nhân viên "Không được xóa hóa đơn đã lập"
                // (việc Hủy hóa đơn - tương đương xóa mềm - chỉ dành riêng cho Admin qua API
                // PUT api/hoa-don/huy/{id}). Trước đây Nhân viên có thể tự ý gửi TrangThaiGiaoHang =
                // "Đã hủy" ngay qua API cập nhật đơn hàng này (vì "Đã hủy" nằm trong TrangThaiHoaDon.HopLe),
                // vừa vượt quyền vừa không hoàn lại tồn kho như luồng Hủy hóa đơn đúng chuẩn. Chặn lại:
                // Nhân viên chỉ được đặt các trạng thái ngoại trừ "Đã hủy".
                if (!string.IsNullOrWhiteSpace(request.TrangThaiGiaoHang)
                    && TrangThaiHoaDon.HopLe.Contains(request.TrangThaiGiaoHang)
                    && request.TrangThaiGiaoHang != TrangThaiHoaDon.DaHuy)
                {
                    hoaDon.TrangThaiGiaoHang = request.TrangThaiGiaoHang;
                    if (request.TrangThaiGiaoHang == TrangThaiHoaDon.DaGiaoHang)
                        hoaDon.NgayGiaoHang = DateTime.Now;
                }
                else if (request.TrangThaiGiaoHang == TrangThaiHoaDon.DaHuy)
                {
                    return StatusCode(403, new { message = "Chỉ Quản trị viên mới có quyền hủy hóa đơn. Vui lòng dùng chức năng Hủy hóa đơn dành cho Admin." });
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