// ==========================================
// 1. CẤU HÌNH API
// ==========================================
const API_HOA_DON = "http://localhost:5129/api/hoa-don";
const API_KHACH_HANG = "http://localhost:5129/api/khach-hang";
const API_SAN_PHAM = "http://localhost:5129/api/san-pham";
const API_NHAN_VIEN = "http://localhost:5129/api/nhan-vien";

// Nhân viên đang đăng nhập (Lấy từ localStorage thực tế)
const MA_NV_HIEN_TAI = localStorage.getItem('userId') || localStorage.getItem('maNV') || '';
const TOKEN_HIEN_TAI = localStorage.getItem('token') || '';
const ROLE_HIEN_TAI = localStorage.getItem('userRole') || '';

// Kiểm tra quyền: Nếu là Admin hoặc Quản trị thì true, ngược lại false
const IS_ADMIN = ROLE_HIEN_TAI.toLowerCase().includes('admin') || ROLE_HIEN_TAI.toLowerCase().includes('quản trị');

// Hàm tiện ích tự động đính kèm Token vào Header cho mọi API call
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_HIEN_TAI}`
    };
}

// Cache dữ liệu sản phẩm để tính đơn giá + hiển thị mà không cần gọi lại API
let dsSanPhamCache = [];

// Cache dữ liệu khách hàng để lấy tự động địa chỉ điền vào ghi chú
let dsKhachHangCache = [];

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
        const res = await fetch(API_HOA_DON, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (res.status === 401) throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
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
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">${error.message || 'Không thể tải danh sách hóa đơn.'}</td></tr>`;
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
        // --- LOGIC PHÂN QUYỀN: Ẩn nút Xóa/Hủy đối với Nhân viên ---
        const btnHuyHtml = IS_ADMIN 
            ? `<button class="btn-action delete" onclick="huyHoaDon('${hd.maHD}')" title="Hủy hóa đơn"><i class="fas fa-times"></i></button>` 
            : '';

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
                    ${btnHuyHtml}
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
        const res = await fetch(`${API_HOA_DON}/${maHD}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
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
    
    // Mở khóa toàn bộ form (phòng trường hợp trước đó vừa bấm Sửa bị khóa mờ)
    document.getElementById('selectKhachHang').disabled = false;
    document.getElementById('selectNhanVien').disabled = false;
    document.getElementById('selectSanPham').disabled = false;
    document.getElementById('inputSoLuong').disabled = false;
    const btnAddSp = document.querySelector('.btn-add-sp');
    if (btnAddSp) btnAddSp.disabled = false;
    
    // Xóa trắng ô Ghi chú
    const txtGhiChu = document.getElementById('inputGhiChu');
    if (txtGhiChu) {
        txtGhiChu.value = '';
        txtGhiChu.disabled = false;
    }

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
        const res = await fetch(API_KHACH_HANG, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Lỗi tải khách hàng');
        dsKhachHangCache = await res.json();

        select.innerHTML = '<option value="">-- Chọn Khách Hàng --</option>';
        dsKhachHangCache.forEach(kh => {
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
        const res = await fetch(API_SAN_PHAM, {
            method: 'GET',
            headers: getAuthHeaders()
        });
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
async function taiDanhSachNhanVien(maNVChon, tenNVChon) {
    const select = document.getElementById('selectNhanVien');
    try {
        const res = await fetch(API_NHAN_VIEN, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Lỗi tải danh sách nhân viên');
        const dsNV = await res.json();

        select.innerHTML = '<option value="">-- Chọn Nhân Viên --</option>';
        dsNV.forEach(nv => {
            const option = document.createElement('option');
            option.value = nv.maNV;
            option.innerText = nv.tenNV;
            select.appendChild(option);
        });

        const maCanChon = (maNVChon || MA_NV_HIEN_TAI || '').trim();
        const nvKhopTrongDanhSach = dsNV.find(
            nv => (nv.maNV || '').trim().toLowerCase() === maCanChon.toLowerCase()
        );

        if (maCanChon && !nvKhopTrongDanhSach) {
            const optionCu = document.createElement('option');
            optionCu.value = maCanChon;
            optionCu.innerText = tenNVChon ? tenNVChon : maCanChon;
            select.appendChild(optionCu);
            select.value = maCanChon;
        } else {
            select.value = nvKhopTrongDanhSach ? nvKhopTrongDanhSach.maNV : maCanChon;
        }
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
        const res = await fetch(`${API_HOA_DON}/${maHD}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Không tải được hóa đơn cần sửa');
        const hd = await res.json();

        if (hd.trangThaiGiaoHang === 'Đã hủy' || hd.trangThaiGiaoHang === 'Đã giao hàng') {
            alert('Hóa đơn đã hủy hoặc đã giao hàng nên không thể sửa!');
            return;
        }

        isEditMode = true;
        maHDDangSua = maHD;

        // QUAN TRỌNG: reset() phải chạy TRƯỚC
        document.getElementById('createHdForm').reset();
        document.getElementById('createModalTitle').innerHTML = `<i class="fas fa-pen"></i> Sửa Hóa Đơn #${maHD}`;
        document.getElementById('btnLuuHD').innerText = 'Lưu Thay Đổi';

        await Promise.all([
            taiDanhSachKhachHang(),
            taiDanhSachSanPham(),
            taiDanhSachNhanVien(hd.nhanVien?.maNV, hd.nhanVien?.tenNV)
        ]);

        document.getElementById('inputNgayLap').value = hd.ngayLapHD ? hd.ngayLapHD.split('T')[0] : '';
        document.getElementById('selectKhachHang').value = hd.khachHang?.maKhachHang ?? '';

        // Hiện ô chọn trạng thái và điền đúng trạng thái hiện tại của hóa đơn
        const groupTrangThai = document.getElementById('groupTrangThai');
        const selectTrangThai = document.getElementById('selectTrangThai');
        groupTrangThai.style.display = '';
        selectTrangThai.value = hd.trangThaiGiaoHang || 'Chờ thanh toán';
        
        // Điền lại ghi chú từ chi tiết đầu tiên của hóa đơn (nếu có)
        const moTaCu = hd.chiTiet.length > 0 ? hd.chiTiet[0].moTa : '';
        const txtGhiChu = document.getElementById('inputGhiChu');
        if (txtGhiChu) txtGhiChu.value = moTaCu || '';

        // Điền lại giỏ hàng từ chi tiết hóa đơn cũ
        gioHangHD = hd.chiTiet.map(ct => ({
            maSP: ct.maSP,
            tenSP: ct.tenSP,
            soLuong: ct.soLuongBan,
            donGia: ct.donGiaBan || 0
        }));
        
        // --- LOGIC PHÂN QUYỀN TRÊN FORM SỬA ---
        const selectKhachHang = document.getElementById('selectKhachHang');
        const selectNhanVien = document.getElementById('selectNhanVien');
        const selectSanPham = document.getElementById('selectSanPham');
        const inputSoLuong = document.getElementById('inputSoLuong');
        const btnAddSp = document.querySelector('.btn-add-sp');

        if (!IS_ADMIN) {
            selectKhachHang.disabled = true;
            selectNhanVien.disabled = true;
            selectSanPham.disabled = true;
            inputSoLuong.disabled = true;
            if(txtGhiChu) txtGhiChu.disabled = true;
            if(btnAddSp) btnAddSp.disabled = true;
        } else {
            selectKhachHang.disabled = false;
            selectNhanVien.disabled = false;
            selectSanPham.disabled = false;
            inputSoLuong.disabled = false;
            if(txtGhiChu) txtGhiChu.disabled = false;
            if(btnAddSp) btnAddSp.disabled = false;
        }

        renderGioHang();

        document.getElementById('createModal').style.display = 'flex';
    } catch (error) {
        console.error('Lỗi mở form sửa hóa đơn:', error);
        alert('Không thể tải hóa đơn để sửa!');
    }
}

