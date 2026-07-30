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