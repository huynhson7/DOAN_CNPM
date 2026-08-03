// ==========================================================
// chitiet-sanpham.js
// Trang: chitiet-sanpham.html (Chi tiết 1 sản phẩm)
//
// Đọc "id" từ query string (?id=MaSP) và gọi API
// GET /api/san-pham/{id} (endpoint đã có sẵn, đã được mở rộng
// Include() để trả kèm tên Nhóm SP / Mục đích / Vật liệu).
// ==========================================================

const API_BASE = "http://localhost:5129/api";
const API_SAN_PHAM = `${API_BASE}/san-pham`;
const API_MUC_DICH = `${API_BASE}/muc-dich-su-dung`;
const DEFAULT_PRODUCT_IMAGE = "https://placehold.co/800x800?text=Luxury+Furniture";

// Sản phẩm đang xem, lưu lại sau khi tải xong để dùng cho nút "Thêm Vào Giỏ Hàng"
let currentProduct = null;

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("DOMContentLoaded", loadMucDichDropdown);

// Dropdown "Sản Phẩm" trên navbar: đồng bộ với index.html/sanpham.html - thay
// 2 mục tĩnh (Phòng Khách/Phòng Ngủ) cũ bằng danh sách MỤC ĐÍCH SỬ DỤNG THẬT
// lấy từ API /api/muc-dich-su-dung. Ấn vào 1 mục sẽ chuyển sang sanpham.html
// kèm ?mucdich=<MaMD> để lọc đúng sản phẩm tương ứng.
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

async function init() {
    const maSP = getProductIdFromQueryString();

    if (!maSP) {
        showDetailError("Thiếu mã sản phẩm trên đường dẫn.");
        return;
    }

    showDetailLoading();

    try {
        const product = await loadProductDetail(maSP);
        currentProduct = product;
        hideDetailMessage();
        renderProductDetail(product);
        bindQuantityEvents();
        bindAddToCartEvent(product);
        bindBuyNowEvent(product);
    } catch (error) {
        console.error("Lỗi tải chi tiết sản phẩm:", error);
        if (error && error.notFound) {
            showDetailError("Không tìm thấy sản phẩm.");
        } else {
            // Không hiển thị chi tiết lỗi kỹ thuật (exception/stacktrace) cho người dùng
            showDetailError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
        }
    }
}

function getProductIdFromQueryString() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

// ----------------------------------------------------------
// GỌI API (chỉ gọi 1 lần cho đúng 1 sản phẩm cần xem)
// ----------------------------------------------------------
async function loadProductDetail(maSP) {
    const response = await fetch(`${API_SAN_PHAM}/${encodeURIComponent(maSP)}`, { cache: "no-store" });

    if (response.status === 404) {
        const err = new Error("Không tìm thấy sản phẩm.");
        err.notFound = true;
        throw err;
    }

    if (!response.ok) {
        throw new Error(`API trả về lỗi HTTP ${response.status}`);
    }

    return response.json();
}