// ==========================================
// 5c. HỦY HÓA ĐƠN (SOFT DELETE) - hoàn lại tồn kho
// ==========================================
async function huyHoaDon(maHD) {
    if (!IS_ADMIN) {
        alert('Chỉ Quản trị viên mới có quyền hủy hóa đơn!');
        return;
    }

    const xacNhan = confirm(`Bạn có chắc chắn muốn hủy hóa đơn ${maHD}? Tồn kho sản phẩm sẽ được hoàn lại.`);
    if (!xacNhan) return;

    try {
        const res = await fetch(`${API_HOA_DON}/huy/${maHD}`, { 
            method: 'PUT',
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (res.ok) {
            alert('Hủy hóa đơn thành công!');
            taiDanhSachHoaDon();
        } else {
            alert(data.message || 'Lỗi khi hủy hóa đơn');
        }
    } catch (error) {
        console.error('Lỗi hủy hóa đơn:', error);
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

    const dongDaCo = gioHangHD.find(item => item.maSP === maSP);
    const tongSauKhiThem = (dongDaCo ? dongDaCo.soLuong : 0) + soLuong;

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

    selectSP.value = '';
    inputSL.value = 1;
}

function xoaSanPhamKhoiHD(maSP) {
    if(isEditMode && !IS_ADMIN) return;
    gioHangHD = gioHangHD.filter(item => item.maSP !== maSP);
    renderGioHang();
}

function suaSoLuongTrongHD(maSP, giaTriMoi) {
    const item = gioHangHD.find(sp => sp.maSP === maSP);
    if (!item) return;

    let soLuongMoi = parseInt(giaTriMoi, 10);
    if (!soLuongMoi || soLuongMoi <= 0) {
        alert('Số lượng phải lớn hơn 0!');
        renderGioHang();
        return;
    }

    const sanPham = dsSanPhamCache.find(sp => sp.maSP === maSP);
    if (!isEditMode && sanPham && sanPham.soLuongTon != null && soLuongMoi > sanPham.soLuongTon) {
        alert(`Sản phẩm "${item.tenSP}" chỉ còn ${sanPham.soLuongTon} trong kho!`);
        soLuongMoi = sanPham.soLuongTon;
    }

    item.soLuong = soLuongMoi;
    renderGioHang();
}

function renderGioHang() {
    const tbody = document.getElementById('bangChiTietHD');
    tbody.innerHTML = '';

    const isLockCart = isEditMode && !IS_ADMIN;

    if (gioHangHD.length === 0) {
        tbody.innerHTML = '<tr id="hangTrongHD"><td colspan="5" style="text-align:center; color:#999;">Chưa có sản phẩm nào</td></tr>';
    } else {
        gioHangHD.forEach(item => {
            const thanhTien = item.soLuong * item.donGia;
            
            const qtyHtml = isLockCart 
                ? item.soLuong 
                : `<input type="number" class="qty-edit-input" min="1" value="${item.soLuong}" onchange="suaSoLuongTrongHD('${item.maSP}', this.value)">`;
            
            const actionHtml = isLockCart 
                ? '' 
                : `<button type="button" class="btn-action delete" onclick="xoaSanPhamKhoiHD('${item.maSP}')"><i class="fas fa-trash"></i></button>`;

            tbody.innerHTML += `
                <tr>
                    <td>${item.tenSP}</td>
                    <td>${qtyHtml}</td>
                    <td>${item.donGia.toLocaleString('vi-VN')}</td>
                    <td>${thanhTien.toLocaleString('vi-VN')}</td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        });
    }

    const tongTien = gioHangHD.reduce((tong, item) => tong + item.soLuong * item.donGia, 0);
    document.getElementById('tongTienTamTinh').innerText = dinhDangTien(tongTien);
}

// ==========================================
// 7. GỬI DỮ LIỆU TẠO HÓA ĐƠN MỚI (POST) / SỬA (PUT)
// ==========================================
document.getElementById('createHdForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const maKhachHang = document.getElementById('selectKhachHang').value;
    const maNVChon = document.getElementById('selectNhanVien').value;

    if (!maKhachHang) {
    alert('Vui lòng chọn khách hàng!');
    return;
    }
    if (!maNVChon && IS_ADMIN) {
        alert('Vui lòng chọn nhân viên lập hóa đơn!');
        return;
    }
    if (gioHangHD.length === 0) {
        alert('Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn!');
        return;
    }
    
    // Lấy nội dung ghi chú từ thẻ textarea
    const txtGhiChu = document.getElementById('inputGhiChu');
    const noiDungGhiChu = txtGhiChu ? txtGhiChu.value : '';

    const payload = {
        maKhachHang: maKhachHang,
        maNV: maNVChon,
        chiTietSanPham: gioHangHD.map(item => ({
            maSP: item.maSP,
            soLuongBan: item.soLuong,
            moTa: noiDungGhiChu // Gán giá trị vào trường MoTa thay vì GiamGia
        })),
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
            headers: getAuthHeaders(),
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
    
    // SỰ KIỆN: Tự động điền địa chỉ vào ghi chú khi chọn khách hàng
    const selectKhachHang = document.getElementById('selectKhachHang');
    if (selectKhachHang) {
        selectKhachHang.addEventListener('change', function () {
            const maKhachHangChon = this.value;
            const txtGhiChu = document.getElementById('inputGhiChu');
            
            if (maKhachHangChon && txtGhiChu) {
                // Tìm khách hàng trong cache
                const khachHang = dsKhachHangCache.find(kh => kh.maKhachHang === maKhachHangChon);
                if (khachHang && khachHang.diaChiKhachHang) {
                    txtGhiChu.value = khachHang.diaChiKhachHang;
                } else {
                    txtGhiChu.value = ''; // Nếu không có địa chỉ thì xóa trống
                }
            } else if (!maKhachHangChon && txtGhiChu) {
                txtGhiChu.value = ''; // Nếu bỏ chọn khách hàng thì xóa trống
            }
        });
    }
});