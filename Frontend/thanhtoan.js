// ==========================================================
// thanhtoan.js
// Trang: thanhtoan.html (Thanh toán)
//
// Luồng xử lý:
// 1. Bắt buộc đăng nhập bằng tài khoản Khách hàng (Backend yêu cầu JWT
//    khi gọi POST /api/hoa-don - xem [Authorize] ở HoaDonController).
// 2. Giỏ hàng (đọc từ localStorage qua js/cart.js) phải có sản phẩm.
// 3. Validate thông tin người nhận, gọi API tạo hóa đơn 1 LẦN DUY NHẤT
//    khi bấm "Đặt Hàng Ngay". Sau khi tạo thành công thì xóa giỏ hàng.
//
// Lưu ý: bảng HOADON hiện KHÔNG có cột lưu địa chỉ/SĐT giao hàng riêng
// cho từng đơn (chỉ có MaKhachHang tham chiếu tới KHACHHANG), nên thông
// tin người nhận/địa chỉ được đính kèm vào trường "MoTa" của mỗi dòng
// chi tiết hóa đơn để nhân viên xử lý đơn có thể xem được khi tra cứu.
// ==========================================================

const API_BASE = "http://localhost:5129/api";
const API_HOA_DON = `${API_BASE}/hoa-don`;

// Số điện thoại VN: bắt đầu bằng 0, theo sau 9-10 chữ số
const SDT_REGEX = /^0\d{9,10}$/;

document.addEventListener("DOMContentLoaded", init);

function init() {
    // 1. Phải đăng nhập bằng tài khoản Khách hàng mới được thanh toán
    if (!isLoggedIn()) {
        showGuardMessage(
            "Bạn cần đăng nhập để tiến hành thanh toán.",
            "login.html",
            "Đăng Nhập Ngay"
        );
        return;
    }

    const role = localStorage.getItem("userRole");
    if (role !== "Khách hàng") {
        showGuardMessage(
            "Chỉ tài khoản Khách hàng mới có thể đặt hàng trên Website. Vui lòng đăng nhập lại bằng tài khoản khách hàng.",
            "login.html",
            "Đăng Nhập Lại"
        );
        return;
    }

    // 2. Giỏ hàng phải có sản phẩm
    const cart = getCart();
    if (cart.length === 0) {
        showGuardMessage(
            "Giỏ hàng của bạn đang trống, vui lòng chọn thêm sản phẩm trước khi thanh toán.",
            "sanpham.html",
            "Tiếp Tục Mua Sắm"
        );
        return;
    }

    prefillCustomerInfo();
    renderOrderSummary(cart);
    bindFormSubmit();
}

// ----------------------------------------------------------
// TRẠNG THÁI CHẶN (chưa đăng nhập / sai vai trò / giỏ hàng trống)
// ----------------------------------------------------------
function showGuardMessage(text, linkHref, linkText) {
    const form = document.getElementById("checkoutForm");
    if (form) form.style.display = "none";

    const guardBox = document.getElementById("checkoutGuardMessage");
    if (guardBox) {
        guardBox.style.display = "block";
        guardBox.innerHTML = `
            <p style="font-size: 40px; margin-bottom: 10px;"><i class="fas fa-lock"></i></p>
            <p style="font-size: 17px; margin-bottom: 20px;">${escapeHtmlCart(text)}</p>
            <a href="${escapeHtmlCart(linkHref)}" class="btn-primary" style="display:inline-block;">${escapeHtmlCart(linkText)}</a>
        `;
    }
}

// ----------------------------------------------------------
// ĐIỀN SẴN THÔNG TIN NGƯỜI NHẬN TỪ PHIÊN ĐĂNG NHẬP (nếu có)
// ----------------------------------------------------------
function prefillCustomerInfo() {
    const hoTen = localStorage.getItem("hoTen");
    const hoTenInput = document.getElementById("checkoutHoTen");
    if (hoTen && hoTenInput) {
        hoTenInput.value = hoTen;
    }
}

