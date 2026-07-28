// ============================================================
// cart.js
// Module GIỎ HÀNG dùng chung cho toàn bộ Storefront (index, sanpham,
// chitiet-sanpham, giohang, thanhtoan).
//
// Vì CSDL hiện tại CHƯA có bảng GIOHANG, giỏ hàng được lưu tạm ở phía
// Client bằng localStorage (giống mô hình "Local Cart" phổ biến), và
// CHỈ được đẩy lên Backend (POST /api/hoa-don) đúng 1 lần khi Khách hàng
// bấm "Đặt Hàng Ngay" ở trang thanh toán (thanhtoan.html).
//
// Cấu trúc 1 item trong giỏ:
// { maSP, tenSP, giaBan, hinhAnh, soLuong, soLuongTon }
// ============================================================

const CART_STORAGE_KEY = "luxuryfurniture_cart";
const CART_MAX_QTY = 99; // Chặn nhập số lượng vô lý

// Ảnh mặc định dùng SVG nội bộ (data URI) - luôn hiển thị được kể cả khi
// mất mạng hoặc dịch vụ ảnh ngoài ngừng hoạt động. Dùng chung style với
// sanpham.js để đồng nhất trải nghiệm.
const CART_DEFAULT_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
        <rect width='100%' height='100%' fill='#f0f0f0'/>
        <text x='50%' y='50%' font-family='Arial, sans-serif' font-size='14' fill='#9e9e9e' text-anchor='middle' dominant-baseline='middle'>Luxury Furniture</text>
    </svg>`
);

// ----------------------------------------------------------
// ĐỌC / GHI GIỎ HÀNG
// ----------------------------------------------------------
function getCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        const cart = raw ? JSON.parse(raw) : [];
        return Array.isArray(cart) ? cart : [];
    } catch (e) {
        console.error("Lỗi đọc giỏ hàng từ localStorage:", e);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
    // Cho phép các trang khác tự làm mới khi giỏ hàng thay đổi (vd sau khi
    // thêm sản phẩm ở chitiet-sanpham.js thì badge ở navbar cũng cập nhật).
    window.dispatchEvent(new CustomEvent("cart:changed", { detail: cart }));
}

// ----------------------------------------------------------
// THÊM / SỬA / XÓA SẢN PHẨM TRONG GIỎ
// ----------------------------------------------------------

/**
 * Thêm sản phẩm vào giỏ. Nếu đã tồn tại thì cộng dồn số lượng.
 * product: { maSP, tenSP, giaBan, hinhAnh, soLuongTon }
 */
function addToCart(product, soLuong = 1) {
    if (!product || !product.maSP) return null;

    soLuong = Math.max(1, parseInt(soLuong, 10) || 1);

    const cart = getCart();
    const existing = cart.find(item => item.maSP === product.maSP);

    const tonKho = (product.soLuongTon !== undefined && product.soLuongTon !== null)
        ? Number(product.soLuongTon)
        : null;

    if (existing) {
        let newQty = existing.soLuong + soLuong;
        if (tonKho !== null) newQty = Math.min(newQty, tonKho);
        existing.soLuong = Math.min(newQty, CART_MAX_QTY);
        if (tonKho !== null) existing.soLuongTon = tonKho;
        if (product.giaBan !== undefined) existing.giaBan = Number(product.giaBan) || 0;
    } else {
        let qty = soLuong;
        if (tonKho !== null) qty = Math.min(qty, tonKho);
        cart.push({
            maSP: product.maSP,
            tenSP: product.tenSP || "",
            giaBan: Number(product.giaBan) || 0,
            hinhAnh: product.hinhAnh || "",
            soLuong: Math.min(qty, CART_MAX_QTY),
            soLuongTon: tonKho
        });
    }

    saveCart(cart);
    return cart;
}

/** Đặt số lượng tuyệt đối cho 1 sản phẩm đã có trong giỏ (dùng cho ô nhập số lượng). */
function updateCartItemQuantity(maSP, soLuong) {
    const cart = getCart();
    const item = cart.find(x => x.maSP === maSP);
    if (!item) return cart;

    soLuong = parseInt(soLuong, 10);
    if (isNaN(soLuong) || soLuong < 1) soLuong = 1;

    if (item.soLuongTon !== null && item.soLuongTon !== undefined) {
        soLuong = Math.min(soLuong, item.soLuongTon);
    }
    item.soLuong = Math.min(soLuong, CART_MAX_QTY);

    saveCart(cart);
    return cart;
}

function removeFromCart(maSP) {
    const cart = getCart().filter(x => x.maSP !== maSP);
    saveCart(cart);
    return cart;
}

function clearCart() {
    saveCart([]);
}

// ----------------------------------------------------------
// "MUA NGAY" - đặt hàng nhanh 1 sản phẩm, KHÔNG trộn vào giỏ hàng chính.
// Lưu tạm ở sessionStorage (khác localStorage của giỏ hàng) để trang
// thanhtoan.html có thể ưu tiên đọc đúng 1 sản phẩm này khi thanh toán,
// mà không ảnh hưởng tới các sản phẩm khác khách đã bỏ vào giỏ trước đó.
// ----------------------------------------------------------
const BUY_NOW_STORAGE_KEY = "luxuryfurniture_buynow";

/**
 * Lưu 1 sản phẩm để mua ngay (thay thế item cũ nếu có).
 * product: { maSP, tenSP, giaBan, hinhAnh, soLuongTon }
 */
function setBuyNowItem(product, soLuong = 1) {
    if (!product || !product.maSP) return null;

    soLuong = Math.max(1, parseInt(soLuong, 10) || 1);

    const tonKho = (product.soLuongTon !== undefined && product.soLuongTon !== null)
        ? Number(product.soLuongTon)
        : null;
    if (tonKho !== null) soLuong = Math.min(soLuong, tonKho);

    const item = {
        maSP: product.maSP,
        tenSP: product.tenSP || "",
        giaBan: Number(product.giaBan) || 0,
        hinhAnh: product.hinhAnh || "",
        soLuong: Math.min(soLuong, CART_MAX_QTY),
        soLuongTon: tonKho
    };

    sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(item));
    return item;
}

function getBuyNowItem() {
    try {
        const raw = sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error("Lỗi đọc dữ liệu Mua Ngay:", e);
        return null;
    }
}

function clearBuyNowItem() {
    sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
}

// ----------------------------------------------------------
// TÍNH TOÁN
// ----------------------------------------------------------
function getCartCount() {
    return getCart().reduce((sum, item) => sum + (Number(item.soLuong) || 0), 0);
}

function getCartTotal() {
    return getCart().reduce((sum, item) => sum + (Number(item.soLuong) || 0) * (Number(item.giaBan) || 0), 0);
}

// ----------------------------------------------------------
// CẬP NHẬT SỐ LƯỢNG TRÊN ICON GIỎ HÀNG (mọi trang có .cart-count)
// ----------------------------------------------------------
function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll(".cart-count").forEach(el => {
        el.textContent = count;
    });
}

// ----------------------------------------------------------
// TIỆN ÍCH DÙNG CHUNG
// ----------------------------------------------------------
function formatCurrencyVND(value) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
}

function escapeHtmlCart(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

/** Kiểm tra người dùng đã đăng nhập hay chưa (dựa vào token lưu ở localStorage). */
function isLoggedIn() {
    return !!localStorage.getItem("token");
}

// ----------------------------------------------------------
// TOAST thông báo nhỏ góc màn hình (thay cho alert() gây khó chịu)
// ----------------------------------------------------------
function showCartToast(message, type = "success") {
    let container = document.getElementById("cartToastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "cartToastContainer";
        container.style.cssText = "position:fixed;top:90px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const bgColor = type === "error" ? "#d32f2f" : "#2e7d32";
    toast.style.cssText = `background:${bgColor};color:#fff;padding:12px 18px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-size:14px;max-width:320px;opacity:0;transform:translateX(20px);transition:opacity .25s ease, transform .25s ease;`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(0)";
    });

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(20px)";
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