// ----------------------------------------------------------
// RENDER DỮ LIỆU SẢN PHẨM LÊN GIAO DIỆN
// ----------------------------------------------------------
function renderProductDetail(p) {
    const tenSP = p.tenSP || p.TenSP || "";
    const giaBan = Number(p.giaBan ?? p.GiaBan ?? 0);
    const moTa = p.moTa || p.MoTa || "";
    const soLuongTon = p.soLuongTon !== undefined ? p.soLuongTon : (p.SoLuongTon || 0);
    const hinhAnh = p.hinhAnh || p.HinhAnh || DEFAULT_PRODUCT_IMAGE;

    const nhomSanPham = p.nhomSanPham || p.NhomSanPham;
    const tenNhomSP = nhomSanPham ? (nhomSanPham.tenNhomSP || nhomSanPham.TenNhomSP) : "";

    const mucDichSuDung = p.mucDichSuDung || p.MucDichSuDung;
    const tenMD = mucDichSuDung ? (mucDichSuDung.tenMD || mucDichSuDung.TenMD) : "";

    const tenVatLieuList = getVatLieuNames(p);
    const tenNhaCungCapList = getNhaCungCapNames(p);

    // Breadcrumb + tiêu đề trang
    document.title = `${tenSP || "Chi tiết sản phẩm"} - Luxury Furniture`;
    setText("breadcrumbProductName", tenSP);
    setText("productTitle", tenSP);
    setText("productCategoryTag", tenNhomSP);
    setText("productPrice", formatCurrency(giaBan));
    setText("productDesc", moTa);

    setText("metaNhom", tenNhomSP ? `Nhóm: ${tenNhomSP}` : "", "fas fa-layer-group");
    setText("metaVatLieu", tenVatLieuList ? `Vật liệu: ${tenVatLieuList}` : "", "fas fa-couch");
    setText("metaNhaCungCap", tenNhaCungCapList ? `Nhà cung cấp: ${tenNhaCungCapList}` : "", "fas fa-industry");
    setText("metaMucDich", tenMD ? `Mục đích: ${tenMD}` : "", "fas fa-bullseye");

    const stockEl = document.getElementById("metaStock");
    if (stockEl) {
        if (soLuongTon > 0) {
            stockEl.className = "stock in-stock";
            stockEl.innerHTML = `<i class="fas fa-check-circle"></i> Còn hàng (${soLuongTon})`;
        } else {
            stockEl.className = "stock out-of-stock";
            stockEl.innerHTML = `<i class="fas fa-times-circle"></i> Hết hàng`;
        }
    }

    // Ảnh chính (CSDL hiện chỉ lưu 1 ảnh / sản phẩm).
    const mainImg = document.getElementById("main-product-img");
    if (mainImg) {
        mainImg.src = hinhAnh;
        mainImg.alt = tenSP;
        mainImg.onerror = function () {
            this.onerror = null;
            this.src = DEFAULT_PRODUCT_IMAGE;
        };
    }
}

function setText(elementId, text, iconClass) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (iconClass) {
        // text truyền vào đã có sẵn tiền tố (VD: "Nhóm:", "Vật liệu:")
        el.innerHTML = text ? `<i class="${iconClass}"></i> ${escapeHtml(text)}` : "";
    } else {
        el.textContent = text || "";
    }
}

// ----------------------------------------------------------
// TƯƠNG TÁC: đổi ảnh thumbnail, tăng/giảm số lượng
// ----------------------------------------------------------
function changeImage(element) {
    const mainImg = document.getElementById("main-product-img");
    if (mainImg) mainImg.src = element.src;

    document.querySelectorAll(".thumbnail-list img").forEach(thumb => thumb.classList.remove("active-thumb"));
    element.classList.add("active-thumb");
}

function updateQty(change) {
    const qtyInput = document.getElementById("product-quantity");
    if (!qtyInput) return;

    const soLuongTon = currentProduct
        ? (currentProduct.soLuongTon !== undefined ? currentProduct.soLuongTon : (currentProduct.SoLuongTon || 0))
        : Infinity;

    let newQty = parseInt(qtyInput.value, 10) + change;
    if (isNaN(newQty) || newQty < 1) newQty = 1;

    if (newQty > soLuongTon) {
        newQty = soLuongTon;
        showCartToast(`Chỉ còn ${soLuongTon} sản phẩm trong kho.`, "error");
    }

    qtyInput.value = newQty;
}

function bindQuantityEvents() {
    // Các nút +/- gọi trực tiếp qua onclick="updateQty(...)" có sẵn trong HTML,
    // hàm updateQty đã được định nghĩa ở phạm vi toàn cục (global) phía trên.

    // Chặn luôn trường hợp người dùng gõ tay số lượng lớn hơn tồn kho.
    const qtyInput = document.getElementById("product-quantity");
    if (!qtyInput) return;

    qtyInput.addEventListener("change", () => {
        const soLuongTon = currentProduct
            ? (currentProduct.soLuongTon !== undefined ? currentProduct.soLuongTon : (currentProduct.SoLuongTon || 0))
            : Infinity;

        let qty = parseInt(qtyInput.value, 10);
        if (isNaN(qty) || qty < 1) qty = 1;

        if (qty > soLuongTon) {
            qty = soLuongTon;
            showCartToast(`Chỉ còn ${soLuongTon} sản phẩm trong kho.`, "error");
        }

        qtyInput.value = qty;
    });
}

