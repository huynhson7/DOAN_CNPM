// ==========================================
// 1. CẤU HÌNH API & BIẾN TOÀN CỤC
// ==========================================
const API_BASE = "http://localhost:5129/api";
const API_SAN_PHAM = `${API_BASE}/san-pham`;
const API_NHOM_SP = `${API_BASE}/nhom-san-pham`;
const API_MUC_DICH = `${API_BASE}/muc-dich-su-dung`;
const API_VAT_LIEU = `${API_BASE}/vat-lieu`;

const API_NHA_CUNG_CAP_URLS = [
    `${API_BASE}/nha-cung-cap`,
    `${API_BASE}/nhacungcap`,
    `${API_BASE}/NhaCungCap`
];

let mapNhomSP = {};
let mapMucDich = {};
let mapVatLieu = {};
let mapNhaCungCap = {};

let isEditMode = false; 
let currentImageUrl = "";

// [PHÂN TRANG] Lưu toàn bộ sản phẩm tải được từ API + trang hiện tại đang xem.
// Cứ 20 sản phẩm sẽ gom thành 1 trang, các sản phẩm còn lại sẽ nằm ở (các)
// trang tiếp theo, đồng bộ cách làm với phân trang ở trang sanpham.html.
let allAdminProducts = [];
let adminCurrentPage = 1;
const ADMIN_PRODUCTS_PER_PAGE = 20;
// [CLOUDINARY] PublicId của ảnh MỚI vừa upload (nếu người dùng chọn ảnh mới trong lần
// submit này). PublicId của ảnh CŨ không cần Frontend biết/gửi lên - Backend tự đọc từ CSDL.
let newUploadedPublicId = "";

