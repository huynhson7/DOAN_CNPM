// ==========================================
// 1. CẤU HÌNH API
// ==========================================
const API_HOA_DON = "http://localhost:5129/api/hoa-don";
const API_KHACH_HANG = "http://localhost:5129/api/khach-hang";
const API_SAN_PHAM = "http://localhost:5129/api/san-pham";
const API_NHAN_VIEN = "http://localhost:5129/api/nhan-vien";

// Nhân viên đang đăng nhập (tạm thời lấy từ localStorage, mặc định NV02
// cho tới khi module Đăng nhập lưu JWT/thông tin phiên thật sự)
const MA_NV_HIEN_TAI = localStorage.getItem('maNV') || 'NV02';

// Cache dữ liệu sản phẩm để tính đơn giá + hiển thị mà không cần gọi lại API
let dsSanPhamCache = [];

// Cache toàn bộ danh sách hóa đơn tải từ API (chưa lọc) để lọc theo
// khung thời gian + trạng thái ngay trên trình duyệt mà không cần gọi lại API
let dsHoaDonGoc = [];

// Giỏ hàng tạm thời của hóa đơn đang lập: [{ maSP, tenSP, soLuong, donGia }]
let gioHangHD = [];

// Trạng thái Sửa hóa đơn: false = đang Tạo mới, true = đang Sửa
let isEditMode = false;
let maHDDangSua = null;

// ==========================================
// 2. HÀM TIỆN ÍCH
// ==========================================
function dinhDangTien(soTien) {
    return (soTien || 0).toLocaleString('vi-VN') + ' đ';
}

function dinhDangNgay(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const ngay = String(d.getDate()).padStart(2, '0');
    const thang = String(d.getMonth() + 1).padStart(2, '0');
    return `${ngay}/${thang}/${d.getFullYear()}`;
}

function lopTrangThai(trangThai) {
    if (trangThai === 'Đã hủy') return 'status-cancelled';
    if (trangThai === 'Đã giao hàng' || trangThai === 'Đã thanh toán') return 'status-paid';
    if (trangThai === 'Đang xử lý') return 'status-processing';
    return 'status-pending';
}

