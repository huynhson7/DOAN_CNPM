// ==========================================
// LỊCH SỬ ĐƠN HÀNG - dành cho Khách hàng
// Cho phép Khách hàng đang đăng nhập xem lại toàn bộ đơn hàng (hóa đơn) của
// chính mình và xem trạng thái xử lý/giao hàng của từng đơn qua chi tiết hóa đơn.
// ==========================================

// 0. DROPDOWN "SẢN PHẨM" TRÊN NAVBAR (đồng bộ với index.html/sanpham.html)
// ------------------------------------------
// Dropdown "Sản Phẩm" trên navbar: đồng bộ với index.html/sanpham.html - lấy
// danh sách MỤC ĐÍCH SỬ DỤNG THẬT từ API /api/muc-dich-su-dung thay vì 2 mục
// tĩnh (Phòng Khách/Phòng Ngủ) cũ. Ấn vào 1 mục sẽ chuyển sang sanpham.html
// kèm ?mucdich=<MaMD> để lọc đúng sản phẩm tương ứng.
const API_MUC_DICH_LSHD = "http://localhost:5129/api/muc-dich-su-dung";

async function loadMucDichDropdownLSHD() {
    const dropdown = document.getElementById("dropdownMucDich");
    if (!dropdown) return;

    try {
        const res = await fetch(API_MUC_DICH_LSHD);
        if (!res.ok) throw new Error("Không thể tải mục đích sử dụng.");
        const data = await res.json();

        dropdown.innerHTML = data.map(m => {
            const ma = m.maMD || m.MaMD;
            const ten = m.tenMD || m.TenMD;
            return `<a href="sanpham.html?mucdich=${encodeURIComponent(ma)}">${escapeHtmlCart(ten)}</a>`;
        }).join("");
    } catch (error) {
        console.error("Lỗi tải Mục Đích Sử Dụng cho dropdown Sản Phẩm:", error);
        dropdown.innerHTML = "";
    }
}

document.addEventListener("DOMContentLoaded", loadMucDichDropdownLSHD);

// 1. CẤU HÌNH API
// ------------------------------------------
const API_HOA_DON_LSHD = "http://localhost:5129/api/hoa-don";

// 2. THÔNG TIN PHIÊN ĐĂNG NHẬP HIỆN TẠI
// ------------------------------------------
const TOKEN_LSHD = localStorage.getItem('token') || '';

function getAuthHeadersLSHD() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_LSHD}`
    };
}

// Lưu lại toàn bộ danh sách đơn hàng gốc (chưa lọc) để lọc theo trạng thái
// ngay trên trình duyệt mà không cần gọi lại API mỗi lần đổi bộ lọc.
let dsDonHangCuaToiGoc = [];

// 3. HÀM TIỆN ÍCH (dùng chung định dạng với module Quản lý Hóa Đơn)
// ------------------------------------------
function dinhDangTienLSHD(soTien) {
    return (soTien || 0).toLocaleString('vi-VN') + ' đ';
}

function dinhDangNgayLSHD(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const ngay = String(d.getDate()).padStart(2, '0');
    const thang = String(d.getMonth() + 1).padStart(2, '0');
    return `${ngay}/${thang}/${d.getFullYear()}`;
}

function lopTrangThaiLSHD(trangThai) {
    if (trangThai === 'Đã hủy') return 'status-cancelled';
    if (trangThai === 'Đã giao hàng' || trangThai === 'Đã thanh toán') return 'status-paid';
    if (trangThai === 'Đang xử lý') return 'status-processing';
    return 'status-pending';
}

/** Hiển thị 1 khối thông báo (đang tải / lỗi / chưa có đơn hàng) thay cho bảng dữ liệu. */
function hienThiThongBaoLSHD(html) {
    const thongBaoEl = document.getElementById('lshdThongBao');
    const bangWrapperEl = document.getElementById('lshdBangWrapper');
    thongBaoEl.innerHTML = html;
    thongBaoEl.style.display = 'block';
    bangWrapperEl.style.display = 'none';
}

function anThongBaoLSHD() {
    document.getElementById('lshdThongBao').style.display = 'none';
    document.getElementById('lshdBangWrapper').style.display = 'block';
}

// 4. TẢI DANH SÁCH ĐƠN HÀNG CỦA KHÁCH HÀNG ĐANG ĐĂNG NHẬP (GET)
// ------------------------------------------
async function taiDonHangCuaToi() {
    if (!TOKEN_LSHD) {
        hienThiThongBaoLSHD(`
            <i class="fas fa-user-lock"></i>
            Bạn cần <a href="login.html">đăng nhập</a> để xem lịch sử đơn hàng của mình.
        `);
        return;
    }

    try {
        const res = await fetch(API_HOA_DON_LSHD, {
            method: 'GET',
            headers: getAuthHeadersLSHD()
        });

        if (res.status === 401) {
            hienThiThongBaoLSHD(`
                <i class="fas fa-user-lock"></i>
                Phiên đăng nhập đã hết hạn. Vui lòng <a href="login.html">đăng nhập lại</a>.
            `);
            return;
        }
        if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng.');

        const danhSach = await res.json();
        dsDonHangCuaToiGoc = Array.isArray(danhSach) ? danhSach : [];

        if (dsDonHangCuaToiGoc.length === 0) {
            hienThiThongBaoLSHD(`
                <i class="fas fa-box-open"></i>
                Bạn chưa có đơn hàng nào. Hãy <a href="sanpham.html">mua sắm ngay</a>!
            `);
            return;
        }

        anThongBaoLSHD();
        locDonHangCuaToi();
    } catch (error) {
        console.error('Lỗi tải lịch sử đơn hàng:', error);
        hienThiThongBaoLSHD(`
            <i class="fas fa-triangle-exclamation"></i>
            ${error.message || 'Có lỗi xảy ra khi tải lịch sử đơn hàng. Vui lòng thử lại.'}
        `);
    }
}

/** Vẽ bảng danh sách đơn hàng từ một mảng dữ liệu cho trước (đã lọc hoặc chưa). */
function renderBangDonHangCuaToi(danhSach) {
    const tbody = document.getElementById('bangDonHangCuaToi');

    if (!danhSach || danhSach.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Không tìm thấy đơn hàng phù hợp với bộ lọc</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    danhSach.forEach(hd => {
        const row = `
            <tr>
                <td><strong>${hd.maHD}</strong></td>
                <td>${dinhDangNgayLSHD(hd.ngayLapHD)}</td>
                <td>${hd.ngayGiaoHang ? dinhDangNgayLSHD(hd.ngayGiaoHang) : '—'}</td>
                <td class="price-text">${dinhDangTienLSHD(hd.tongTien)}</td>
                <td><span class="status-badge ${lopTrangThaiLSHD(hd.trangThaiGiaoHang)}">${hd.trangThaiGiaoHang ?? ''}</span></td>
                <td>
                    <button class="btn-action lshd-view" onclick="openHdModal('${hd.maHD}')" title="Xem chi tiết đơn hàng">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// 5. LỌC ĐƠN HÀNG THEO TRẠNG THÁI