// ==========================================
// ẢNH MẶC ĐỊNH (KHÔNG PHỤ THUỘC DỊCH VỤ NGOÀI - via.placeholder.com đã ngừng
// hoạt động nên nếu ảnh lỗi vĩnh viễn sẽ luôn hiển thị icon vỡ). Dùng SVG
// nội bộ (data URI) để luôn hiển thị được kể cả khi mất mạng.
// ==========================================
const NO_IMAGE_SVG = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>
        <rect width='100%' height='100%' fill='#f0f0f0'/>
        <text x='50%' y='50%' font-family='Arial, sans-serif' font-size='16' fill='#9e9e9e' text-anchor='middle' dominant-baseline='middle'>No Image</text>
    </svg>`
);

// ==========================================
// TỰ ĐỘNG THỬ TẢI LẠI ẢNH (fix lỗi phải F5 mới thấy ảnh vừa upload).
// Khi <img> báo lỗi (onerror), thay vì rơi ngay về ảnh mặc định, hàm này sẽ
// thử tải lại chính ảnh đó (kèm tham số chống cache) vài lần với độ trễ tăng
// dần trước khi mới chịu thua và hiển thị ảnh mặc định. Điều này giả lập
// đúng những gì việc "F5 lại trang" từng làm được, nhưng tự động, không cần
// người dùng phải bấm tải lại trang.
// ==========================================
function handleProductImgError(imgEl) {
    const attempt = parseInt(imgEl.dataset.retryAttempt || "0", 10);
    const originalSrc = imgEl.dataset.originalSrc || imgEl.src.split('&__retry=')[0].split('?__retry=')[0];
    imgEl.dataset.originalSrc = originalSrc;

    const MAX_RETRY = 3;
    if (attempt < MAX_RETRY) {
        const nextAttempt = attempt + 1;
        imgEl.dataset.retryAttempt = nextAttempt;
        const delay = nextAttempt * 600; // 600ms, 1200ms, 1800ms
        setTimeout(() => {
            const sep = originalSrc.includes('?') ? '&' : '?';
            imgEl.src = `${originalSrc}${sep}__retry=${nextAttempt}_${Date.now()}`;
        }, delay);
    } else {
        imgEl.onerror = null;
        imgEl.src = NO_IMAGE_SVG;
    }
}

// ==========================================
// ĐỒNG BỘ REAL-TIME GIỮA CÁC TAB/TRANG (admin_sanpham.html <-> sanpham.html)
// Dùng sự kiện "storage" của trình duyệt: khi tab này ghi vào localStorage,
// mọi tab khác đang mở cùng origin (kể cả sanpham.html) sẽ nhận được sự kiện
// "storage" và có thể tự tải lại danh sách sản phẩm - không cần F5.
// ==========================================
function notifyProductsChanged() {
    try {
        localStorage.setItem('luxuryProductsUpdatedAt', Date.now().toString());
    } catch (e) {
        console.warn('Không thể phát tín hiệu đồng bộ sản phẩm:', e);
    }
}

// ==========================================
// HÀM TIỆN ÍCH: Đọc lỗi trả về từ Backend an toàn
// ==========================================
async function getErrorMessage(response, fallbackMessage) {
    let serverMessage = "";
    try {
        const text = await response.text();
        if (text) {
            try {
                const json = JSON.parse(text);
                serverMessage = json.message || json.title || "";
            } catch {
                serverMessage = "";
            }
        }
    } catch {
        // Bỏ qua lỗi đọc luồng mạng
    }

    if (response.status === 401) {
        return serverMessage || "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!";
    }
    if (response.status === 403) {
        return serverMessage || "Tài khoản của bạn không có quyền thực hiện thao tác này!";
    }
    if (response.status >= 500) {
        return serverMessage || "Lỗi phía máy chủ (Server Error). Vui lòng kiểm tra log Backend!";
    }
    return serverMessage || fallbackMessage;
}

// ==========================================
// 2. LOGIC PHÂN QUYỀN (ROLE-BASED UI)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const userRole = localStorage.getItem('userRole') || '';
    const isAdmin = userRole === 'Quản trị Hệ thống';
    const isStaff = userRole === 'NV Bán Hàng';
    const isAllowed = isAdmin || isStaff; // Khách hàng (hoặc chưa đăng nhập) KHÔNG được vào trang này

    const menuAdminSanPham = document.getElementById('menu-admin-sanpham');
    const menuAdminNhom = document.getElementById('menu-admin-nhom');

    if (!isAllowed) {
        if (menuAdminSanPham) menuAdminSanPham.style.display = 'none';
        if (menuAdminNhom) menuAdminNhom.style.display = 'none';

        if (window.location.pathname.includes('admin_sanpham.html') || window.location.pathname.includes('quantri.html')) {
            alert("Bạn không có quyền truy cập trang quản trị này! Vui lòng đăng nhập bằng tài khoản Quản trị viên hoặc Nhân viên.");
            window.location.href = 'login.html';
            return;
        }
    }

    // ==========================================
    // PHÂN QUYỀN GIAO DIỆN THEO ROLE (SANPHAM - admin_sanpham.html)
    // - Quản trị Hệ thống: Toàn quyền thêm, sửa, xóa, đổi GiaBan, đổi TrangThai.
    // - NV Bán Hàng: Xem toàn bộ, chỉ được cập nhật SoLuongTon, MoTa, HinhAnh.
    //   Không được thêm sản phẩm, không được xóa, không được tự đổi GiaBan.
    //   (Backend cũng chặn lại việc này ở SanPhamController - đây chỉ là UI).
    // ==========================================
    applyProductPermissionUI(isAdmin);

    loadDropdownData().then(() => {
        loadProducts();
    });
    
    setupPriceFormatting();
});

function applyProductPermissionUI(isAdmin) {
    window.__isAdminSanPham = isAdmin; // dùng lại khi render bảng (ẩn nút Xóa)

    if (isAdmin) return; // Admin: giữ nguyên toàn quyền, không khóa gì cả

    const btnAdd = document.querySelector('.btn-add[onclick="openSpModal()"]');
    if (btnAdd) btnAdd.style.display = 'none';

    // Nhân viên: chỉ được cập nhật SoLuongTon, MoTa, HinhAnh.
    // Mọi trường khác trong form đều bị khóa (chỉ đọc / vô hiệu hóa).
    const lockedInputIds = ['tenSP', 'donViTinh', 'giaBan'];
    lockedInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.readOnly = true;
        el.style.backgroundColor = '#e9ecef';
        el.title = 'Chỉ Quản trị viên mới được thay đổi trường này.';
    });

    const lockedSelectIds = ['maNhomSP', 'maMD', 'trangThai', 'maVatLieu', 'maNCC'];
    lockedSelectIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = true;
        el.style.backgroundColor = '#e9ecef';
        el.title = 'Chỉ Quản trị viên mới được thay đổi trường này.';
    });
}

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
// 4. LOAD DANH MỤC "BỌC THÉP" 
// ==========================================
async function loadDropdownData() {
    async function fetchSafe(urls) {
        const urlArray = Array.isArray(urls) ? urls : [urls];
        // [SỬA] Đính kèm Token đăng nhập (Authorization: Bearer ...) vào mọi request tải
        // danh mục dropdown. Trước đây các API này (đặc biệt Nhà Cung Cấp) không cần Token,
        // nhưng sau khi sửa lại đúng phân quyền (chỉ Admin/Nhân viên được xem Nhà Cung Cấp),
        // nếu không gửi Token thì Backend trả 401 -> danh sách rỗng ("-- Trống --").
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        for (let url of urlArray) {
            try {
                const res = await fetch(url, { headers });
                if (res.ok) {
                    return await res.json();
                }
            } catch (err) {}
        }
        return [];
    }

    function getSafeValue(obj, possibleKeys) {
        const lowerKeys = possibleKeys.map(k => k.toLowerCase());
        for (let key in obj) {
            if (lowerKeys.includes(key.toLowerCase())) {
                return obj[key];
            }
        }
        return "";
    }

    const [nhomSP, mucDich, vatLieu, ncc] = await Promise.all([
        fetchSafe(API_NHOM_SP),
        fetchSafe(API_MUC_DICH),
        fetchSafe(API_VAT_LIEU),
        fetchSafe(API_NHA_CUNG_CAP_URLS)
    ]);

    let nhomHtml = '<option value="">-- Chọn Nhóm Sản Phẩm --</option>';
    nhomSP.forEach(n => {
        const ma = getSafeValue(n, ['maNhomSP', 'maNhom']).toString().trim();
        const ten = getSafeValue(n, ['tenNhomSP', 'tenNhom']).toString().trim();
        if (ma) {
            mapNhomSP[ma] = ten;
            nhomHtml += `<option value="${ma}">${ten}</option>`;
        }
    });
    const domNhom = document.getElementById('maNhomSP');
    if (domNhom) domNhom.innerHTML = nhomHtml;

    let mdHtml = '<option value="">-- Chọn Mục Đích Sử Dụng --</option>';
    mucDich.forEach(m => {
        const ma = getSafeValue(m, ['maMD']).toString().trim();
        const ten = getSafeValue(m, ['tenMD']).toString().trim();
        if (ma) {
            mapMucDich[ma] = ten;
            mdHtml += `<option value="${ma}">${ten}</option>`;
        }
    });
    const domMD = document.getElementById('maMD');
    if (domMD) domMD.innerHTML = mdHtml;

    let vlHtml = '';
    vatLieu.forEach(v => {
        const ma = getSafeValue(v, ['maVL', 'maVatLieu']).toString().trim();
        const ten = getSafeValue(v, ['tenVL', 'tenVatLieu']).toString().trim();
        if (ma) {
            mapVatLieu[ma] = ten;
            vlHtml += `<option value="${ma}">${ten}</option>`;
        }
    });
    const domVL = document.getElementById('maVatLieu');
    if (domVL) domVL.innerHTML = vlHtml || '<option value="">-- Trống --</option>';

    let nccHtml = '';
    ncc.forEach(c => {
        const ma = getSafeValue(c, ['maNcc', 'maNhaCungCap', 'idNcc', 'ma']).toString().trim();
        const ten = getSafeValue(c, ['tenNcc', 'tenNhaCungCap', 'name', 'ten']).toString().trim();
        if (ma) {
            mapNhaCungCap[ma] = ten; 
            nccHtml += `<option value="${ma}">${ten}</option>`;
        }
    });
    const domNCC = document.getElementById('maNCC');
    if (domNCC) domNCC.innerHTML = nccHtml || '<option value="">-- Trống --</option>';
}

// ==========================================
// 5. LOAD DANH SÁCH SẢN PHẨM RA BẢNG
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

        // Lưu lại toàn bộ sản phẩm để phục vụ phân trang (20 sản phẩm/trang) và tìm kiếm.
        allAdminProducts = products;

        const thead = document.querySelector('.data-table thead tr');
        if (thead) {
            thead.style.whiteSpace = 'nowrap';
            thead.innerHTML = `
                <th>Mã SP</th>
                <th>Vật Liệu</th>
                <th>Mục Đích Sử Dụng</th>
                <th>Nhà Cung Cấp</th>
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

        renderAdminProductsPage(allAdminProducts, 1);
    } catch (error) {
        console.error("Lỗi load sản phẩm:", error);
    }
}

