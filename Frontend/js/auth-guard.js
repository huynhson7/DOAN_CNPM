// ============================================================
// auth-guard.js
// CHỈ dùng để Frontend tự nhận biết Role từ JWT nhằm ẩn/hiện giao diện cho tiện UX.
// KHÔNG phải là lớp bảo mật - Backend ([Authorize(Roles=...)]) mới là nơi quyết định quyền thật sự.
// Mọi request quan trọng vẫn phải qua kiểm tra ở Backend dù Frontend có ẩn nút hay không.
// ============================================================

function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    // Kiểm tra hết hạn phía Client để chủ động đăng xuất, tránh gọi API bằng token đã hết hạn
    if (payload.exp && Date.now() >= payload.exp * 1000) {
        logout();
        return null;
    }

    return {
        role: payload['role'] || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
        username: payload['Username'],
        fullName: payload['unique_name'] || payload['name'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
        email: payload['email'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        userId: payload['nameid'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
    };
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('hoTen');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
}

/**
 * Ẩn/hiện các phần tử có [data-role="Admin,NhanVien"] theo Role hiện tại.
 * Gọi hàm này ở cuối mỗi trang cần phân quyền hiển thị.
 */
function applyRoleBasedUI() {
    const user = getCurrentUser();
    const role = user ? user.role : null;

    document.querySelectorAll('[data-role]').forEach(el => {
        const allowedRoles = el.getAttribute('data-role').split(',').map(r => r.trim());
        el.style.display = role && allowedRoles.includes(role) ? '' : 'none';
    });
}

/**
 * Hiển thị thông tin tài khoản đang đăng nhập ở khu vực ".user-profile" trên
 * góc phải Header - áp dụng cho MỌI trang Admin (được gọi cùng lúc với
 * applyRoleBasedUI() mỗi khi trang tải xong).
 *
 * Quy tắc hiển thị:
 * - Quản trị Hệ thống (Admin) -> "Xin chào, Admin!"
 * - NV Bán Hàng             -> "Xin chào, {Tên nhân viên}!"
 * - Các trường hợp khác     -> "Xin chào, {Họ tên}!" (nếu có)
 */
function renderAccountGreeting() {
    const nameEl = document.querySelector('.user-profile span');
    const imgEl = document.querySelector('.user-profile img');
    if (!nameEl) return;

    const hoTen = localStorage.getItem('hoTen');
    const role = localStorage.getItem('userRole');

    if (!role && !hoTen) return; // Chưa đăng nhập - giữ nguyên chữ mặc định có sẵn trong HTML

    let text;
    if (role === 'Quản trị Hệ thống') {
        text = 'Xin chào, Admin!';
    } else if (hoTen) {
        text = `Xin chào, ${hoTen}!`;
    } else {
        text = 'Xin chào!';
    }

    nameEl.textContent = text;

    if (imgEl) {
        const avatarName = role === 'Quản trị Hệ thống' ? 'Admin' : (hoTen || 'User');
        imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=1a1a1a&color=fff`;
        imgEl.alt = avatarName;
    }
}

document.addEventListener('DOMContentLoaded', applyRoleBasedUI);
document.addEventListener('DOMContentLoaded', renderAccountGreeting);
document.addEventListener('DOMContentLoaded', setupAccountProfileClick);

document.addEventListener('DOMContentLoaded', setupModalBodyScrollLock);

/**
 * Khoá cuộn trang nền (<body>) mỗi khi có bất kỳ Modal nào (class ".modal") đang mở,
 * và mở khoá lại khi không còn Modal nào mở. Nếu không có cơ chế này, khi 1 Modal
 * đang hiển thị đè lên trang, trang nền phía sau (VD: bảng danh sách dài hơn màn
 * hình) vẫn còn thanh cuộn riêng của nó hoạt động song song với thanh cuộn của
 * chính Modal -> gây ra tình trạng "2 thanh cuộn thừa" đã gặp.
 *
 * Dùng MutationObserver theo dõi thuộc tính "style" của mọi phần tử trong <body>
 * (kể cả các Modal được JS tạo ra sau, như #accountInfoModal) để tự động phát
 * hiện lúc Modal được bật/tắt (đổi display) mà KHÔNG cần sửa lại từng nơi gọi
 * openModal()/closeModal() ở tất cả các trang.
 */
function setupModalBodyScrollLock() {
    function syncBodyScrollLock() {
        const anyModalOpen = Array.from(document.querySelectorAll('.modal')).some(
            modalEl => window.getComputedStyle(modalEl).display !== 'none'
        );
        document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    }

    const modalScrollObserver = new MutationObserver(syncBodyScrollLock);
    modalScrollObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: true
    });

    syncBodyScrollLock();
}

/**
 * Chặn truy cập TRỰC TIẾP vào một trang nếu Role hiện tại không nằm trong danh sách cho phép.
 * Gọi hàm này ở NGAY ĐẦU <body> (trước khi nội dung trang render) của các trang chỉ dành riêng
 * cho 1 số Role nhất định, ví dụ: requireRole(['Quản trị Hệ thống']).
 *
 * Đây LÀ lớp bảo vệ giao diện (chặn hiển thị/điều hướng đi nơi khác), giúp Nhân viên/Khách hàng
 * không thể vào trang bằng cách gõ thẳng URL. Tuy nhiên lớp bảo vệ THẬT SỰ vẫn luôn là Backend
 * ([Authorize(Roles = ...)]) - Frontend chỉ hỗ trợ trải nghiệm người dùng.
 *
 * @param {string[]} allowedRoles - Danh sách Role được phép xem trang này.
 * @param {string} redirectUrl - Nơi điều hướng tới nếu không có quyền (mặc định: login.html).
 */
function requireRole(allowedRoles, redirectUrl) {
    const user = getCurrentUser();

    if (!user) {
        // Chưa đăng nhập -> về trang đăng nhập
        window.location.replace('login.html');
        return;
    }

    if (!allowedRoles.includes(user.role)) {
        // Đã đăng nhập nhưng không đủ quyền -> đưa về trang phù hợp với Role của họ,
        // không cho thấy dù chỉ 1 khung hình của trang bị chặn.
        const fallback = redirectUrl || (
            (user.role === 'Quản trị Hệ thống' || user.role === 'NV Bán Hàng')
                ? 'admin_sanpham.html'
                : 'index.html'
        );
        window.location.replace(fallback);
    }
}

// ============================================================
// MODAL "XEM THÔNG TIN TÀI KHOẢN" - DÙNG CHUNG CHO MỌI TRANG
// ============================================================
// Mục tiêu: ở bất kỳ trang nào (Admin/Nhân viên/Khách hàng) sau khi đăng nhập,
// ấn vào khu vực "Xin chào, ..." trên góc phải Header đều xem được thông tin
// của chính tài khoản đang đăng nhập - giống cách trang Quản lý Hóa Đơn
// (hoadon.html) đã làm cho Nhân viên/Admin từ trước.
//
// Trang nào ĐÃ tự xử lý riêng việc này (hoadon.html có sẵn thuộc tính
// onclick="openProfileModal()") thì hàm setupAccountProfileClick() bên dưới
// sẽ TỰ ĐỘNG bỏ qua, không gắn thêm hành vi để tránh xung đột.
// ============================================================

/**
 * Gắn sự kiện ấn vào khu vực ".user-profile" (nếu có và trang chưa tự xử lý
 * riêng) để mở Modal xem thông tin tài khoản. Được gọi cùng lúc với
 * applyRoleBasedUI()/renderAccountGreeting() mỗi khi trang tải xong.
 */
function setupAccountProfileClick() {
    const profileEl = document.querySelector('.user-profile');
    if (!profileEl) return;

    // Trang đã tự có sẵn hành vi riêng khi ấn vào (VD: hoadon.html) -> không can thiệp
    if (profileEl.hasAttribute('onclick')) return;

    const token = localStorage.getItem('token');
    if (!token) return; // Chưa đăng nhập thì chưa cần xem thông tin tài khoản

    profileEl.style.cursor = 'pointer';
    profileEl.title = 'Xem thông tin tài khoản';
    profileEl.addEventListener('click', openAccountInfoModal);
}

/**
 * Tạo (nếu chưa có) khung HTML của Modal xem thông tin tài khoản và gắn vào
 * cuối <body>. Tái sử dụng các class .modal/.modal-content/.input-group...
 * đã có sẵn trong style.css nên không cần thêm CSS riêng.
 */
function ensureAccountInfoModalDom() {
    if (document.getElementById('accountInfoModal')) return;

    const modalEl = document.createElement('div');
    modalEl.id = 'accountInfoModal';
    modalEl.className = 'modal';
    modalEl.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-id-card"></i> Thông Tin Tài Khoản</h3>
                <span class="close-btn" id="accountInfoModalCloseIcon">&times;</span>
            </div>
            <div class="modal-body" id="accountInfoModalBody"></div>
            <div class="modal-footer">
                <button type="button" class="btn-outline" id="accountInfoModalCloseBtn">Đóng</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalEl);

    document.getElementById('accountInfoModalCloseIcon').addEventListener('click', closeAccountInfoModal);
    document.getElementById('accountInfoModalCloseBtn').addEventListener('click', closeAccountInfoModal);

    // Ấn ra ngoài vùng nội dung (nền mờ) để đóng Modal - dùng addEventListener
    // (không dùng window.onclick) để không ghi đè lên window.onclick mà một số
    // trang khác đã tự định nghĩa riêng cho Modal của họ.
    document.addEventListener('click', function (event) {
        if (event.target === modalEl) closeAccountInfoModal();
    });
}

function closeAccountInfoModal() {
    const modalEl = document.getElementById('accountInfoModal');
    if (modalEl) modalEl.style.display = 'none';
}

/** Escape chuỗi trước khi chèn vào HTML để tránh lỗi hiển thị/XSS. */
function escapeHtmlForAccountInfo(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Dựng 1 dòng thông tin dạng ô nhập chỉ đọc (readonly), đồng bộ giao diện với các Modal khác trong hệ thống. */
function buildAccountInfoRow(label, value) {
    return `<div class="input-group">
        <label>${escapeHtmlForAccountInfo(label)}</label>
        <input type="text" value="${escapeHtmlForAccountInfo(value)}" readonly style="background-color:#f5f5f5; cursor: default;">
    </div>`;
}

/** Định dạng Ngày Sinh kiểu ISO ("yyyy-MM-ddTHH:mm:ss") về dd/mm/yyyy cho dễ đọc. */
function formatNgaySinhForAccountInfo(value) {
    if (!value) return '';
    const datePart = String(value).split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return datePart;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Dựng nội dung thông tin cho tài khoản Admin/Nhân viên (dữ liệu lấy từ
 * GET /api/nhan-vien/{id} - endpoint đã tồn tại sẵn, chỉ yêu cầu đã đăng nhập).
 */
function renderStaffAccountInfoRows(data) {
    const trangThaiText = (data.trangThai === 1 || data.trangThai === '1') ? 'Đang hoạt động' : 'Đã khóa';
    return [
        buildAccountInfoRow('Mã Nhân Viên', data.maNV),
        buildAccountInfoRow('Tên Đăng Nhập', data.tenDangNhap),
        buildAccountInfoRow('Họ Và Tên', data.tenNV),
        buildAccountInfoRow('Email', data.email),
        buildAccountInfoRow('Ngày Sinh', formatNgaySinhForAccountInfo(data.ngaySinh)),
        buildAccountInfoRow('Giới Tính', data.gioiTinh),
        buildAccountInfoRow('Số Điện Thoại', data.soDT),
        buildAccountInfoRow('Địa Chỉ', data.diaChiNV),
        buildAccountInfoRow('Vai Trò', data.vaiTro),
        buildAccountInfoRow('Trạng Thái Làm Việc', data.trangThaiLamViec),
        buildAccountInfoRow('Trạng Thái Tài Khoản', trangThaiText)
    ].join('');
}

/**
 * Dựng nội dung thông tin cho tài khoản Khách hàng. Backend hiện chỉ cho phép
 * Admin/Nhân viên tra cứu bảng KHACHHANG (dữ liệu nhạy cảm - xem
 * KhachHangController), nên Khách hàng tự xem thông tin CỦA MÌNH bằng chính
 * dữ liệu đã có sẵn từ phiên đăng nhập (JWT + localStorage), không cần gọi API.
 */
function renderCustomerAccountInfoRows(userId) {
    const user = getCurrentUser();
    const hoTen = localStorage.getItem('hoTen');
    return [
        buildAccountInfoRow('Mã Khách Hàng', userId),
        buildAccountInfoRow('Họ Và Tên', hoTen),
        buildAccountInfoRow('Tên Đăng Nhập', user ? user.username : ''),
        buildAccountInfoRow('Email', user ? user.email : '')
    ].join('');
}

/**
 * Mở Modal xem thông tin tài khoản đang đăng nhập. Có thể gọi trực tiếp từ
 * bất kỳ trang nào đã tải auth-guard.js (kể cả các trang không có khu vực
 * ".user-profile" theo cấu trúc trang Admin, ví dụ index.html/sanpham.html).
 */
async function openAccountInfoModal() {
    ensureAccountInfoModalDom();

    const modalEl = document.getElementById('accountInfoModal');
    const bodyEl = document.getElementById('accountInfoModalBody');
    modalEl.style.display = 'flex';
    bodyEl.innerHTML = '<p style="text-align:center;color:#888;">Đang tải thông tin...</p>';

    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!userId || !token) {
        bodyEl.innerHTML = '<p style="text-align:center;color:#e74c3c;">Bạn cần đăng nhập để xem thông tin tài khoản.</p>';
        return;
    }

    if (role === 'Quản trị Hệ thống' || role === 'NV Bán Hàng') {
        try {
            const res = await fetch(`http://localhost:5129/api/nhan-vien/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Không thể tải thông tin.');
            const data = await res.json();
            bodyEl.innerHTML = renderStaffAccountInfoRows(data);
        } catch (err) {
            console.error('Lỗi tải thông tin tài khoản:', err);
            bodyEl.innerHTML = '<p style="text-align:center;color:#e74c3c;">Không thể tải thông tin tài khoản. Vui lòng thử lại.</p>';
        }
    } else {
        bodyEl.innerHTML = renderCustomerAccountInfoRows(userId);
    }
}