// ----------------------------------------------------------
// RENDER TỔNG QUAN ĐƠN HÀNG (CỘT PHẢI)
// ----------------------------------------------------------
function renderOrderSummary(cart) {
    const itemsBox = document.getElementById("checkoutOrderItems");
    if (itemsBox) {
        itemsBox.innerHTML = cart.map(item => {
            const thanhTien = (item.soLuong || 0) * (item.giaBan || 0);
            return `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                    <span>${escapeHtmlCart(item.tenSP)} x ${item.soLuong}</span>
                    <span style="white-space: nowrap; margin-left: 10px;">${formatCurrencyVND(thanhTien)}</span>
                </div>
            `;
        }).join("");
    }

    const total = getCartTotal();
    const subtotalEl = document.getElementById("checkoutSubtotal");
    const totalEl = document.getElementById("checkoutGrandTotal");
    if (subtotalEl) subtotalEl.textContent = formatCurrencyVND(total);
    if (totalEl) totalEl.textContent = formatCurrencyVND(total);
}

// ----------------------------------------------------------
// XỬ LÝ SUBMIT FORM -> GỌI API TẠO HÓA ĐƠN
// ----------------------------------------------------------
function bindFormSubmit() {
    const form = document.getElementById("checkoutForm");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const errorBox = document.getElementById("checkoutError");
        if (errorBox) errorBox.textContent = "";

        const hoTen = document.getElementById("checkoutHoTen").value.trim();
        const sdt = document.getElementById("checkoutSdt").value.trim();
        const diaChi = document.getElementById("checkoutDiaChi").value.trim();
        const ghiChu = document.getElementById("checkoutGhiChu").value.trim();

        if (!hoTen) {
            showCheckoutFormError("Vui lòng nhập họ và tên người nhận.");
            return;
        }
        if (!SDT_REGEX.test(sdt)) {
            showCheckoutFormError("Số điện thoại không hợp lệ (VD: 0901234567).");
            return;
        }
        if (!diaChi) {
            showCheckoutFormError("Vui lòng nhập địa chỉ giao hàng.");
            return;
        }

        const cart = getCart();
        if (cart.length === 0) {
            showCheckoutFormError("Giỏ hàng trống, không thể đặt hàng.");
            return;
        }

        const btn = document.getElementById("btnPlaceOrder");
        const originalText = btn ? btn.innerHTML : "";
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang xử lý...`;
        }

        try {
            const ghiChuGiaoHang = buildGhiChuGiaoHang(hoTen, sdt, diaChi, ghiChu);

            const body = {
                MaKhachHang: localStorage.getItem("userId") || "",
                MaNV: "", // Để trống -> Backend tự gán "NV01" (Đơn Online)
                ChiTietSanPham: cart.map(item => ({
                    MaSP: item.maSP,
                    SoLuongBan: item.soLuong,
                    MoTa: ghiChuGiaoHang
                }))
            };

            const response = await fetch(API_HOA_DON, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
                },
                body: JSON.stringify(body)
            });

            let data = {};
            try { data = await response.json(); } catch (_) { /* body rỗng */ }

            if (!response.ok) {
                if (response.status === 401) {
                    showCheckoutFormError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                    setTimeout(() => { window.location.href = "login.html"; }, 1500);
                    return;
                }
                showCheckoutFormError(data.message || "Đặt hàng thất bại. Vui lòng thử lại.");
                return;
            }

            clearCart();
            showCheckoutSuccess(data.maHD);
        } catch (error) {
            console.error("Lỗi đặt hàng:", error);
            showCheckoutFormError("Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại Backend đang chạy hay chưa.");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    });
}

function buildGhiChuGiaoHang(hoTen, sdt, diaChi, ghiChu) {
    let note = `Người nhận: ${hoTen} | SĐT: ${sdt} | Địa chỉ giao hàng: ${diaChi}`;
    if (ghiChu) note += ` | Ghi chú: ${ghiChu}`;
    return note;
}

function showCheckoutFormError(message) {
    const errorBox = document.getElementById("checkoutError");
    if (errorBox) {
        errorBox.textContent = message;
        errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
        showCartToast(message, "error");
    }
}

// ----------------------------------------------------------
// MÀN HÌNH XÁC NHẬN ĐẶT HÀNG THÀNH CÔNG
// ----------------------------------------------------------
function showCheckoutSuccess(maHD) {
    const form = document.getElementById("checkoutForm");
    if (form) form.style.display = "none";

    const successBox = document.getElementById("checkoutSuccessBox");
    const detail = document.getElementById("checkoutSuccessDetail");

    if (detail) {
        detail.textContent = maHD
            ? `Cảm ơn bạn đã mua sắm! Mã đơn hàng của bạn là ${maHD}. Chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất.`
            : "Cảm ơn bạn đã mua sắm! Chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất.";
    }

    if (successBox) successBox.style.display = "block";
}
