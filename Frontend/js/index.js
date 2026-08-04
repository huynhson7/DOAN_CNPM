// ==========================================================
// index.js
// Trang: index.html (Trang chủ)
//
// Khu vực "Sản Phẩm Nổi Bật" trước đây là 4 thẻ HTML tĩnh (hardcode).
// File này tải danh sách sản phẩm THẬT từ API rồi CHỌN NGẪU NHIÊN 4 sản
// phẩm mỗi lần trang được tải lại, để sản phẩm mới thêm ở trang Quản trị
// cũng có cơ hội xuất hiện ở trang chủ.
// ==========================================================

const API_BASE = "http://localhost:5129/api";
const API_SAN_PHAM = `${API_BASE}/san-pham`;
const API_MUC_DICH = `${API_BASE}/muc-dich-su-dung`;
const FEATURED_PRODUCT_COUNT = 4;

document.addEventListener("DOMContentLoaded", loadFeaturedProducts);
document.addEventListener("DOMContentLoaded", loadMucDichDropdown);

// Dropdown "Sản Phẩm" trên navbar: đồng bộ với sanpham.html - thay 2 mục tĩnh
// (Phòng Khách/Phòng Ngủ) cũ bằng danh sách MỤC ĐÍCH SỬ DỤNG THẬT lấy từ API
// /api/muc-dich-su-dung. Ấn vào 1 mục sẽ chuyển sang sanpham.html kèm
// ?mucdich=<MaMD> để lọc đúng sản phẩm tương ứng.
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
            return `<a href="sanpham.html?mucdich=${encodeURIComponent(ma)}">${escapeHtmlCart(ten)}</a>`;
        }).join("");
    } catch (error) {
        console.error("Lỗi tải Mục Đích Sử Dụng cho dropdown Sản Phẩm:", error);
        dropdown.innerHTML = "";
    }
}

async function loadFeaturedProducts() {
    const grid = document.querySelector(".featured-products .product-grid");
    if (!grid) return;

    try {
        const response = await fetch(`${API_SAN_PHAM}?chiHoatDong=true`, { cache: "no-store" });
        if (!response.ok) throw new Error(`API trả về lỗi HTTP ${response.status}`);

        const allProducts = await response.json();
        if (!Array.isArray(allProducts) || allProducts.length === 0) {
            // Chưa có sản phẩm nào trong CSDL - giữ nguyên khung 4 thẻ demo có sẵn trong HTML.
            return;
        }

        const randomProducts = pickRandomProducts(allProducts, FEATURED_PRODUCT_COUNT);
        grid.innerHTML = randomProducts.map(buildFeaturedCardHtml).join("");
        bindFeaturedAddToCartEvents(grid, randomProducts);
    } catch (error) {
        console.error("Lỗi tải Sản Phẩm Nổi Bật:", error);
        // Giữ nguyên các thẻ demo có sẵn trong HTML nếu API lỗi, tránh trang chủ bị trống.
    }
}

// Xáo trộn mảng theo thuật toán Fisher-Yates rồi lấy "count" phần tử đầu
// -> mỗi lần chạy web (F5 / mở lại trang) sẽ ra 1 bộ sản phẩm ngẫu nhiên khác nhau.
function pickRandomProducts(products, count) {
    const shuffled = [...products];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function buildFeaturedCardHtml(p) {
    const maSP = p.maSP || p.MaSP || "";
    const tenSP = p.tenSP || p.TenSP || "";
    const giaBan = Number(p.giaBan ?? p.GiaBan ?? 0);
    const hinhAnh = p.hinhAnh || p.HinhAnh || CART_DEFAULT_IMAGE;

    const nhomSanPham = p.nhomSanPham || p.NhomSanPham;
    const tenNhomSP = nhomSanPham ? (nhomSanPham.tenNhomSP || nhomSanPham.TenNhomSP) : "";

    // Admin (Quản trị Hệ thống) và Nhân viên (NV Bán Hàng) không cần thao tác mua hàng
    // nên ẩn hẳn 2 icon hiện khi rê chuột (Thêm vào giỏ, Xem chi tiết) - chỉ Khách hàng
    // (hoặc khách chưa đăng nhập) mới thấy, đồng bộ với khu vực "Sản Phẩm" (sanpham.html).
    const currentUserRole = localStorage.getItem('userRole');
    const isStaffRole = currentUserRole === 'Quản trị Hệ thống' || currentUserRole === 'NV Bán Hàng';
    const productActionsHtml = isStaffRole ? "" : `
                <div class="product-actions">
                    <button class="btn-icon" title="Thêm vào giỏ" data-ma-sp="${escapeHtmlCart(maSP)}"><i class="fas fa-cart-plus"></i></button>
                    <a href="chitiet-sanpham.html?id=${encodeURIComponent(maSP)}" class="btn-icon" title="Xem chi tiết"><i class="fas fa-eye"></i></a>
                </div>`;

    return `
        <div class="product-card">
            <div class="product-image">
                <a href="chitiet-sanpham.html?id=${encodeURIComponent(maSP)}" title="Xem chi tiết">
                    <img src="${escapeHtmlCart(hinhAnh)}" alt="${escapeHtmlCart(tenSP)}"
                         onerror="this.onerror=null;this.src='${CART_DEFAULT_IMAGE}';">
                </a>${productActionsHtml}
            </div>
            <div class="product-info">
                <span class="product-category">${escapeHtmlCart(tenNhomSP)}</span>
                <h3 class="product-name">${escapeHtmlCart(tenSP)}</h3>
                <p class="product-price">${formatCurrencyVND(giaBan)}</p>
            </div>
        </div>
    `;
}

// "Thêm vào giỏ" ngay từ trang chủ - dùng module giỏ hàng dùng chung js/cart.js
function bindFeaturedAddToCartEvents(grid, products) {
    grid.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-ma-sp]");
        if (!btn) return;
        e.preventDefault();

        const maSP = btn.getAttribute("data-ma-sp");
        const product = products.find(p => (p.maSP || p.MaSP) === maSP);
        if (!product) return;

        const soLuongTon = product.soLuongTon !== undefined ? product.soLuongTon : (product.SoLuongTon || 0);
        if (soLuongTon <= 0) {
            showCartToast("Sản phẩm này hiện đã hết hàng.", "error");
            return;
        }

        const tenSP = product.tenSP || product.TenSP || "";
        addToCart({
            maSP,
            tenSP,
            giaBan: Number(product.giaBan ?? product.GiaBan ?? 0),
            hinhAnh: product.hinhAnh || product.HinhAnh || CART_DEFAULT_IMAGE,
            soLuongTon
        }, 1);

        showCartToast(`Đã thêm "${tenSP}" vào giỏ hàng.`);
    });
}