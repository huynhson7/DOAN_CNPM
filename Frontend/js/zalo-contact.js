// ============================================================
// js/zalo-contact.js
// Dùng CHUNG cho mọi trang có nút/icon "Liên hệ nhân viên chăm sóc khách
// hàng qua Zalo" (icon tin nhắn nổi góc phải + mục "Liên Hệ" trên navbar).
//
// Thay vì chuyển hướng sang link Zalo, ấn vào các phần tử có class
// "zalo-contact-trigger" sẽ mở 1 Modal hiển thị ảnh mã QR Zalo để khách
// dùng app Zalo quét trực tiếp.
//
// Tái sử dụng class .modal/.modal-content/.modal-header/.modal-body/
// .modal-footer đã có sẵn trong style.css để đồng bộ giao diện với các
// Modal khác trong hệ thống (giống cách js/auth-guard.js tạo Modal xem
// thông tin tài khoản).
// ============================================================

const ZALO_QR_IMAGE_PATH = "img/zalo-qr.png";

document.addEventListener("DOMContentLoaded", setupZaloContactTriggers);

/** Gắn sự kiện click mở Modal QR cho mọi phần tử có class "zalo-contact-trigger". */
function setupZaloContactTriggers() {
    document.querySelectorAll(".zalo-contact-trigger").forEach(function (el) {
        el.addEventListener("click", function (event) {
            event.preventDefault();
            openZaloQrModal();
        });
    });
}

/** Tạo (nếu chưa có) khung HTML của Modal mã QR Zalo và gắn vào cuối <body>. */
function ensureZaloQrModalDom() {
    if (document.getElementById("zaloQrModal")) return;

    const modalEl = document.createElement("div");
    modalEl.id = "zaloQrModal";
    modalEl.className = "modal";
    modalEl.innerHTML = `
        <div class="modal-content" style="max-width: 380px; text-align: center;">
            <div class="modal-header">
                <h3><i class="fas fa-comment-dots"></i> Liên Hệ Qua Zalo</h3>
                <span class="close-btn" id="zaloQrModalCloseIcon">&times;</span>
            </div>
            <div class="modal-body">
                <p style="margin: 0 0 15px; color: #555;">
                    Dùng ứng dụng Zalo trên điện thoại quét mã QR bên dưới để trò
                    chuyện trực tiếp với nhân viên chăm sóc khách hàng.
                </p>
                <img src="${ZALO_QR_IMAGE_PATH}"
                     alt="Mã QR Zalo liên hệ nhân viên chăm sóc khách hàng"
                     style="width: 100%; max-width: 280px; border-radius: 8px; border: 1px solid #eee;">
            </div>
            <div class="modal-footer" style="justify-content: center;">
                <button type="button" class="btn-outline" id="zaloQrModalCloseBtn">Đóng</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalEl);

    document.getElementById("zaloQrModalCloseIcon").addEventListener("click", closeZaloQrModal);
    document.getElementById("zaloQrModalCloseBtn").addEventListener("click", closeZaloQrModal);

    // Ấn ra ngoài vùng nội dung (nền mờ) để đóng Modal
    modalEl.addEventListener("click", function (event) {
        if (event.target === modalEl) closeZaloQrModal();
    });
}

function openZaloQrModal() {
    ensureZaloQrModalDom();
    const modalEl = document.getElementById("zaloQrModal");
    if (modalEl) modalEl.style.display = "flex";
}

function closeZaloQrModal() {
    const modalEl = document.getElementById("zaloQrModal");
    if (modalEl) modalEl.style.display = "none";
}