// [PHÂN TRANG] Dựng HTML cho 1 dòng sản phẩm (tách riêng từ vòng lặp cũ để
// có thể tái sử dụng khi chỉ hiển thị 20 sản phẩm của trang hiện tại).
function buildProductRowHtml(p) {
            const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.giaBan || p.GiaBan || 0);
            const trangThaiVal = p.trangThai !== undefined ? p.trangThai : p.TrangThai;
            const statusBadge = trangThaiVal === 1 
                ? '<span class="badge badge-active" style="white-space: nowrap;">Đang bán</span>' 
                : '<span class="badge badge-inactive" style="white-space: nowrap;">Ngừng kinh doanh</span>';
            
            // Ảnh Cloudinary (HinhAnh) đã là URL tuyệt đối (https://res.cloudinary.com/...)
            // nên hiển thị trực tiếp, không cần ghép domain. Nhánh startsWith('/') dưới đây
            // CHỈ còn là fallback cho các sản phẩm CŨ chưa chạy migrate lên Cloudinary
            // (HinhAnh vẫn là đường dẫn local kiểu "/images/xxx.jpg").
            const hinhAnhVal = p.hinhAnh || p.HinhAnh;
            let imageDisplay = '<i class="fas fa-image" style="color:#ccc; font-size:36px;"></i>';
            if (hinhAnhVal) {
                let finalImgUrl = hinhAnhVal;
                if (hinhAnhVal.startsWith('/')) {
                    finalImgUrl = `${new URL(API_BASE).origin}${hinhAnhVal}`;
                }
                imageDisplay = `<img src="${finalImgUrl}" alt="Ảnh SP" style="width: 110px; height: 110px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;" onerror="handleProductImgError(this)">`;
            }

            const maMDVal = (p.maMD || p.MaMD || '').toString().trim();
            const tenMDDisplay = mapMucDich[maMDVal] || maMDVal;

            const maNhomVal = (p.maNhomSP || p.MaNhomSP || '').toString().trim();
            const tenNhomDisplay = mapNhomSP[maNhomVal] || maNhomVal;

            let tenVatLieuList = [];
            const lamNens = p.lamNens || p.LamNens || [];
            if (Array.isArray(lamNens)) {
                lamNens.forEach(ln => {
                    const vlObj = ln.vatLieu || ln.VatLieu;
                    if (vlObj) {
                        const t = vlObj.tenVL || vlObj.TenVL || vlObj.tenVatLieu || vlObj.TenVatLieu;
                        if (t) tenVatLieuList.push(t.trim());
                    } else if (ln.maVL || ln.MaVL) {
                        const ma = (ln.maVL || ln.MaVL).toString().trim();
                        if (mapVatLieu[ma]) tenVatLieuList.push(mapVatLieu[ma]);
                    }
                });
            }
            const strVatLieu = tenVatLieuList.length > 0 ? tenVatLieuList.join(', ') : 'Chưa gán';

            let tenNccList = [];
            const cungCaps = p.cungCaps || p.CungCaps || [];
            if (Array.isArray(cungCaps)) {
                cungCaps.forEach(cc => {
                    const nccObj = cc.nhaCungCap || cc.NhaCungCap;
                    if (nccObj) {
                        const t = nccObj.tenNcc || nccObj.TenNcc || nccObj.tenNCC || nccObj.TenNCC;
                        if (t) tenNccList.push(t.trim());
                    } else if (cc.maNcc || cc.MaNcc || cc.maNCC || cc.MaNCC) {
                        const ma = (cc.maNcc || cc.MaNcc || cc.maNCC || cc.MaNCC).toString().trim();
                        if (mapNhaCungCap[ma]) tenNccList.push(mapNhaCungCap[ma]);
                    }
                });
            }
            const strNhaCungCap = tenNccList.length > 0 ? tenNccList.join(', ') : 'Chưa gán';

            const maSPVal = p.maSP || p.MaSP || '';
            const tenSPVal = p.tenSP || p.TenSP || '';
            const donViVal = p.donViTinh || p.DonViTinh || '';
            const soLuongVal = p.soLuongTon !== undefined ? p.soLuongTon : (p.SoLuongTon || 0);
            const moTaVal = p.moTa || p.MoTa || '';

            const isAdminNow = window.__isAdminSanPham === true;
            const deleteBtnHtml = isAdminNow
                ? `<button class="btn-action delete" title="Xóa" onclick="deleteProduct('${maSPVal}')"><i class="fas fa-trash"></i></button>`
                : '';

            return `
                <tr>
                    <td style="white-space: nowrap;"><strong>${maSPVal}</strong></td>
                    <td style="white-space: normal; min-width: 140px; color: #2e7d32; font-weight: 500;">${strVatLieu}</td>
                    <td style="white-space: normal; min-width: 120px;">${tenMDDisplay}</td>
                    <td style="white-space: normal; min-width: 150px; color: #1565c0; font-weight: 500;">${strNhaCungCap}</td>
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
                        ${deleteBtnHtml}
                    </td>
                </tr>
            `;
}

