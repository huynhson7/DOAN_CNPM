// ==========================================================
// giohang.js
// Trang: giohang.html (Giỏ hàng)
//
// Đọc giỏ hàng từ localStorage (qua js/cart.js) và render ra bảng.
// Toàn bộ thao tác (tăng/giảm số lượng, xóa sản phẩm) đều xử lý ở phía
// Client, KHÔNG gọi API - giỏ hàng chỉ thật sự "chốt" khi qua trang
// thanh toán (thanhtoan.html) và bấm "Đặt Hàng Ngay".
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
    renderCart();

    // Khi giỏ hàng bị thay đổi từ nơi khác (vd mở 2 tab), tự render lại
    window.addEventListener("cart:changed", renderCart);
});

function renderCart() {
    const cart = getCart();
    const cartWrapper = document.querySelector(".cart-wrapper");
    const itemsBox = document.querySelector(".cart-items");
    const summaryBox = document.querySelector(".cart-summary");

    let emptyBox = document.getElementById("cartEmptyMessage");
    if (!emptyBox) {
        emptyBox = document.createElement("div");
        emptyBox.id = "cartEmptyMessage";
        emptyBox.className = "product-message is-empty";
        emptyBox.style.cssText = "display:none; text-align:center; padding:80px 20px; width:100%;";
        emptyBox.innerHTML = `
            <p style="font-size: 40px; margin-bottom: 10px;"><i class="fas fa-shopping-cart"></i></p>
            <p style="font-size: 17px; margin-bottom: 20px;">Giỏ hàng của bạn đang trống.</p>
            <a href="sanpham.html" class="btn-primary" style="display:inline-block;">Tiếp Tục Mua Sắm</a>
        `;
        cartWrapper.parentElement.insertBefore(emptyBox, cartWrapper);
    }

    if (cart.length === 0) {
        cartWrapper.style.display = "none";
        emptyBox.style.display = "block";
        return;
    }

    emptyBox.style.display = "none";
    cartWrapper.style.display = "";

    renderCartTable(cart, itemsBox);
    renderCartSummary(cart);
}

// ----------------------------------------------------------
// BẢNG DANH SÁCH SẢN PHẨM
// ----------------------------------------------------------
function renderCartTable(cart, itemsBox) {
    let table = itemsBox.querySelector(".cart-table");
    if (!table) {
        itemsBox.innerHTML = `
            <table class="cart-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Đơn giá</th>
                        <th>Số lượng</th>
                        <th>Thành tiền</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="cartTableBody"></tbody>
            </table>
        `;
        table = itemsBox.querySelector(".cart-table");
        bindCartTableEvents(table);
    }

    const tbody = table.querySelector("#cartTableBody");
    tbody.innerHTML = cart.map(buildCartRowHtml).join("");
}

function buildCartRowHtml(item) {
    const thanhTien = (item.soLuong || 0) * (item.giaBan || 0);
    const hetHang = item.soLuongTon !== null && item.soLuongTon !== undefined && item.soLuongTon <= 0;
    const dangDatToiDaTonKho = item.soLuongTon !== null && item.soLuongTon !== undefined && item.soLuong >= item.soLuongTon;

    return `
        <tr data-ma-sp="${escapeHtmlCart(item.maSP)}">
            <td>
                <div class="cart-product-info">
                    <img src="${escapeHtmlCart(item.hinhAnh || CART_DEFAULT_IMAGE)}" alt="${escapeHtmlCart(item.tenSP)}"
                         onerror="this.onerror=null;this.src='${CART_DEFAULT_IMAGE}';">
                    <div class="cart-product-details">
                        <h4>${escapeHtmlCart(item.tenSP)}</h4>
                        ${hetHang ? `<p style="color:#d32f2f;">Sản phẩm hiện đã hết hàng</p>` : ``}
                    </div>
                </div>
            </td>
            <td style="font-weight: 600;">${formatCurrencyVND(item.giaBan)}</td>
            <td>
                <div class="quantity-selector">
                    <button type="button" class="qty-btn qty-minus">-</button>
                    <input type="number" class="qty-input" value="${item.soLuong}" min="1" max="${item.soLuongTon ?? CART_MAX_QTY}">
                    <button type="button" class="qty-btn qty-plus" ${dangDatToiDaTonKho ? "disabled" : ""}>+</button>
                </div>
            </td>
            <td style="font-weight: 700; color: var(--accent-color);">${formatCurrencyVND(thanhTien)}</td>
            <td>
                <button class="btn-action delete" title="Xóa khỏi giỏ"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `;
}

function bindCartTableEvents(table) {
    table.addEventListener("click", (e) => {
        const row = e.target.closest("tr[data-ma-sp]");
        if (!row) return;
        const maSP = row.getAttribute("data-ma-sp");

        if (e.target.closest(".qty-plus")) {
            const input = row.querySelector(".qty-input");
            const newQty = (parseInt(input.value, 10) || 1) + 1;
            updateCartItemQuantity(maSP, newQty);
            renderCart();
        } else if (e.target.closest(".qty-minus")) {
            const input = row.querySelector(".qty-input");
            const newQty = (parseInt(input.value, 10) || 1) - 1;
            if (newQty < 1) return; // Không cho giảm dưới 1 - phải bấm nút Xóa thay vì để 0
            updateCartItemQuantity(maSP, newQty);
            renderCart();
        } else if (e.target.closest(".delete")) {
            removeFromCart(maSP);
            showCartToast("Đã xóa sản phẩm khỏi giỏ hàng.");
            renderCart();
        }
    });

    table.addEventListener("change", (e) => {
        if (!e.target.classList.contains("qty-input")) return;
        const row = e.target.closest("tr[data-ma-sp]");
        const maSP = row.getAttribute("data-ma-sp");
        updateCartItemQuantity(maSP, e.target.value);
        renderCart();
    });
}

// ----------------------------------------------------------
// TỔNG KẾT ĐƠN HÀNG (CỘT PHẢI)
// ----------------------------------------------------------
function renderCartSummary(cart) {
    const tamTinh = getCartTotal();
    const tongCong = tamTinh; // Miễn phí vận chuyển theo chính sách hiện tại

    const tamTinhEl = document.getElementById("cartSubtotal");
    const tongCongEl = document.getElementById("cartGrandTotal");

    if (tamTinhEl) tamTinhEl.textContent = formatCurrencyVND(tamTinh);
    if (tongCongEl) tongCongEl.textContent = formatCurrencyVND(tongCong);

    // Chặn thanh toán nếu trong giỏ có sản phẩm đã hết hàng (tồn kho = 0)
    const btnCheckout = document.getElementById("btnCheckout");
    if (btnCheckout) {
        const coSanPhamHetHang = cart.some(item =>
            item.soLuongTon !== null && item.soLuongTon !== undefined && item.soLuongTon <= 0);

        if (coSanPhamHetHang) {
            btnCheckout.classList.add("disabled");
            btnCheckout.setAttribute("aria-disabled", "true");
            btnCheckout.addEventListener("click", blockCheckoutIfOutOfStock);
        } else {
            btnCheckout.classList.remove("disabled");
            btnCheckout.removeAttribute("aria-disabled");
            btnCheckout.removeEventListener("click", blockCheckoutIfOutOfStock);
        }
    }
}

function blockCheckoutIfOutOfStock(e) {
    e.preventDefault();
    showCartToast("Vui lòng xóa các sản phẩm đã hết hàng trước khi thanh toán.", "error");
}
