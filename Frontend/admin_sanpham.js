// ==========================================
// 1. CẤU HÌNH API & BIẾN TOÀN CỤC
// ==========================================
const API_BASE = "http://localhost:5129/api";
const API_SAN_PHAM = `${API_BASE}/san-pham`;
const API_NHOM_SP = `${API_BASE}/nhom-san-pham`;
const API_MUC_DICH = `${API_BASE}/muc-dich-su-dung`;
const API_VAT_LIEU = `${API_BASE}/vat-lieu`;
const API_NHA_CUNG_CAP = `${API_BASE}/nha-cung-cap`;

let mapNhomSP = {};
let mapMucDich = {};

// Hai biến này dùng để kiểm soát trạng thái khi Thêm hoặc Sửa
let isEditMode = false; 
let currentImageUrl = "";

// ==========================================
// 2. LOGIC PHÂN QUYỀN (ROLE-BASED UI)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    if (!localStorage.getItem('userRole')) {
        localStorage.setItem('userRole', 'admin'); 
    }
    
    const userRole = localStorage.getItem('userRole');
    const menuAdminSanPham = document.getElementById('menu-admin-sanpham');
    const menuAdminNhom = document.getElementById('menu-admin-nhom');
    
    if (userRole !== 'admin') {
        if (menuAdminSanPham) menuAdminSanPham.style.display = 'none';
        if (menuAdminNhom) menuAdminNhom.style.display = 'none';
        
        if (window.location.pathname.includes('admin_sanpham.html') || window.location.pathname.includes('quantri.html')) {
            alert("Bạn không có quyền truy cập trang quản trị này!");
            window.location.href = 'sanpham.html';
        }
    }
    
    loadDropdownData().then(() => {
        loadProducts();
    });
    
    setupPriceFormatting();
});

// ==========================================
// 3. ĐỊNH DẠNG DẤU CHẤM CHO GIÁ TIỀN
// ==========================================
function setupPriceFormatting() {
    const giaBanInput = document.getElementById('giaBan');
    if (!giaBanInput) return;

    giaBanInput.addEventListener('input', function (e) {
        let value = this.value.replace(/\D/g, "");
        if (value) {
            this.value = Number(value).toLocaleString('vi-VN');
        } else {
            this.value = "";
        }
    });
}

// ==========================================
// 4. LOAD DANH MỤC & LƯU BẢN ÁNH XẠ (MAP TÊN)
// ==========================================
async function loadDropdownData() {
    try {
        const [resNhom, resMD, resVL, resNCC] = await Promise.all([
            fetch(API_NHOM_SP), fetch(API_MUC_DICH), fetch(API_VAT_LIEU), fetch(API_NHA_CUNG_CAP)
        ]);

        const [nhomSP, mucDich, vatLieu, ncc] = await Promise.all([
            resNhom.json(), resMD.json(), resVL.json(), resNCC.json()
        ]);

        nhomSP.forEach(n => {
            const ma = n.maNhomSP || n.MaNhomSP;
            const ten = n.tenNhomSP || n.TenNhomSP;
            mapNhomSP[ma] = ten;
        });

        mucDich.forEach(m => {
            const ma = m.maMD || m.MaMD;
            const ten = m.tenMD || m.TenMD;
            mapMucDich[ma] = ten;
        });

        let nhomHtml = '<option value="">-- Chọn Nhóm Sản Phẩm --</option>';
        nhomSP.forEach(n => {
            nhomHtml += `<option value="${n.maNhomSP || n.MaNhomSP}">${n.tenNhomSP || n.TenNhomSP}</option>`;
        });
        const domNhomSP = document.getElementById('maNhomSP');
        if (domNhomSP) domNhomSP.innerHTML = nhomHtml;

        let mdHtml = '<option value="">-- Chọn Mục Đích Sử Dụng --</option>';
        mucDich.forEach(m => {
            mdHtml += `<option value="${m.maMD || m.MaMD}">${m.tenMD || m.TenMD}</option>`;
        });
        const domMD = document.getElementById('maMD');
        if (domMD) domMD.innerHTML = mdHtml;

        let vlHtml = '';
        vatLieu.forEach(v => {
            vlHtml += `<option value="${v.maVL || v.MaVL}">${v.tenVL || v.TenVL}</option>`;
        });
        const domVatLieu = document.getElementById('maVatLieu');
        if (domVatLieu) domVatLieu.innerHTML = vlHtml;

        let nccHtml = '';
        ncc.forEach(c => {
            nccHtml += `<option value="${c.maNcc || c.MaNcc}">${c.tenNcc || c.TenNcc}</option>`;
        });
        const domNCC = document.getElementById('maNCC');
        if (domNCC) domNCC.innerHTML = nccHtml;

    } catch (error) {
        console.error("Lỗi load danh mục:", error);
    }
}