// ----------------------------------------------------------
// MUA NGAY (bỏ qua giỏ hàng, chuyển thẳng sang trang thanh toán
// chỉ với đúng 1 sản phẩm này - không trộn với giỏ hàng hiện có)
// ----------------------------------------------------------
function bindBuyNowEvent(product) {
    const btn = document.getElementById("buyNowBtn");
    if (!btn) return;

    const soLuongTon = product.soLuongTon !== undefined ? product.soLuongTon : (product.SoLuongTon || 0);

    if (soLuongTon <= 0) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-ban"></i> Hết Hàng`;
        return;
    }

    btn.addEventListener("click", () => {
        const qtyInput = document.getElementById("product-quantity");
        const soLuong = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

        const tenSP = product.tenSP || product.TenSP || "";
        const giaBan = Number(product.giaBan ?? product.GiaBan ?? 0);
        const hinhAnh = product.hinhAnh || product.HinhAnh || DEFAULT_PRODUCT_IMAGE;
        const maSP = product.maSP || product.MaSP || getProductIdFromQueryString();

        setBuyNowItem({
            maSP,
            tenSP,
            giaBan,
            hinhAnh,
            soLuongTon
        }, soLuong);

        window.location.href = "thanhtoan.html?buynow=1";
    });
}

// ----------------------------------------------------------
// THÊM VÀO GIỎ HÀNG (dùng module dùng chung js/cart.js)
// ----------------------------------------------------------
function bindAddToCartEvent(product) {
    const btn = document.getElementById("addToCartBtn");
    if (!btn) return;

    const soLuongTon = product.soLuongTon !== undefined ? product.soLuongTon : (product.SoLuongTon || 0);

    // Sản phẩm hết hàng thì khóa luôn nút, tránh cho vào giỏ số lượng không có thật
    if (soLuongTon <= 0) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-ban"></i> Hết Hàng`;
        return;
    }

    btn.addEventListener("click", () => {
        const qtyInput = document.getElementById("product-quantity");
        const soLuong = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

        const tenSP = product.tenSP || product.TenSP || "";
        const giaBan = Number(product.giaBan ?? product.GiaBan ?? 0);
        const hinhAnh = product.hinhAnh || product.HinhAnh || DEFAULT_PRODUCT_IMAGE;
        const maSP = product.maSP || product.MaSP || getProductIdFromQueryString();

        addToCart({
            maSP,
            tenSP,
            giaBan,
            hinhAnh,
            soLuongTon
        }, soLuong);

        showCartToast(`Đã thêm "${tenSP}" vào giỏ hàng.`);
    });
}

// ----------------------------------------------------------
// TRẠNG THÁI: LOADING / LỖI
// ----------------------------------------------------------
function showDetailLoading() {
    const section = document.getElementById("productDetailSection");
    const msg = document.getElementById("productDetailMessage");
    if (section) section.style.display = "none";
    if (msg) {
        msg.style.display = "block";
        msg.className = "product-message is-loading";
        msg.innerHTML = `<span class="spinner"></span> Đang tải dữ liệu...`;
    }
}

function showDetailError(text) {
    const section = document.getElementById("productDetailSection");
    const msg = document.getElementById("productDetailMessage");
    if (section) section.style.display = "none";
    if (msg) {
        msg.style.display = "block";
        msg.className = "product-message is-error";
        msg.textContent = text;
    }
}

function hideDetailMessage() {
    const section = document.getElementById("productDetailSection");
    const msg = document.getElementById("productDetailMessage");
    if (section) section.style.display = "";
    if (msg) {
        msg.style.display = "none";
        msg.innerHTML = "";
    }
}

// ----------------------------------------------------------
// HÀM TIỆN ÍCH
// ----------------------------------------------------------
function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
}

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

// Đọc danh sách tên Nhà Cung Cấp từ trường "nhaCungCaps"/"NhaCungCaps" mà
// GET /api/san-pham/{id} trả về (dạng [{ maNcc, tenNcc }, ...]), nối lại
// thành 1 chuỗi hiển thị (VD: "Nội Thất Việt, Gỗ Hoàng Anh").
function getNhaCungCapNames(p) {
    const nhaCungCaps = p.nhaCungCaps || p.NhaCungCaps || [];
    return nhaCungCaps
        .map(n => n.tenNcc || n.TenNcc)
        .filter(Boolean)
        .join(", ");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}