// ==========================================
// 3. TẢI DANH SÁCH HÓA ĐƠN (GET) - Bảng chính
// ==========================================
async function taiDanhSachHoaDon() {
    const tbody = document.getElementById('bangHoaDon');
    try {
        const res = await fetch(API_HOA_DON);
        if (!res.ok) throw new Error('Lỗi mạng khi tải danh sách hóa đơn');
        const danhSach = await res.json();

        // Lưu lại toàn bộ danh sách gốc để lọc theo thời gian/trạng thái
        // ngay trên trình duyệt, không cần gọi lại API mỗi lần bấm Lọc.
        dsHoaDonGoc = danhSach;

        // Áp dụng lại bộ lọc hiện tại (nếu người dùng đã chọn điều kiện lọc
        // trước đó, ví dụ sau khi Thêm/Sửa/Xóa hóa đơn xong danh sách được
        // tải lại thì bộ lọc vẫn được giữ nguyên).
        locHoaDon();
    } catch (error) {
        console.error('Lỗi tải danh sách hóa đơn:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Không thể tải danh sách hóa đơn. Hãy đảm bảo API đang chạy!</td></tr>';
    }
}

// Vẽ bảng danh sách hóa đơn từ một mảng dữ liệu cho trước (đã lọc hoặc chưa)
function renderBangHoaDon(danhSach) {
    const tbody = document.getElementById('bangHoaDon');

    if (!danhSach || danhSach.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không tìm thấy hóa đơn phù hợp</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    danhSach.forEach(hd => {
        const row = `
            <tr>
                <td><strong>${hd.maHD}</strong></td>
                <td>${dinhDangNgay(hd.ngayLapHD)}</td>
                <td>${hd.tenKhachHang ?? ''}</td>
                <td>${hd.tenNV ?? ''}</td>
                <td class="price-text">${dinhDangTien(hd.tongTien)}</td>
                <td><span class="status-badge ${lopTrangThai(hd.trangThaiGiaoHang)}">${hd.trangThaiGiaoHang ?? ''}</span></td>
                <td>
                    <button class="btn-action view" onclick="openHdModal('${hd.maHD}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action print" onclick="openAndPrintHd('${hd.maHD}')" title="Xuất/In hóa đơn">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn-action edit" onclick="openEditModal('${hd.maHD}')" title="Sửa hóa đơn">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-action delete" onclick="xoaHoaDon('${hd.maHD}')" title="Xóa hóa đơn">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ==========================================
// 3b. LỌC HÓA ĐƠN THEO KHUNG THỜI GIAN + TRẠNG THÁI
// ==========================================
function locHoaDon() {
    const tuNgayStr = document.getElementById('filterTuNgay')?.value || '';
    const denNgayStr = document.getElementById('filterDenNgay')?.value || '';
    const trangThaiChon = document.getElementById('filterTrangThai')?.value || '';

    // input[type=date] trả về "yyyy-mm-dd" -> tạo mốc thời gian đầu ngày / cuối ngày
    const tuNgay = tuNgayStr ? new Date(tuNgayStr + 'T00:00:00') : null;
    const denNgay = denNgayStr ? new Date(denNgayStr + 'T23:59:59') : null;

    if (tuNgay && denNgay && tuNgay > denNgay) {
        alert('"Từ ngày" không được lớn hơn "Đến ngày"!');
        return;
    }

    const ketQua = dsHoaDonGoc.filter(hd => {
        // Lọc theo trạng thái đơn hàng
        if (trangThaiChon && hd.trangThaiGiaoHang !== trangThaiChon) {
            return false;
        }

        // Lọc theo khung thời gian (ngày lập hóa đơn)
        if (tuNgay || denNgay) {
            if (!hd.ngayLapHD) return false;
            const ngayLap = new Date(hd.ngayLapHD);
            if (tuNgay && ngayLap < tuNgay) return false;
            if (denNgay && ngayLap > denNgay) return false;
        }

        return true;
    });

    renderBangHoaDon(ketQua);
}

// Bỏ toàn bộ điều kiện lọc, hiển thị lại tất cả hóa đơn
function boLocHoaDon() {
    document.getElementById('filterTuNgay').value = '';
    document.getElementById('filterDenNgay').value = '';
    document.getElementById('filterTrangThai').value = '';
    renderBangHoaDon(dsHoaDonGoc);
}

// ==========================================
// 4. MỞ MODAL XEM CHI TIẾT / IN HÓA ĐƠN (GET BY ID)
// ==========================================
async function openHdModal(maHD) {
    try {
        const res = await fetch(`${API_HOA_DON}/${maHD}`);
        if (!res.ok) throw new Error('Không tải được chi tiết hóa đơn');
        const hd = await res.json();

        document.getElementById('hdModalTitle').innerText = `Chi Tiết Hóa Đơn #${hd.maHD}`;
        document.getElementById('hdKhachHangTen').innerText = hd.khachHang?.tenKhachHang ?? '';
        document.getElementById('hdKhachHangDT').innerText = hd.khachHang?.sdtKhachHang ?? '';
        document.getElementById('hdKhachHangDiaChi').innerText = hd.khachHang?.diaChiKhachHang ?? '';
        document.getElementById('hdMaHD').innerText = hd.maHD;
        document.getElementById('hdNgayLap').innerText = dinhDangNgay(hd.ngayLapHD);
        document.getElementById('hdNhanVien').innerText = hd.nhanVien?.tenNV ?? '';

        const tbody = document.getElementById('hdChiTietBody');
        tbody.innerHTML = '';
        let stt = 1;
        hd.chiTiet.forEach(ct => {
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

        document.getElementById('hdTongTienHang').innerText = dinhDangTien(hd.tongTien);
        document.getElementById('hdTongCong').innerText = dinhDangTien(hd.tongTien);

        document.getElementById('hdModal').style.display = 'flex';
    } catch (error) {
        console.error('Lỗi xem chi tiết hóa đơn:', error);
        alert('Không thể tải chi tiết hóa đơn này!');
    }
}

function openAndPrintHd(maHD) {
    openHdModal(maHD).then(() => {
        setTimeout(function () { window.print(); }, 300);
    });
}

// ==========================================
// 5. CHUẨN BỊ MODAL TẠO HÓA ĐƠN MỚI
// ==========================================
async function resetFormTaoHoaDon() {
    gioHangHD = [];
    isEditMode = false;
    maHDDangSua = null;
    renderGioHang();

    document.getElementById('createHdForm').reset();
    document.getElementById('createModalTitle').innerHTML = '<i class="fas fa-cart-plus"></i> Lập Hóa Đơn Bán Hàng';
    document.getElementById('btnLuuHD').innerText = 'Hoàn Tất Tạo HĐ';
    document.getElementById('selectKhachHang').disabled = false;

    // Hóa đơn mới luôn bắt đầu ở trạng thái "Chờ thanh toán" nên không cần
    // hiển thị ô chọn trạng thái khi Tạo mới (chỉ hiện khi Sửa hóa đơn)
    document.getElementById('groupTrangThai').style.display = 'none';

    // Ngày lập luôn là hôm nay
    const homNay = new Date();
    document.getElementById('inputNgayLap').value = homNay.toISOString().split('T')[0];

    await Promise.all([taiDanhSachKhachHang(), taiDanhSachSanPham(), taiDanhSachNhanVien()]);
}
// Tải danh sách khách hàng vào <select>
async function taiDanhSachKhachHang() {
    const select = document.getElementById('selectKhachHang');
    try {
        const res = await fetch(API_KHACH_HANG);
        if (!res.ok) throw new Error('Lỗi tải khách hàng');
        const dsKH = await res.json();

        select.innerHTML = '<option value="">-- Chọn Khách Hàng --</option>';
        dsKH.forEach(kh => {
            const option = document.createElement('option');
            option.value = kh.maKhachHang;
            option.innerText = `${kh.tenKhachHang} - ${kh.sdtKhachHang ?? ''}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Lỗi tải danh sách khách hàng:', error);
        select.innerHTML = '<option value="">-- Không tải được danh sách --</option>';
    }
}

// Tải danh sách sản phẩm (nội thất) vào <select>
async function taiDanhSachSanPham() {
    const select = document.getElementById('selectSanPham');
    try {
        const res = await fetch(API_SAN_PHAM);
        if (!res.ok) throw new Error('Lỗi tải sản phẩm');
        dsSanPhamCache = await res.json();

        select.innerHTML = '<option value="">-- Chọn SP --</option>';
        dsSanPhamCache.forEach(sp => {
            const option = document.createElement('option');
            option.value = sp.maSP;
            option.innerText = `${sp.tenSP} (còn ${sp.soLuongTon ?? 0})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Lỗi tải danh sách sản phẩm:', error);
        select.innerHTML = '<option value="">-- Không tải được danh sách --</option>';
    }
}

// Tải danh sách nhân viên vào <select> để chọn/đổi nhân viên phụ trách hóa đơn.
// maNVChon: mã nhân viên cần chọn sẵn (khi Sửa hóa đơn); bỏ trống thì mặc định
// chọn nhân viên đang đăng nhập (khi Tạo mới).
async function taiDanhSachNhanVien(maNVChon) {
    const select = document.getElementById('selectNhanVien');
    try {
        const res = await fetch(API_NHAN_VIEN);
        if (!res.ok) throw new Error('Lỗi tải danh sách nhân viên');
        const dsNV = await res.json();

        select.innerHTML = '<option value="">-- Chọn Nhân Viên --</option>';
        dsNV.forEach(nv => {
            const option = document.createElement('option');
            option.value = nv.maNV;
            option.innerText = nv.tenNV;
            select.appendChild(option);
        });

        select.value = maNVChon || MA_NV_HIEN_TAI;
    } catch (error) {
        console.error('Lỗi tải danh sách nhân viên:', error);
        select.innerHTML = '<option value="">-- Không tải được danh sách --</option>';
    }
}

// ==========================================
// 5b. MỞ MODAL SỬA HÓA ĐƠN (điền sẵn dữ liệu cũ)
// ==========================================
async function openEditModal(maHD) {
    try {
        const res = await fetch(`${API_HOA_DON}/${maHD}`);
        if (!res.ok) throw new Error('Không tải được hóa đơn cần sửa');
        const hd = await res.json();

        if (hd.trangThaiGiaoHang === 'Đã hủy' || hd.trangThaiGiaoHang === 'Đã giao hàng') {
            alert('Hóa đơn đã hủy hoặc đã giao hàng nên không thể sửa!');
            return;
        }

        // Tải danh sách KH/SP/NV trước rồi mới điền dữ liệu cũ vào
        await Promise.all([taiDanhSachKhachHang(), taiDanhSachSanPham(), taiDanhSachNhanVien(hd.nhanVien?.maNV)]);

        isEditMode = true;
        maHDDangSua = maHD;

        document.getElementById('createHdForm').reset();
        document.getElementById('createModalTitle').innerHTML = `<i class="fas fa-pen"></i> Sửa Hóa Đơn #${maHD}`;
        document.getElementById('btnLuuHD').innerText = 'Lưu Thay Đổi';
        document.getElementById('inputNgayLap').value = hd.ngayLapHD ? hd.ngayLapHD.split('T')[0] : '';
        document.getElementById('selectKhachHang').value = hd.khachHang?.maKhachHang ?? '';

        // Hiện ô chọn trạng thái và điền đúng trạng thái hiện tại của hóa đơn
        const groupTrangThai = document.getElementById('groupTrangThai');
        const selectTrangThai = document.getElementById('selectTrangThai');
        groupTrangThai.style.display = '';
        selectTrangThai.value = hd.trangThaiGiaoHang || 'Chờ thanh toán';

        // Điền lại giỏ hàng từ chi tiết hóa đơn cũ
        gioHangHD = hd.chiTiet.map(ct => ({
            maSP: ct.maSP,
            tenSP: ct.tenSP,
            soLuong: ct.soLuongBan,
            donGia: ct.donGiaBan || 0
        }));
        renderGioHang();

        document.getElementById('createModal').style.display = 'flex';
    } catch (error) {
        console.error('Lỗi mở form sửa hóa đơn:', error);
        alert('Không thể tải hóa đơn để sửa!');
    }
}

// ==========================================
// 5c. XÓA HÓA ĐƠN (DELETE) - hoàn lại tồn kho
// ==========================================
async function xoaHoaDon(maHD) {
    const xacNhan = confirm(`Bạn có chắc chắn muốn xóa hóa đơn ${maHD}? Tồn kho sản phẩm sẽ được hoàn lại.`);
    if (!xacNhan) return;

    try {
        const res = await fetch(`${API_HOA_DON}/${maHD}`, { method: 'DELETE' });
        const data = await res.json();

        if (res.ok) {
            alert('Xóa hóa đơn thành công!');
            taiDanhSachHoaDon();
        } else {
            alert(data.message || 'Lỗi khi xóa hóa đơn');
        }
    } catch (error) {
        console.error('Lỗi xóa hóa đơn:', error);
        alert('Lỗi kết nối tới Server. Hãy đảm bảo API đang chạy!');
    }
}

// ==========================================
// 6. THÊM / XÓA SẢN PHẨM TRONG GIỎ HÀNG HÓA ĐƠN
// ==========================================
function themSanPhamVaoHD() {
    const selectSP = document.getElementById('selectSanPham');
    const inputSL = document.getElementById('inputSoLuong');

    const maSP = selectSP.value;
    const soLuong = parseInt(inputSL.value, 10);

    if (!maSP) {
        alert('Vui lòng chọn sản phẩm trước khi thêm!');
        return;
    }
    if (!soLuong || soLuong <= 0) {
        alert('Số lượng phải lớn hơn 0!');
        return;
    }

    const sanPham = dsSanPhamCache.find(sp => sp.maSP === maSP);
    if (!sanPham) return;

    // Nếu sản phẩm đã có trong giỏ thì cộng dồn số lượng
    const dongDaCo = gioHangHD.find(item => item.maSP === maSP);
    const tongSauKhiThem = (dongDaCo ? dongDaCo.soLuong : 0) + soLuong;

    // Chỉ kiểm tra cứng tồn kho khi TẠO MỚI. Khi SỬA, tồn kho hiển thị đã bị trừ
    // bởi chính hóa đơn đang sửa nên để Backend kiểm tra lại cho chính xác.
    if (!isEditMode && sanPham.soLuongTon != null && tongSauKhiThem > sanPham.soLuongTon) {
        alert(`Sản phẩm "${sanPham.tenSP}" chỉ còn ${sanPham.soLuongTon} trong kho!`);
        return;
    }

    if (dongDaCo) {
        dongDaCo.soLuong += soLuong;
    } else {
        gioHangHD.push({
            maSP: sanPham.maSP,
            tenSP: sanPham.tenSP,
            soLuong: soLuong,
            donGia: sanPham.giaBan || 0
        });
    }

    renderGioHang();

    // Reset lựa chọn để thêm sản phẩm tiếp theo
    selectSP.value = '';
    inputSL.value = 1;
}

function xoaSanPhamKhoiHD(maSP) {
    gioHangHD = gioHangHD.filter(item => item.maSP !== maSP);
    renderGioHang();
}

// Sửa trực tiếp số lượng của 1 dòng sản phẩm đã có trong giỏ hàng
function suaSoLuongTrongHD(maSP, giaTriMoi) {
    const item = gioHangHD.find(sp => sp.maSP === maSP);
    if (!item) return;

    let soLuongMoi = parseInt(giaTriMoi, 10);
    if (!soLuongMoi || soLuongMoi <= 0) {
        alert('Số lượng phải lớn hơn 0!');
        renderGioHang(); // Vẽ lại để trả ô input về giá trị cũ hợp lệ
        return;
    }

    // Chỉ kiểm tra cứng tồn kho khi TẠO MỚI, tương tự lúc thêm sản phẩm.
    // Khi SỬA hóa đơn, tồn kho hiển thị đã bị trừ bởi chính hóa đơn đang sửa
    // nên để Backend kiểm tra lại cho chính xác lúc lưu.
    const sanPham = dsSanPhamCache.find(sp => sp.maSP === maSP);
    if (!isEditMode && sanPham && sanPham.soLuongTon != null && soLuongMoi > sanPham.soLuongTon) {
        alert(`Sản phẩm "${item.tenSP}" chỉ còn ${sanPham.soLuongTon} trong kho!`);
        soLuongMoi = sanPham.soLuongTon;
    }

    item.soLuong = soLuongMoi;
    renderGioHang();
}

// Vẽ lại bảng chi tiết sản phẩm + tự động tính tổng tiền
function renderGioHang() {
    const tbody = document.getElementById('bangChiTietHD');
    tbody.innerHTML = '';

    if (gioHangHD.length === 0) {
        tbody.innerHTML = '<tr id="hangTrongHD"><td colspan="5" style="text-align:center; color:#999;">Chưa có sản phẩm nào</td></tr>';
    } else {
        gioHangHD.forEach(item => {
            const thanhTien = item.soLuong * item.donGia;
            tbody.innerHTML += `
                <tr>
                    <td>${item.tenSP}</td>
                    <td>
                        <input type="number" class="qty-edit-input" min="1" value="${item.soLuong}"
                            onchange="suaSoLuongTrongHD('${item.maSP}', this.value)">
                    </td>
                    <td>${item.donGia.toLocaleString('vi-VN')}</td>
                    <td>${thanhTien.toLocaleString('vi-VN')}</td>
                    <td><button type="button" class="btn-action delete" onclick="xoaSanPhamKhoiHD('${item.maSP}')"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        });
    }

    // Tự động tính tổng tiền = tổng (số lượng * đơn giá) của mọi dòng
    const tongTien = gioHangHD.reduce((tong, item) => tong + item.soLuong * item.donGia, 0);
    document.getElementById('tongTienTamTinh').innerText = dinhDangTien(tongTien);
}

// ==========================================
// 7. GỬI DỮ LIỆU TẠO HÓA ĐƠN MỚI (POST)
// ==========================================
document.getElementById('createHdForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const maKhachHang = document.getElementById('selectKhachHang').value;
    const maNVChon = document.getElementById('selectNhanVien').value;

    if (!maKhachHang) {
        alert('Vui lòng chọn khách hàng!');
        return;
    }
    if (!maNVChon) {
        alert('Vui lòng chọn nhân viên lập hóa đơn!');
        return;
    }
    if (gioHangHD.length === 0) {
        alert('Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn!');
        return;
    }

    const payload = {
        maKhachHang: maKhachHang,
        maNV: maNVChon,
        chiTietSanPham: gioHangHD.map(item => ({
            maSP: item.maSP,
            soLuongBan: item.soLuong,
            giamGia: 0
        })),
        // Chỉ gửi trạng thái khi đang Sửa hóa đơn; Tạo mới thì bỏ trống để
        // Backend tự gán mặc định "Chờ thanh toán"
        trangThaiGiaoHang: isEditMode ? document.getElementById('selectTrangThai').value : null
    };

    const btnLuu = document.getElementById('btnLuuHD');
    const chuGoc = btnLuu.innerText;

    const apiUrl = isEditMode ? `${API_HOA_DON}/${maHDDangSua}` : API_HOA_DON;
    const apiMethod = isEditMode ? 'PUT' : 'POST';

    try {
        btnLuu.disabled = true;
        btnLuu.innerText = 'Đang xử lý...';

        const res = await fetch(apiUrl, {
            method: apiMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            alert(isEditMode ? 'Cập nhật hóa đơn thành công!' : `Lập hóa đơn thành công! Mã HĐ: ${data.maHD}`);
            closeCreateModal();
            taiDanhSachHoaDon(); // Tải lại bảng danh sách
        } else {
            alert(data.message || 'Có lỗi xảy ra khi lưu hóa đơn.');
        }
    } catch (error) {
        console.error('Lỗi gửi dữ liệu hóa đơn:', error);
        alert('Lỗi kết nối tới Server. Hãy đảm bảo API đang chạy!');
    } finally {
        btnLuu.disabled = false;
        btnLuu.innerText = chuGoc;
    }
});

// ==========================================
// 8. KHỞI CHẠY KHI TRANG TẢI XONG
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    taiDanhSachHoaDon();

    const btnLoc = document.getElementById('btnLocHoaDon');
    if (btnLoc) {
        btnLoc.addEventListener('click', function (event) {
            event.preventDefault();
            locHoaDon();
        });
    }

    const btnBoLoc = document.getElementById('btnBoLocHoaDon');
    if (btnBoLoc) {
        btnBoLoc.addEventListener('click', function (event) {
            event.preventDefault();
            boLocHoaDon();
        });
    }
});