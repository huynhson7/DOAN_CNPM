// ==========================================
// 1. CẤU HÌNH API
// ==========================================
const API_BASE = "http://localhost:5129/api";
const API_SAN_PHAM = `${API_BASE}/san-pham`;
const API_NHOM_SP = `${API_BASE}/nhom-san-pham`;
const API_MUC_DICH = `${API_BASE}/muc-dich-su-dung`;
const API_VAT_LIEU = `${API_BASE}/vat-lieu`;
const API_NHA_CUNG_CAP = `${API_BASE}/nha-cung-cap`;

// ==========================================
// 2. LOGIC PHÂN QUYỀN (ROLE-BASED UI)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    // ----------------------------------------------------
    // GIẢ LẬP ĐĂNG NHẬP (Để test)
    // Bạn đổi 'admin' thành 'nhanvien' ở dưới để test việc menu bị ẩn
    // ----------------------------------------------------
    if (!localStorage.getItem('userRole')) {
        localStorage.setItem('userRole', 'admin'); 
    }
    
    const userRole = localStorage.getItem('userRole');
    
    const menuAdminSanPham = document.getElementById('menu-admin-sanpham');
    const menuAdminNhom = document.getElementById('menu-admin-nhom');
    
    // Nếu KHÔNG PHẢI là admin thì ẩn các chức năng quản trị
    if (userRole !== 'admin') {
        if (menuAdminSanPham) menuAdminSanPham.style.display = 'none';
        if (menuAdminNhom) menuAdminNhom.style.display = 'none';
        
        // Đá người dùng về trang cửa hàng nếu cố tình truy cập trang quản trị
        if (window.location.pathname.includes('admin_sanpham.html') || window.location.pathname.includes('quantri.html')) {
            alert("Bạn không có quyền truy cập trang quản trị này!");
            window.location.href = 'sanpham.html';
        }
    }
});

// ==========================================
// 3. LOAD DANH MỤC ĐỔ VÀO SELECT (GET)
// ==========================================
async function loadDropdownData() {
    try {
        const [resNhom, resMD, resVL, resNCC] = await Promise.all([
            fetch(API_NHOM_SP), fetch(API_MUC_DICH), fetch(API_VAT_LIEU), fetch(API_NHA_CUNG_CAP)
        ]);

        const [nhomSP, mucDich, vatLieu, ncc] = await Promise.all([
            resNhom.json(), resMD.json(), resVL.json(), resNCC.json()
        ]);

        let nhomHtml = '<option value="">-- Chọn Nhóm Sản Phẩm --</option>';
        nhomSP.forEach(n => nhomHtml += `<option value="${n.maNhomSP}">${n.tenNhomSP}</option>`);
        const domNhomSP = document.getElementById('maNhomSP');
        if (domNhomSP) domNhomSP.innerHTML = nhomHtml;

        let mdHtml = '<option value="">-- Chọn Mục Đích Sử Dụng --</option>';
        mucDich.forEach(m => mdHtml += `<option value="${m.maMD}">${m.tenMD}</option>`);
        const domMD = document.getElementById('maMD');
        if (domMD) domMD.innerHTML = mdHtml;

        let vlHtml = '';
        vatLieu.forEach(v => vlHtml += `<option value="${v.maVL}">${v.tenVL}</option>`);
        const domVatLieu = document.getElementById('maVatLieu');
        if (domVatLieu) domVatLieu.innerHTML = vlHtml;

        let nccHtml = '';
        ncc.forEach(c => nccHtml += `<option value="${c.maNcc}">${c.tenNcc}</option>`);
        const domNCC = document.getElementById('maNCC');
        if (domNCC) domNCC.innerHTML = nccHtml;

    } catch (error) {
        console.error("Lỗi:", error);
        // Tạm thời comment cảnh báo để không phiền khi Ninh chưa bật backend
        // alert("Không thể tải danh mục hệ thống. Vui lòng kiểm tra lại Backend!");
    }
}

document.addEventListener("DOMContentLoaded", loadDropdownData);

// ==========================================
// 4. XỬ LÝ SUBMIT THÊM SẢN PHẨM (POST)
// ==========================================
const formSanPham = document.getElementById('spForm');

if (formSanPham) {
    formSanPham.addEventListener('submit', async function(event) {
        event.preventDefault();

        const selectedVatLieu = Array.from(document.getElementById('maVatLieu').selectedOptions).map(opt => opt.value);
        const selectedNcc = Array.from(document.getElementById('maNCC').selectedOptions).map(opt => opt.value);

        if (selectedVatLieu.length === 0 || selectedNcc.length === 0) {
            alert("Vui lòng chọn ít nhất 1 Vật Liệu và 1 Nhà Cung Cấp!");
            return;
        }

        const payload = {
            maSP: document.getElementById('maSP').value.trim(),
            maMD: document.getElementById('maMD').value,
            maNhomSP: document.getElementById('maNhomSP').value,
            tenSP: document.getElementById('tenSP').value.trim(),
            donViTinh: document.getElementById('donViTinh').value.trim(),
            soLuongTon: parseInt(document.getElementById('soLuongTon').value) || 0,
            giaBan: parseFloat(document.getElementById('giaBan').value) || 0,
            moTa: document.getElementById('moTa').value.trim(),
            hinhAnh: document.getElementById('hinhAnh').value.trim(),
            trangThai: parseInt(document.getElementById('trangThai').value),
            danhSachVatLieu: selectedVatLieu,
            danhSachNhaCungCap: selectedNcc
        };

        const btnLuu = document.querySelector('button[form="spForm"]');

        try {
            btnLuu.disabled = true;
            btnLuu.innerText = "Đang xử lý...";

            const response = await fetch(API_SAN_PHAM, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 409) {
                const errorData = await response.json();
                alert(errorData.message || "Mã sản phẩm đã tồn tại!");
                return;
            }

            if (response.ok) {
                alert("Thêm Sản Phẩm thành công!");
                formSanPham.reset();
                if (typeof closeSpModal === 'function') closeSpModal();
            } else {
                alert("Lỗi khi lưu dữ liệu sản phẩm!");
            }

        } catch (error) {
            alert("Không thể kết nối đến máy chủ. Vui lòng thử lại sau!");
        } finally {
            btnLuu.disabled = false;
            btnLuu.innerText = "Lưu Sản Phẩm";
        }
    });
}

// ==========================================
// 5. TÌM KIẾM NHANH (Quét toàn bộ trường)
// ==========================================
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keyup', function() {
        const keyword = this.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#bangDuLieu tr');
        
        rows.forEach(row => {
            const rowData = row.textContent.toLowerCase();
            if (rowData.includes(keyword)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}