// ==========================================================
// sanpham.js
// Trang: sanpham.html (Cửa hàng - danh sách sản phẩm)
//
// User Story:
// "Là Nhân viên bán hàng hoặc Khách hàng, tôi muốn xem danh sách toàn bộ
//  sản phẩm nội thất trên Website để tìm kiếm và lựa chọn sản phẩm phù hợp."
//
// Nguyên tắc:
// - Chỉ gọi API MỘT LẦN khi tải trang, lưu vào biến "allProducts".
// - Tìm kiếm / lọc / sắp xếp / phân trang đều xử lý trên "allProducts",
//   KHÔNG gọi lại API sau mỗi lần người dùng thao tác.
// - Không dùng thư viện ngoài, chỉ Vanilla JS + Fetch API.
// ==========================================================

// ----------------------------------------------------------
// 1. CẤU HÌNH & BIẾN TOÀN CỤC
// ----------------------------------------------------------
const API_BASE = "http://localhost:5129/api";
const API_SAN_PHAM = `${API_BASE}/san-pham`;
const API_NHOM_SP = `${API_BASE}/nhom-san-pham`;
const API_VAT_LIEU = `${API_BASE}/vat-lieu`;
const API_MUC_DICH = `${API_BASE}/muc-dich-su-dung`;

// Ảnh mặc định dùng SVG nội bộ (data URI) thay vì dịch vụ ngoài, để luôn hiển
// thị được kể cả khi không có mạng hoặc dịch vụ ngoài ngừng hoạt động.
const DEFAULT_PRODUCT_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'>
        <rect width='100%' height='100%' fill='#f0f0f0'/>
        <text x='50%' y='50%' font-family='Arial, sans-serif' font-size='28' fill='#9e9e9e' text-anchor='middle' dominant-baseline='middle'>Luxury Furniture</text>
    </svg>`
);
const PRODUCTS_PER_PAGE = 10; // Yêu cầu: 10 sản phẩm / trang

// Ánh xạ giá trị "category" trên URL (được dùng bởi menu dropdown Sản Phẩm
// có sẵn trong navbar: sanpham.html?category=phong-khach / phong-ngu) sang
// Mã Mục Đích Sử Dụng (MaMD) trong CSDL. Đây là cách tái sử dụng link menu
// đã có sẵn trong giao diện thay vì phải thêm mới một dropdown "Mục đích".
const CATEGORY_TO_MA_MD = {
    "phong-khach": "MD01",
    "phong-ngu": "MD02"
};

// Dữ liệu gốc lấy từ API - chỉ gọi 1 lần
let allProducts = [];

// Bộ lọc / tìm kiếm / sắp xếp / phân trang hiện tại
const state = {
    selectedNhomSp: new Set(),   // các MaNhomSP đang được chọn lọc
    selectedVatLieu: new Set(),  // các MaVL đang được chọn lọc
    maxPrice: null,              // lọc giá <= maxPrice
    maMD: null,                  // lọc theo Mục đích (từ query ?category=)
    keyword: "",                 // từ khóa tìm kiếm theo tên
    sortBy: "default",           // default | name-asc | name-desc | price-asc | price-desc
    currentPage: 1
};

// ----------------------------------------------------------
// 2. KHỞI TẠO
// ----------------------------------------------------------
document.addEventListener("DOMContentLoaded", init);

async function init() {
    applyCategoryFromQueryString();
    bindEvents();
    bindCrossTabSync();

    showLoading();
    try {
        await Promise.all([loadCategories(), loadMaterials(), loadMucDichDropdown()]);
        await loadProducts();
        renderProductList();
    } catch (error) {
        console.error("Lỗi khởi tạo trang sản phẩm:", error);
        showError();
    }
}

// ----------------------------------------------------------
// 2b. ĐỒNG BỘ REAL-TIME VỚI TRANG QUẢN TRỊ (admin_sanpham.html)
// Khi bên admin thêm/sửa/xóa sản phẩm thành công, admin_sanpham.js sẽ ghi
// một mốc thời gian vào localStorage (key "luxuryProductsUpdatedAt"). Trình
// duyệt sẽ tự bắn sự kiện "storage" tới MỌI tab khác đang mở cùng origin
// (bao gồm cả tab sanpham.html này), nhờ đó trang cửa hàng có thể tự tải lại
// danh sách sản phẩm và hiển thị ngay lập tức - không cần người dùng bấm F5.
// ----------------------------------------------------------
function bindCrossTabSync() {
    window.addEventListener("storage", function (e) {
        if (e.key === "luxuryProductsUpdatedAt") {
            refreshProductsSilently();
        }
    });
}

// Tải lại dữ liệu sản phẩm (và danh mục lọc) trong nền, không hiện màn hình
// "Đang tải..." để tránh giật/nháy giao diện khi người dùng đang xem trang.
async function refreshProductsSilently() {
    try {
        await Promise.all([loadCategories(), loadMaterials()]);
        await loadProducts();
        renderProductList();
    } catch (error) {
        console.error("Lỗi khi tự động đồng bộ danh sách sản phẩm:", error);
        // Giữ nguyên dữ liệu hiện có nếu đồng bộ thất bại, không làm phiền người dùng
    }
}

// Đọc ?category= (menu cũ, vẫn giữ để không phá các liên kết ở trang khác:
// index.html, giohang.html, thanhtoan.html, chitiet-sanpham.html) và
// ?mucdich= (dropdown "Sản Phẩm" MỚI trên chính trang sanpham.html, trỏ
// thẳng bằng MaMD lấy từ API /api/muc-dich-su-dung) để lọc theo Mục đích sử dụng.
function applyCategoryFromQueryString() {
    const params = new URLSearchParams(window.location.search);

    const category = params.get("category");
    if (category && CATEGORY_TO_MA_MD[category]) {
        state.maMD = CATEGORY_TO_MA_MD[category];
    }

    const mucDich = params.get("mucdich");
    if (mucDich) {
        state.maMD = mucDich;
    }
}

// ----------------------------------------------------------
// 3. TẢI DANH MỤC (NHÓM SẢN PHẨM / VẬT LIỆU) ĐỂ RENDER BỘ LỌC
// ----------------------------------------------------------
async function loadCategories() {
    const list = document.getElementById("nhomSpFilterList");
    if (!list) return;

    try {
        const res = await fetch(API_NHOM_SP);
        if (!res.ok) throw new Error("Không thể tải nhóm sản phẩm.");
        const data = await res.json();

        list.innerHTML = data.map(n => {
            const ma = n.maNhomSP || n.MaNhomSP;
            const ten = n.tenNhomSP || n.TenNhomSP;
            return `<li><label><input type="checkbox" class="filter-nhom-sp" value="${ma}"> ${ten}</label></li>`;
        }).join("");
    } catch (error) {
        console.error("Lỗi tải nhóm sản phẩm:", error);
        list.innerHTML = "";
    }
}

// Dropdown "Sản Phẩm" trên navbar: thay 2 mục tĩnh (Phòng Khách/Phòng Ngủ) cũ
// bằng danh sách MỤC ĐÍCH SỬ DỤNG THẬT lấy từ API /api/muc-dich-su-dung. Ấn
// vào 1 mục sẽ tải lại chính trang sanpham.html kèm ?mucdich=<MaMD> để lọc
// đúng sản phẩm tương ứng (đọc bởi applyCategoryFromQueryString() ở trên).
async function loadMucDichDropdown() {
    const dropdown = document.getElementById("dropdownMucDich");
    if (!dropdown) return;

    try {
        const res = await fetch(API_MUC_DICH);
        if (!res.ok) throw new Error("Không thể tải mục đích sử dụng.");
        const data = await res.json();

        dropdown.innerHTML = data.map(m => {
            const ma = m.maMD || m.MaMD;
            const ten = m.tenMD || m.TenMD;
            return `<a href="sanpham.html?mucdich=${encodeURIComponent(ma)}">${escapeHtml(ten)}</a>`;
        }).join("");
    } catch (error) {
        console.error("Lỗi tải Mục Đích Sử Dụng cho dropdown Sản Phẩm:", error);
        dropdown.innerHTML = "";
    }
}

async function loadMaterials() {
    const list = document.getElementById("vatLieuFilterList");
    if (!list) return;

    try {
        const res = await fetch(API_VAT_LIEU);
        if (!res.ok) throw new Error("Không thể tải vật liệu.");
        const data = await res.json();

        list.innerHTML = data.map(v => {
            const ma = v.maVL || v.MaVL;
            const ten = v.tenVL || v.TenVL;
            return `<li><label><input type="checkbox" class="filter-vat-lieu" value="${ma}"> ${ten}</label></li>`;
        }).join("");
    } catch (error) {
        console.error("Lỗi tải vật liệu:", error);
        list.innerHTML = "";
    }
}

// ----------------------------------------------------------
// 4. TẢI DANH SÁCH SẢN PHẨM (GỌI 1 LẦN DUY NHẤT)
// ----------------------------------------------------------
async function loadProducts() {
    // chiHoatDong=true: chỉ lấy sản phẩm đang hoạt động (dành cho khách xem),
    // tham số này được API mặc định BỎ QUA nếu không truyền, nên không ảnh
    // hưởng tới trang Quản trị.
    const response = await fetch(`${API_SAN_PHAM}?chiHoatDong=true`, { cache: "no-store" });

    if (!response.ok) {
        throw new Error(`API trả về lỗi HTTP ${response.status}`);
    }

    allProducts = await response.json();
}

// ----------------------------------------------------------
// 5. GẮN SỰ KIỆN CHO CÁC ĐIỀU KHIỂN LỌC / TÌM KIẾM / SẮP XẾP
// ----------------------------------------------------------
function bindEvents() {
    // Tìm kiếm realtime, không reload trang, không gọi API
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            state.keyword = this.value.trim().toLowerCase();
            state.currentPage = 1;
            renderProductList();
        });
    }

    // Sắp xếp
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
        sortSelect.addEventListener("change", function () {
            state.sortBy = this.value;
            renderProductList();
        });
    }

    // Lọc theo giá (dùng thanh trượt sẵn có)
    const priceSlider = document.getElementById("priceSlider");
    const priceValueDisplay = document.getElementById("priceValueDisplay");
    if (priceSlider) {
        state.maxPrice = Number(priceSlider.value);
        priceSlider.addEventListener("input", function () {
            state.maxPrice = Number(this.value);
            if (priceValueDisplay) {
                priceValueDisplay.textContent = formatCurrency(state.maxPrice);
            }
            state.currentPage = 1;
            renderProductList();
        });
    }

    // Lọc theo Nhóm sản phẩm / Vật liệu (checkbox được render động nên dùng
    // event delegation trên container cha thay vì gắn từng checkbox)
    const nhomSpList = document.getElementById("nhomSpFilterList");
    if (nhomSpList) {
        nhomSpList.addEventListener("change", function (e) {
            if (!e.target.classList.contains("filter-nhom-sp")) return;
            toggleFilterValue(state.selectedNhomSp, e.target.value, e.target.checked);
            state.currentPage = 1;
            renderProductList();
        });
    }

    const vatLieuList = document.getElementById("vatLieuFilterList");
    if (vatLieuList) {
        vatLieuList.addEventListener("change", function (e) {
            if (!e.target.classList.contains("filter-vat-lieu")) return;
            toggleFilterValue(state.selectedVatLieu, e.target.value, e.target.checked);
            state.currentPage = 1;
            renderProductList();
        });
    }

    // "Thêm vào giỏ" trên từng thẻ sản phẩm - dùng event delegation vì lưới
    // sản phẩm được render động (renderProducts) sau mỗi lần lọc/phân trang.
    const productGrid = document.getElementById("productGrid");
    if (productGrid) {
        productGrid.addEventListener("click", function (e) {
            const btn = e.target.closest("[data-ma-sp]");
            if (!btn) return;
            e.preventDefault();
            handleQuickAddToCart(btn.getAttribute("data-ma-sp"));
        });
    }
}

// Thêm nhanh 1 sản phẩm (số lượng = 1) vào giỏ hàng ngay từ danh sách,
// tái sử dụng dữ liệu đã có sẵn trong "allProducts" - không gọi lại API.
function handleQuickAddToCart(maSP) {
    const product = allProducts.find(p => (p.maSP || p.MaSP) === maSP);
    if (!product) return;

    const soLuongTon = product.soLuongTon !== undefined ? product.soLuongTon : (product.SoLuongTon || 0);
    if (soLuongTon <= 0) {
        showCartToast("Sản phẩm này hiện đã hết hàng.", "error");
        return;
    }

    addToCart({
        maSP,
        tenSP: getTenSP(product),
        giaBan: getGiaBan(product),
        hinhAnh: product.hinhAnh || product.HinhAnh || DEFAULT_PRODUCT_IMAGE,
        soLuongTon
    }, 1);

    showCartToast(`Đã thêm "${getTenSP(product)}" vào giỏ hàng.`);
}

function toggleFilterValue(set, value, isChecked) {
    if (isChecked) {
        set.add(value);
    } else {
        set.delete(value);
    }
}

// ----------------------------------------------------------
// 6. LỌC (FILTER + SEARCH) - hoạt động đồng thời trên allProducts
// ----------------------------------------------------------
function filterProducts(products) {
    return products.filter(p => {
        const maNhomSP = p.maNhomSP || p.MaNhomSP || "";
        const maMD = p.maMD || p.MaMD || "";
        const giaBan = Number(p.giaBan ?? p.GiaBan ?? 0);
        const danhSachVatLieu = getVatLieuCodes(p);

        // Lọc theo Nhóm sản phẩm (nếu có chọn)
        if (state.selectedNhomSp.size > 0 && !state.selectedNhomSp.has(maNhomSP)) {
            return false;
        }

        // Lọc theo Vật liệu (nếu có chọn) - sản phẩm khớp nếu chứa ít nhất 1 vật liệu đã chọn
        if (state.selectedVatLieu.size > 0) {
            const coKhopVatLieu = danhSachVatLieu.some(ma => state.selectedVatLieu.has(ma));
            if (!coKhopVatLieu) return false;
        }

        // Lọc theo Mục đích sử dụng (từ menu category trên navbar)
        if (state.maMD && maMD !== state.maMD) {
            return false;
        }

        // Lọc theo giá
        if (state.maxPrice !== null && giaBan > state.maxPrice) {
            return false;
        }

        return true;
    });
}

function searchProducts(products) {
    if (!state.keyword) return products;

    return products.filter(p => {
        const tenSP = (p.tenSP || p.TenSP || "").toLowerCase();
        return tenSP.includes(state.keyword);
    });
}

// ----------------------------------------------------------
// 7. SẮP XẾP
// ----------------------------------------------------------
function sortProducts(products) {
    const sorted = [...products];

    switch (state.sortBy) {
        case "name-asc":
            sorted.sort((a, b) => getTenSP(a).localeCompare(getTenSP(b), "vi"));
            break;
        case "name-desc":
            sorted.sort((a, b) => getTenSP(b).localeCompare(getTenSP(a), "vi"));
            break;
        case "price-asc":
            sorted.sort((a, b) => getGiaBan(a) - getGiaBan(b));
            break;
        case "price-desc":
            sorted.sort((a, b) => getGiaBan(b) - getGiaBan(a));
            break;
        default:
            // "default": không có ngày tạo trong CSDL nên giữ nguyên thứ tự
            // trả về từ API (đã sắp xếp theo tên khi chiHoatDong=true).
            break;
    }

    return sorted;
}

// ----------------------------------------------------------
// 8. LUỒNG XỬ LÝ CHÍNH: allProducts -> filter -> search -> sort -> phân trang -> render
// ----------------------------------------------------------
function renderProductList() {
    let result = filterProducts(allProducts);
    result = searchProducts(result);
    result = sortProducts(result);

    const totalItems = result.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PRODUCTS_PER_PAGE));
    if (state.currentPage > totalPages) state.currentPage = totalPages;

    const startIndex = (state.currentPage - 1) * PRODUCTS_PER_PAGE;
    const pageItems = result.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);

    if (totalItems === 0) {
        showEmpty();
        renderPagination(0, 1);
        return;
    }

    hideMessage();
    renderProducts(pageItems);
    renderPagination(totalPages, state.currentPage);
}

// ----------------------------------------------------------
// 9. RENDER DANH SÁCH SẢN PHẨM DẠNG CARD (giữ nguyên class CSS hiện có)
// ----------------------------------------------------------
function renderProducts(products) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = products.map(buildProductCardHtml).join("");
}

function buildProductCardHtml(p) {
    const maSP = p.maSP || p.MaSP || "";
    const tenSP = getTenSP(p);
    const giaBan = getGiaBan(p);
    const moTa = p.moTa || p.MoTa || "";
    const soLuongTon = p.soLuongTon !== undefined ? p.soLuongTon : (p.SoLuongTon || 0);
    const hinhAnh = p.hinhAnh || p.HinhAnh;

    const nhomSanPham = p.nhomSanPham || p.NhomSanPham;
    const tenNhomSP = nhomSanPham ? (nhomSanPham.tenNhomSP || nhomSanPham.TenNhomSP) : "";

    const mucDichSuDung = p.mucDichSuDung || p.MucDichSuDung;
    const tenMD = mucDichSuDung ? (mucDichSuDung.tenMD || mucDichSuDung.TenMD) : "";

    const tenVatLieuList = getVatLieuNames(p);

    const stockClass = soLuongTon > 0 ? "" : "out-of-stock";
    const stockText = soLuongTon > 0 ? `Còn ${soLuongTon} sản phẩm` : "Hết hàng";

    return `
        <div class="product-card">
            <div class="product-image">
                <a href="chitiet-sanpham.html?id=${encodeURIComponent(maSP)}" title="Xem chi tiết">
                    <img src="${escapeHtml(hinhAnh || DEFAULT_PRODUCT_IMAGE)}"
                         alt="${escapeHtml(tenSP)}"
                         loading="lazy"
                         onerror="handleProductImgError(this)">
                </a>
                <div class="product-actions">
                    <button class="btn-icon" title="Thêm vào giỏ" data-ma-sp="${escapeHtml(maSP)}"><i class="fas fa-cart-plus"></i></button>
                    <a href="chitiet-sanpham.html?id=${encodeURIComponent(maSP)}" class="btn-icon" title="Xem chi tiết"><i class="fas fa-eye"></i></a>
                </div>
            </div>
            <div class="product-info">
                <span class="product-category">${escapeHtml(tenNhomSP)}</span>
                <h3 class="product-name">${escapeHtml(tenSP)}</h3>
                <p class="product-price">${formatCurrency(giaBan)}</p>
                <div class="product-extra-meta">
                    ${tenMD ? `<span><i class="fas fa-bullseye"></i> ${escapeHtml(tenMD)}</span>` : ""}
                    ${tenVatLieuList ? `<span><i class="fas fa-layer-group"></i> ${escapeHtml(tenVatLieuList)}</span>` : ""}
                </div>
                ${moTa ? `<p class="product-desc-short">${escapeHtml(moTa)}</p>` : ""}
                <span class="product-stock ${stockClass}">${stockText}</span>
                <div style="margin-top: 10px;">
                    <a href="chitiet-sanpham.html?id=${encodeURIComponent(maSP)}" class="btn-outline" style="display:inline-block; padding:6px 14px; font-size:13px;">Xem chi tiết</a>
                </div>
            </div>
        </div>
    `;
}

// ----------------------------------------------------------
// 10. PHÂN TRANG (client-side)
// ----------------------------------------------------------
function renderPagination(totalPages, currentPage) {
    const pagination = document.getElementById("pagination");
    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.innerHTML = "";
        return;
    }

    let html = "";

    html += `<a href="#" data-page="${currentPage - 1}" class="${currentPage === 1 ? "disabled" : ""}"><i class="fas fa-chevron-left"></i></a>`;

    for (let page = 1; page <= totalPages; page++) {
        html += `<a href="#" data-page="${page}" class="${page === currentPage ? "active" : ""}">${page}</a>`;
    }

    html += `<a href="#" data-page="${currentPage + 1}" class="${currentPage === totalPages ? "disabled" : ""}"><i class="fas fa-chevron-right"></i></a>`;

    pagination.innerHTML = html;

    pagination.querySelectorAll("a[data-page]").forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const page = Number(this.dataset.page);
            if (!page || page < 1 || page > totalPages || page === state.currentPage) return;
            state.currentPage = page;
            renderProductList();
            window.scrollTo({ top: document.querySelector(".shop-container").offsetTop - 100, behavior: "smooth" });
        });
    });
}

// ----------------------------------------------------------
// 11. TRẠNG THÁI: LOADING / RỖNG / LỖI
// ----------------------------------------------------------
function showLoading() {
    const grid = document.getElementById("productGrid");
    const msg = document.getElementById("productMessage");
    if (grid) grid.innerHTML = "";
    if (msg) {
        msg.style.display = "block";
        msg.className = "product-message is-loading";
        msg.innerHTML = `<span class="spinner"></span> Đang tải dữ liệu...`;
    }
}

function hideLoading() {
    hideMessage();
}

function showEmpty() {
    const grid = document.getElementById("productGrid");
    const msg = document.getElementById("productMessage");
    if (grid) grid.innerHTML = "";
    if (msg) {
        msg.style.display = "block";
        msg.className = "product-message is-empty";
        msg.textContent = "Không có sản phẩm";
    }
}

function showError() {
    const grid = document.getElementById("productGrid");
    const msg = document.getElementById("productMessage");
    if (grid) grid.innerHTML = "";
    if (msg) {
        msg.style.display = "block";
        msg.className = "product-message is-error";
        // Không hiển thị chi tiết lỗi kỹ thuật (exception/stacktrace) cho người dùng
        msg.textContent = "Lỗi kết nối máy chủ. Vui lòng thử lại sau.";
    }
}

function hideMessage() {
    const msg = document.getElementById("productMessage");
    if (msg) {
        msg.style.display = "none";
        msg.innerHTML = "";
    }
}

// ----------------------------------------------------------
// 12. HÀM TIỆN ÍCH
// ----------------------------------------------------------
function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
}

function getTenSP(p) {
    return p.tenSP || p.TenSP || "";
}

function getGiaBan(p) {
    return Number(p.giaBan ?? p.GiaBan ?? 0);
}

// Lấy danh sách mã vật liệu (MaVL) của 1 sản phẩm từ quan hệ LAMNEN
function getVatLieuCodes(p) {
    const lamNens = p.lamNens || p.LamNens || [];
    return lamNens
        .map(l => l.maVL || l.MaVL)
        .filter(Boolean);
}

// Lấy danh sách tên vật liệu, nối bằng dấu phẩy để hiển thị trên card
function getVatLieuNames(p) {
    const lamNens = p.lamNens || p.LamNens || [];
    return lamNens
        .map(l => {
            const vatLieu = l.vatLieu || l.VatLieu;
            return vatLieu ? (vatLieu.tenVL || vatLieu.TenVL) : null;
        })
        .filter(Boolean)
        .join(", ");
}

// ----------------------------------------------------------
// TỰ ĐỘNG THỬ TẢI LẠI ẢNH (fix lỗi phải F5 mới thấy ảnh vừa upload).
// Khi <img> báo lỗi (onerror), thay vì rơi ngay về ảnh mặc định, hàm này sẽ
// thử tải lại chính ảnh đó (kèm tham số chống cache) vài lần với độ trễ tăng
// dần trước khi mới chịu thua và hiển thị ảnh mặc định.
// ----------------------------------------------------------
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
        imgEl.src = DEFAULT_PRODUCT_IMAGE;
    }
}

// Tránh XSS khi chèn dữ liệu từ API vào innerHTML
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}