// ==========================================
// 5. LOAD DANH SÁCH SẢN PHẨM RA BẢNG (Cache Busting)
// ==========================================
async function loadProducts() {
    try {
        const timestamp = new Date().getTime();
        const url = `${API_SAN_PHAM}?t=${timestamp}`;
        const response = await fetch(url, { 
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm.");
        
        const products = await response.json();
        const tbody = document.getElementById('bangDuLieu');
        if (!tbody) return;

        const dataCard = document.querySelector('.data-card');
        if (dataCard) {
            dataCard.style.overflowX = 'auto'; 
        }

        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #757575; padding: 20px;">Chưa có sản phẩm nào trong cơ sở dữ liệu.</td></tr>`;
            return;
        }

        let html = '';
        products.forEach(p => {
            const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.giaBan || p.GiaBan || 0);
            const trangThaiVal = p.trangThai !== undefined ? p.trangThai : p.TrangThai;
            const statusBadge = trangThaiVal === 1 
                ? '<span class="badge badge-active" style="white-space: nowrap;">Đang bán</span>' 
                : '<span class="badge badge-inactive" style="white-space: nowrap;">Ngừng kinh</span>';
            
            const hinhAnhVal = p.hinhAnh || p.HinhAnh;
            
            const imageDisplay = hinhAnhVal 
                ? `<img src="${hinhAnhVal}" alt="Ảnh SP" style="width: 110px; height: 110px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">` 
                : '<i class="fas fa-image" style="color:#ccc; font-size:36px;"></i>';

            const maMDVal = p.maMD || p.MaMD || '';
            const tenMDDisplay = mapMucDich[maMDVal] || maMDVal;

            const maNhomVal = p.maNhomSP || p.MaNhomSP || '';
            const tenNhomDisplay = mapNhomSP[maNhomVal] || maNhomVal;

            const maSPVal = p.maSP || p.MaSP || '';
            const tenSPVal = p.tenSP || p.TenSP || '';
            const donViVal = p.donViTinh || p.DonViTinh || '';
            const soLuongVal = p.soLuongTon !== undefined ? p.soLuongTon : (p.SoLuongTon || 0);
            const moTaVal = p.moTa || p.MoTa || '';

            html += `
                <tr>
                    <td style="white-space: nowrap;"><strong>${maSPVal}</strong></td>
                    <td style="white-space: normal; min-width: 120px;">${tenMDDisplay}</td>
                    <td style="white-space: normal; min-width: 120px;">${tenNhomDisplay}</td>
                    <td style="text-align: center;">${imageDisplay}</td>
                    <td style="white-space: normal; min-width: 180px;"><strong>${tenSPVal}</strong></td>
                    <td style="white-space: nowrap;">${donViVal}</td>
                    <td style="text-align: center;">${soLuongVal}</td>
                    <td style="white-space: nowrap; font-weight: 500; color: #d32f2f;">${formattedPrice}</td>
                    <td style="white-space: normal; min-width: 250px; word-wrap: break-word;">${moTaVal}</td>
                    <td>${statusBadge}</td>
                    <td style="white-space: nowrap; min-width: 90px;">
                        <button class="btn-action edit" title="Sửa" onclick="editProduct('${maSPVal}')"><i class="fas fa-pen"></i></button>
                        <button class="btn-action delete" title="Xóa" onclick="deleteProduct('${maSPVal}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        const thead = document.querySelector('.data-table thead tr');
        if (thead) {
            thead.style.whiteSpace = 'nowrap';
            thead.innerHTML = `
                <th>Mã SP</th>
                <th>Mục Đích Sử Dụng</th>
                <th>Nhóm Sản Phẩm</th>
                <th style="text-align: center;">Hình Ảnh</th>
                <th>Tên Sản Phẩm</th>
                <th>Đơn Vị Tính</th>
                <th>Tồn Kho</th>
                <th>Giá Bán</th>
                <th>Mô Tả</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
            `;
        }

        tbody.innerHTML = html;
    } catch (error) {
        console.error("Lỗi load sản phẩm:", error);
    }
}

// ==========================================
// 6. XỬ LÝ SUBMIT (HỖ TRỢ CẢ THÊM VÀ SỬA)
// ==========================================
const formSanPham = document.getElementById('spForm');

if (formSanPham) {
    // Sự kiện reset form (khôi phục về trạng thái Thêm Mới)
    formSanPham.addEventListener('reset', function() {
        isEditMode = false;
        currentImageUrl = "";
        
        const txtMaSP = document.getElementById('maSP');
        if (txtMaSP) {
            txtMaSP.readOnly = false;
            txtMaSP.style.backgroundColor = "";
        }
        
        const btnLuu = document.querySelector('button[form="spForm"]');
        if (btnLuu) btnLuu.innerText = "Lưu Sản Phẩm";
    });

    formSanPham.addEventListener('submit', async function(event) {
        event.preventDefault();

        const selectedVatLieu = Array.from(document.getElementById('maVatLieu').selectedOptions).map(opt => opt.value);
        const selectedNcc = Array.from(document.getElementById('maNCC').selectedOptions).map(opt => opt.value);

        if (selectedVatLieu.length === 0 || selectedNcc.length === 0) {
            alert("Vui lòng chọn ít nhất 1 Vật Liệu và 1 Nhà Cung Cấp!");
            return;
        }

        const btnLuu = document.querySelector('button[form="spForm"]');
        if (btnLuu) {
            btnLuu.disabled = true;
            btnLuu.innerText = "Đang xử lý...";
        }

        try {
            // 1. XỬ LÝ UPLOAD ẢNH
            const inputFile = document.getElementById('hinhAnhFile');
            let hinhAnhUrl = currentImageUrl; // Mặc định dùng ảnh cũ nếu đang sửa

            // Nếu người dùng có chọn ảnh mới thì mới upload
            if (inputFile && inputFile.files.length > 0) {
                if (btnLuu) btnLuu.innerText = "Đang tải ảnh lên...";
                
                const formData = new FormData();
                formData.append("file", inputFile.files[0]);

                const uploadRes = await fetch(`${API_SAN_PHAM}/upload-image`, {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    hinhAnhUrl = uploadData.url; 
                } else {
                    alert("Lỗi khi tải ảnh lên máy chủ!");
                    if (btnLuu) {
                        btnLuu.disabled = false;
                        btnLuu.innerText = isEditMode ? "Cập Nhật Sản Phẩm" : "Lưu Sản Phẩm";
                    }
                    return;
                }
            }

            // 2. GỬI DATA SẢN PHẨM VỀ C#
            const rawGiaBan = document.getElementById('giaBan').value.replace(/\./g, "");
            
            const payload = {
                SanPham: {
                    MaSP: document.getElementById('maSP').value.trim(),
                    MaMD: document.getElementById('maMD').value,
                    MaNhomSP: document.getElementById('maNhomSP').value,
                    TenSP: document.getElementById('tenSP').value.trim(),
                    DonViTinh: document.getElementById('donViTinh').value.trim(),
                    SoLuongTon: parseInt(document.getElementById('soLuongTon').value) || 0,
                    GiaBan: parseFloat(rawGiaBan) || 0,
                    MoTa: document.getElementById('moTa').value.trim(),
                    HinhAnh: hinhAnhUrl, 
                    TrangThai: parseInt(document.getElementById('trangThai').value)
                },
                MaVatLieus: selectedVatLieu,
                MaNhaCungCaps: selectedNcc
            };

            // Xác định gọi API POST (Thêm) hay PUT (Sửa)
            const apiUrl = isEditMode ? `${API_SAN_PHAM}/${payload.SanPham.MaSP}` : API_SAN_PHAM;
            const apiMethod = isEditMode ? 'PUT' : 'POST';

            if (btnLuu) btnLuu.innerText = "Đang lưu dữ liệu...";

            const response = await fetch(apiUrl, {
                method: apiMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const result = await response.json();
                alert(result.message || "Lỗi khi lưu dữ liệu sản phẩm!");
                return;
            }

            alert(isEditMode ? "Cập nhật Sản Phẩm thành công!" : "Thêm Sản Phẩm thành công!");
            
            // Xóa trắng form và đưa về chế độ mặc định
            formSanPham.reset(); 
            
            if (typeof closeSpModal === 'function') closeSpModal();
            loadProducts();

        } catch (error) {
            console.error("Lỗi:", error);
            alert("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại Backend!");
        } finally {
            if (btnLuu) {
                btnLuu.disabled = false;
                // Text sẽ tự khôi phục do hàm event 'reset' chạy
            }
        }
    });
}

// ==========================================
// 7. XÓA SẢN PHẨM (DELETE)
// ==========================================
async function deleteProduct(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm ${id} không?`)) return;

    try {
        const response = await fetch(`${API_SAN_PHAM}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("Xóa sản phẩm thành công!");
            loadProducts();
        } else {
            const result = await response.json();
            alert(result.message || "Xóa thất bại!");
        }
    } catch (error) {
        console.error("Lỗi xóa:", error);
        alert("Không thể kết nối đến máy chủ để xóa!");
    }
}

// ==========================================
// 8. TÌM KIẾM NHANH TRÊN BẢNG
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

// ==========================================
// ==========================================
// 9. CHỈNH SỬA SẢN PHẨM (ĐỔ DỮ LIỆU LÊN FORM & HIỂN THỊ MODAL)
// ==========================================
async function editProduct(maSP) {
    try {
        const response = await fetch(`${API_SAN_PHAM}/${maSP}`, { cache: 'no-store' });
        if (!response.ok) throw new Error("Không thể lấy thông tin sản phẩm.");
        
        const p = await response.json();
        
        // Bật chế độ sửa và lưu URL ảnh cũ
        isEditMode = true;
        currentImageUrl = p.hinhAnh || p.HinhAnh || "";

        // Đổ dữ liệu vào các input
        const txtMaSP = document.getElementById('maSP');
        if (txtMaSP) {
            txtMaSP.value = p.maSP || p.MaSP;
            txtMaSP.readOnly = true; // Khóa không cho sửa Mã
            txtMaSP.style.backgroundColor = "#e9ecef"; 
        }

        document.getElementById('tenSP').value = p.tenSP || p.TenSP;
        document.getElementById('maNhomSP').value = p.maNhomSP || p.MaNhomSP;
        document.getElementById('maMD').value = p.maMD || p.MaMD;
        document.getElementById('donViTinh').value = p.donViTinh || p.DonViTinh;
        document.getElementById('soLuongTon').value = p.soLuongTon !== undefined ? p.soLuongTon : (p.SoLuongTon || 0);
        
        const gia = p.giaBan || p.GiaBan || 0;
        document.getElementById('giaBan').value = Number(gia).toLocaleString('vi-VN');
        
        document.getElementById('moTa').value = p.moTa || p.MoTa || '';
        document.getElementById('trangThai').value = p.trangThai !== undefined ? p.trangThai : p.TrangThai;
        
        // Đổi chữ trên nút Submit
        const btnLuu = document.querySelector('button[form="spForm"]');
        if (btnLuu) btnLuu.innerText = "Cập Nhật Thay Đổi";
        
        // MỞ FORM / MODAL LÊN
        // Nếu bạn có hàm mở modal, nó sẽ chạy ở đây
        if (typeof openSpModal === 'function') {
            openSpModal();
        } else {
            // Trường hợp bạn quản lý hiển thị bằng class/style (như display: block)
            const modal = document.getElementById('spModal'); // Thay bằng ID thẻ form/modal của bạn nếu cần
            if (modal) {
                modal.style.display = 'block'; // Hoặc 'flex' tùy CSS của bạn
            }
        }

    } catch (error) {
        console.error("Lỗi edit:", error);
        alert("Lỗi khi tải dữ liệu sản phẩm để sửa!");
    }
}