// ------------------------------------------
function locDonHangCuaToi() {
    const trangThaiChon = document.getElementById('filterTrangThaiLSHD')?.value || '';

    const ketQua = dsDonHangCuaToiGoc.filter(hd => {
        if (trangThaiChon && hd.trangThaiGiaoHang !== trangThaiChon) return false;
        return true;
    });

    renderBangDonHangCuaToi(ketQua);
}

// 6. MỞ MODAL XEM CHI TIẾT ĐƠN HÀNG / TRẠNG THÁI ĐƠN HÀNG (GET BY ID)
// ------------------------------------------
async function openHdModal(maHD) {
    try {
        const res = await fetch(`${API_HOA_DON_LSHD}/${maHD}`, {
            method: 'GET',
            headers: getAuthHeadersLSHD()
        });
        if (res.status === 403) throw new Error('Bạn không có quyền xem đơn hàng này.');
        if (!res.ok) throw new Error('Không tải được chi tiết đơn hàng.');
        const hd = await res.json();

        document.getElementById('hdModalTitle').innerText = `Chi Tiết Đơn Hàng #${hd.maHD}`;
        document.getElementById('hdKhachHangTen').innerText = hd.khachHang?.tenKhachHang ?? '';
        document.getElementById('hdKhachHangDT').innerText = hd.khachHang?.sdtKhachHang ?? '';
        document.getElementById('hdKhachHangDiaChi').innerText = hd.khachHang?.diaChiKhachHang ?? '';
        document.getElementById('hdMaHD').innerText = hd.maHD;
        document.getElementById('hdNgayLap').innerText = dinhDangNgayLSHD(hd.ngayLapHD);
        document.getElementById('hdTrangThai').innerHTML =
            `<span class="status-badge ${lopTrangThaiLSHD(hd.trangThaiGiaoHang)}">${hd.trangThaiGiaoHang ?? ''}</span>`;

        const tbody = document.getElementById('hdChiTietBody');
        tbody.innerHTML = '';
        let stt = 1;
        (hd.chiTiet || []).forEach(ct => {
            tbody.innerHTML += `
                <tr>
                    <td>${stt++}</td>
                    <td>${ct.tenSP ?? ''}</td>
                    <td class="text-center">${ct.soLuongBan}</td>
                    <td class="text-right">${(ct.donGiaBan || 0).toLocaleString('vi-VN')}</td>
                    <td class="text-right">${(ct.thanhTien || 0).toLocaleString('vi-VN')}</td>
                </tr>
            `;
        });

        document.getElementById('hdTongTienHang').innerText = dinhDangTienLSHD(hd.tongTien);
        document.getElementById('hdTongCong').innerText = dinhDangTienLSHD(hd.tongTien);

        document.getElementById('hdModal').style.display = 'flex';
    } catch (error) {
        console.error('Lỗi xem chi tiết đơn hàng:', error);
        alert(error.message || 'Không thể tải chi tiết đơn hàng này!');
    }
}

function closeHdModal() {
    document.getElementById('hdModal').style.display = 'none';
}

document.addEventListener('click', function (event) {
    const hdModal = document.getElementById('hdModal');
    if (event.target === hdModal) closeHdModal();
});

// 7. KHỞI CHẠY TRANG
// ------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    // Chỉ Khách hàng mới được xem trang này. Nếu chưa đăng nhập, requireRole()
    // sẽ tự điều hướng về login.html; nếu đăng nhập bằng vai trò khác (Admin/
    // Nhân viên) sẽ được đưa về trang phù hợp với vai trò của họ.
    if (typeof requireRole === 'function') {
        requireRole(['Khách hàng']);
    }

    taiDonHangCuaToi();
});