// [PHÂN TRANG] Cứ 20 sản phẩm gom thành 1 trang; hiển thị đúng 20 sản phẩm
// (hoặc ít hơn ở trang cuối) của "page" đang chọn + vẽ lại thanh phân trang.
function renderAdminProductsPage(products, page) {
    const tbody = document.getElementById('bangDuLieu');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; color: #757575; padding: 20px;">Chưa có sản phẩm nào trong cơ sở dữ liệu.</td></tr>`;
        renderAdminPagination(products || [], 0, 1);
        return;
    }

    const totalItems = products.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_PRODUCTS_PER_PAGE));
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    adminCurrentPage = page;

    const startIndex = (page - 1) * ADMIN_PRODUCTS_PER_PAGE;
    const pageItems = products.slice(startIndex, startIndex + ADMIN_PRODUCTS_PER_PAGE);

    tbody.innerHTML = pageItems.map(buildProductRowHtml).join('');

    renderAdminPagination(products, totalPages, page);
}

// [PHÂN TRANG] Vẽ thanh phân trang dạng "< 1 2 3 4 5 >" (đồng bộ giao diện
// với .pagination đã dùng ở trang sanpham.html).
function renderAdminPagination(products, totalPages, currentPage) {
    const pagination = document.getElementById('adminSpPagination');
    if (!pagination) return;

    if (!products || products.length === 0 || totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    html += `<a href="#" data-page="${currentPage - 1}" class="${currentPage === 1 ? 'disabled' : ''}"><i class="fas fa-chevron-left"></i></a>`;
    for (let page = 1; page <= totalPages; page++) {
        html += `<a href="#" data-page="${page}" class="${page === currentPage ? 'active' : ''}">${page}</a>`;
    }
    html += `<a href="#" data-page="${currentPage + 1}" class="${currentPage === totalPages ? 'disabled' : ''}"><i class="fas fa-chevron-right"></i></a>`;

    pagination.innerHTML = html;

    pagination.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const page = Number(this.dataset.page);
            if (!page || page < 1 || page > totalPages || page === adminCurrentPage) return;
            renderAdminProductsPage(products, page);
            const dataCard = document.querySelector('.data-card');
            if (dataCard) dataCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// ==========================================
// 6. XỬ LÝ SUBMIT (THÊM VÀ SỬA)
// ==========================================
const formSanPham = document.getElementById('spForm');

if (formSanPham) {
    formSanPham.addEventListener('reset', function() {
        isEditMode = false;
        currentImageUrl = "";
        newUploadedPublicId = "";
        
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

        const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

        try {
            const inputFile = document.getElementById('hinhAnhFile');
            let hinhAnhUrl = currentImageUrl;
            let publicIdMoi = ""; // [CLOUDINARY] chỉ có giá trị nếu vừa upload ảnh mới thành công

            if (inputFile && inputFile.files.length > 0) {
                if (btnLuu) btnLuu.innerText = "Đang tải ảnh lên...";
                
                const formData = new FormData();
                formData.append("file", inputFile.files[0]);
                // Backend cần biết Nhóm Sản Phẩm để upload đúng thư mục Cloudinary
                // (Do_Noi_That/{FolderName của nhóm}).
                formData.append("maNhomSP", document.getElementById('maNhomSP').value);

                const uploadRes = await fetch(`${API_SAN_PHAM}/upload-image`, {
                    method: 'POST',
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: formData
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    hinhAnhUrl = uploadData.secureUrl;
                    publicIdMoi = uploadData.publicId;
                    newUploadedPublicId = publicIdMoi;
                } else {
                    const errMsg = await getErrorMessage(uploadRes, "Lỗi khi tải ảnh lên máy chủ!");
                    alert(errMsg);
                    if (btnLuu) {
                        btnLuu.disabled = false;
                        btnLuu.innerText = isEditMode ? "Cập Nhật Sản Phẩm" : "Lưu Sản Phẩm";
                    }
                    return;
                }
            }

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
                    // Chỉ gửi PublicId khi VỪA upload ảnh mới trong lần submit này; nếu không
                    // đổi ảnh thì để trống - Backend tự giữ nguyên PublicId đang có trong CSDL.
                    PublicId: publicIdMoi || null,
                    TrangThai: parseInt(document.getElementById('trangThai').value)
                },
                MaVatLieus: selectedVatLieu,
                MaNhaCungCaps: selectedNcc
            };

            const apiUrl = isEditMode ? `${API_SAN_PHAM}/${payload.SanPham.MaSP}` : API_SAN_PHAM;
            const apiMethod = isEditMode ? 'PUT' : 'POST';

            if (btnLuu) btnLuu.innerText = "Đang lưu dữ liệu...";

            const response = await fetch(apiUrl, {
                method: apiMethod,
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errMsg = await getErrorMessage(response, "Lỗi khi lưu dữ liệu sản phẩm!");
                alert(errMsg);
                return;
            }

            alert(isEditMode ? "Cập nhật Sản Phẩm thành công!" : "Thêm Sản Phẩm thành công!");
            
            formSanPham.reset(); 
            if (typeof closeSpModal === 'function') closeSpModal();
            await loadProducts();
            notifyProductsChanged(); // Báo cho tab sanpham.html (nếu đang mở) tự cập nhật ngay

        } catch (error) {
            console.error("Lỗi:", error);
            alert("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại Backend!");
        } finally {
            if (btnLuu) {
                btnLuu.disabled = false;
            }
        }
    });
}

// ==========================================
// 7. XÓA SẢN PHẨM (DELETE)
// ==========================================
async function deleteProduct(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm ${id} không?`)) return;

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

    try {
        const response = await fetch(`${API_SAN_PHAM}/${id}`, {
            method: 'DELETE',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });

        if (response.ok) {
            alert("Xóa sản phẩm thành công!");
            await loadProducts();
            notifyProductsChanged(); // Báo cho tab sanpham.html (nếu đang mở) tự cập nhật ngay
        } else {
            const errMsg = await getErrorMessage(response, "Xóa thất bại!");
            alert(errMsg);
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

        // [PHÂN TRANG] Lọc trên toàn bộ allAdminProducts (không chỉ 20 dòng
        // đang hiển thị) rồi render lại từ trang 1, để tìm kiếm luôn đúng
        // dù kết quả nằm ở trang nào.
        const filtered = !keyword
            ? allAdminProducts
            : allAdminProducts.filter(p => JSON.stringify(p).toLowerCase().includes(keyword));

        renderAdminProductsPage(filtered, 1);
    });
}

// ==========================================
// 9. CHỈNH SỬA SẢN PHẨM (GÁN DỮ LIỆU VÀO FORM)
// ==========================================
async function editProduct(maSP) {
    try {
        const response = await fetch(`${API_SAN_PHAM}/${maSP}`, { cache: 'no-store' });
        if (!response.ok) throw new Error("Không thể lấy thông tin sản phẩm.");
        const p = await response.json();
        
        isEditMode = true;
        currentImageUrl = p.hinhAnh || p.HinhAnh || "";
        newUploadedPublicId = "";

        // [CLOUDINARY] Hiển thị URL + ảnh HIỆN TẠI ngay khi mở form Sửa (không được gán vào
        // input type="file"). Nếu người dùng không chọn ảnh mới, ảnh này được giữ nguyên.
        const curBlock = document.getElementById('currentImageBlock');
        const curUrlInput = document.getElementById('currentImageUrlInput');
        const curPreview = document.getElementById('currentImagePreview');
        if (curUrlInput) curUrlInput.value = currentImageUrl;
        if (curPreview) {
            if (currentImageUrl) {
                curPreview.src = currentImageUrl;
                curPreview.style.display = 'block';
                curPreview.onerror = function() { this.onerror = null; this.src = NO_IMAGE_SVG; };
            } else {
                curPreview.style.display = 'none';
            }
        }
        if (curBlock) curBlock.style.display = currentImageUrl ? 'block' : 'none';

        const txtMaSP = document.getElementById('maSP');
        if (txtMaSP) {
            txtMaSP.value = p.maSP || p.MaSP;
            txtMaSP.readOnly = true; 
            txtMaSP.style.backgroundColor = "#e9ecef"; 
        }
        document.getElementById('tenSP').value = p.tenSP || p.TenSP || '';
        document.getElementById('donViTinh').value = p.donViTinh || p.DonViTinh || '';
        document.getElementById('soLuongTon').value = p.soLuongTon !== undefined ? p.soLuongTon : (p.SoLuongTon || 0);
        document.getElementById('moTa').value = p.moTa || p.MoTa || '';
        document.getElementById('trangThai').value = p.trangThai !== undefined ? p.trangThai : p.TrangThai;
        
        const gia = p.giaBan || p.GiaBan || 0;
        document.getElementById('giaBan').value = Number(gia).toLocaleString('vi-VN');

        function setSelectSafe(id, value) {
            const select = document.getElementById(id);
            if (!select) return;
            const target = (value || '').toString().trim();
            Array.from(select.options).forEach(opt => {
                if (opt.value.trim() === target) opt.selected = true;
            });
        }

        setSelectSafe('maNhomSP', p.maNhomSP || p.MaNhomSP);
        setSelectSafe('maMD', p.maMD || p.MaMD);

        const listVL = p.maVatLieus || p.MaVatLieus || [];
        const selectVL = document.getElementById('maVatLieu');
        if (selectVL) {
            Array.from(selectVL.options).forEach(opt => {
                opt.selected = listVL.some(x => x.toString().trim() === opt.value.trim());
            });
        }

        const listNCC = p.maNhaCungCaps || p.MaNhaCungCaps || [];
        const selectNCC = document.getElementById('maNCC');
        if (selectNCC) {
            Array.from(selectNCC.options).forEach(opt => {
                opt.selected = listNCC.some(x => x.toString().trim() === opt.value.trim());
            });
        }

        const btnLuu = document.querySelector('button[form="spForm"]');
        if (btnLuu) btnLuu.innerText = "Cập Nhật Thay Đổi";
        
        if (typeof openSpModal === 'function') {
            openSpModal();
        } else {
            const modal = document.getElementById('spModal'); 
            if (modal) modal.style.display = 'block'; 
        }
    } catch (error) {
        console.error("Lỗi edit:", error);
        alert("Lỗi khi tải dữ liệu sản phẩm để sửa!");
    }
}