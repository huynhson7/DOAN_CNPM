// ==========================================
// 1. CÁC HÀM XỬ LÝ GIAO DIỆN (UI)
// ==========================================
const khModal = document.getElementById("khModal");
const formKhachHang = document.getElementById('khForm');
let isEditModeKH = false;

function closeKhModal() {
    khModal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target === khModal) closeKhModal();
}

// ==========================================
// 2. CẤU HÌNH API
// ==========================================
const API_KHACH_HANG = "http://localhost:5129/api/khach-hang";

// ==========================================
// 2b. PHÂN QUYỀN THEO ROLE (KHACHHANG - khachhang.html)
// - Quản trị Hệ thống: Toàn quyền sửa, xóa.
// - NV Bán Hàng: Chỉ được XEM thông tin cơ bản, không được sửa/xóa
//   (khớp với Backend: PUT/DELETE api/khach-hang/{id} chỉ Admin gọi được).
// ==========================================
const isAdminKH = (localStorage.getItem('userRole') || '') === 'Quản trị Hệ thống';

// ==========================================
// 3. HIỂN THỊ DANH SÁCH (GET)
// ==========================================
async function loadDanhSachKH() {
    try {
        const token = localStorage.getItem('token'); // Lấy token đã lưu khi đăng nhập
        const response = await fetch(API_KHACH_HANG, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại!");
                // window.location.href = 'login.html'; // Chuyển hướng về trang đăng nhập nếu cần
            }
            throw new Error("Lỗi mạng hoặc không có quyền truy cập");
        }

        const danhSach = await response.json();
        const tbody = document.getElementById('bangKhachHang');
        tbody.innerHTML = "";

        danhSach.forEach(kh => {
            const trangThaiHTML = kh.trangThai === 1
                ? `<span style="color: green; font-weight: bold;">Hoạt động</span>`
                : `<span style="color: red; font-weight: bold;">Đã khóa</span>`;

            const row = `
                <tr>
                    <td><strong>${kh.maKhachHang}</strong></td>
                    <td>${kh.tenDangNhap || ''}</td>
                    <td>${kh.tenKhachHang}</td>
                    <td>${kh.sdtKhachHang}</td>
                    <td>${kh.diaChiKhachHang || ''}</td>
                    <td>${trangThaiHTML}</td>
                    <td>
                        ${isAdminKH
                            ? `<button class="btn-action edit" title="Sửa" onclick="openEditModalKH('${kh.maKhachHang}')"><i class="fas fa-pen"></i></button>
                        <button class="btn-action delete" title="Xóa" onclick="deleteKhachHang('${kh.maKhachHang}')"><i class="fas fa-trash"></i></button>`
                            : `<span style="color:#9e9e9e; font-size:13px;">Chỉ xem</span>`}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error("Lỗi:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadDanhSachKH);

// ==========================================
// 4. MỞ FORM ĐỂ SỬA (GET BY ID)
// ==========================================
async function openEditModalKH(maKH) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_KHACH_HANG}/${maKH}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Lỗi lấy thông tin");

        const kh = await response.json();

        // Đổ dữ liệu vào form
        document.getElementById('maKhachHang').value = kh.maKhachHang;
        document.getElementById('maKhachHang').readOnly = true;

        document.getElementById('tenDangNhap').value = kh.tenDangNhap;
        // [SỬA - FIX BUG] Không đổ MatKhau vào Form nữa: Backend không trả MatKhau về Client
        // (dữ liệu nhạy cảm) và Admin cũng không có quyền xem/sửa mật khẩu Khách hàng - ô này
        // luôn để trống và bị khóa (disabled) trong khachhang.html.
        document.getElementById('tenKhachHang').value = kh.tenKhachHang;
        document.getElementById('sdtKhachHang').value = kh.sdtKhachHang;
        document.getElementById('diaChiKhachHang').value = kh.diaChiKhachHang;
        document.getElementById('trangThai').value = kh.trangThai;

        document.getElementById('sdtError').style.display = "none";
        isEditModeKH = true;
        document.querySelector('button[form="khForm"]').innerText = "Lưu Thay Đổi";

        khModal.style.display = "flex";
    } catch (error) {
        alert("Lỗi tải thông tin khách hàng!");
    }
}

// ==========================================
// 5. XÓA KHÁCH HÀNG (DELETE)
// ==========================================
async function deleteKhachHang(maKH) {
    if (confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_KHACH_HANG}/${maKH}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                alert("Xóa thành công!");
                loadDanhSachKH();
            } else {
                alert("Không thể xóa khách hàng!");
            }
        } catch (error) {
            alert("Không thể kết nối đến máy chủ. Vui lòng thử lại sau!");
        }
    }
}

// ==========================================
// 6. LƯU KHÁCH HÀNG (POST / PUT)
// ==========================================
const regexSdt = /^\d{10}$/; // Yêu cầu chính xác 10 chữ số

formKhachHang.addEventListener('submit', async function (event) {
    event.preventDefault();

    const sdtInput = document.getElementById('sdtKhachHang');
    const sdtError = document.getElementById('sdtError');
    const sdtValue = sdtInput.value.trim();

    // VALIDATE BẰNG REGEX (Chặn tại Client)
    if (!regexSdt.test(sdtValue)) {
        sdtError.innerText = "Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 chữ số.";
        sdtError.style.display = "block";
        sdtInput.focus();
        return;
    } else {
        sdtError.style.display = "none";
    }

    // ĐÓNG GÓI DỮ LIỆU JSON CHUẨN DB
    // [SỬA - FIX BUG] Bỏ trường matKhau khỏi payload: Admin không có quyền xem/sửa mật khẩu
    // Khách hàng, và Backend (UpdateKhachHangDto) giờ cũng không còn nhận trường này nữa.
    const payload = {
        maKhachHang: document.getElementById('maKhachHang').value.trim(),
        tenDangNhap: document.getElementById('tenDangNhap').value.trim(),
        tenKhachHang: document.getElementById('tenKhachHang').value.trim(),
        sdtKhachHang: sdtValue,
        diaChiKhachHang: document.getElementById('diaChiKhachHang').value.trim(),
        trangThai: parseInt(document.getElementById('trangThai').value)
    };

    const btnLuu = document.querySelector('button[form="khForm"]');
    const apiUrl = isEditModeKH ? `${API_KHACH_HANG}/${payload.maKhachHang}` : API_KHACH_HANG;
    const apiMethod = isEditModeKH ? 'PUT' : 'POST';

    try {
        btnLuu.disabled = true;
        btnLuu.innerText = "Đang lưu...";

        const token = localStorage.getItem('token');
        const response = await fetch(apiUrl, {
            method: apiMethod,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        // BẮT LỖI TRÙNG SỐ ĐIỆN THOẠI (HTTP 409)
        if (response.status === 409) {
            const errorData = await response.json();
            sdtError.innerText = errorData.message || "Số điện thoại này đã được đăng ký!";
            sdtError.style.display = "block";
            sdtInput.focus();
            return;
        }

        if (response.ok) {
            alert(isEditModeKH ? "Cập nhật thành công!" : "Thêm Khách hàng thành công!");
            closeKhModal();
            loadDanhSachKH();
        } else {
            alert("Lỗi khi lưu dữ liệu!");
        }

    } catch (error) {
        alert("Không thể kết nối đến máy chủ. Vui lòng thử lại sau!");
    } finally {
        btnLuu.disabled = false;
        btnLuu.innerText = isEditModeKH ? "Lưu Thay Đổi" : "Lưu Khách Hàng";
    }
});

// ==========================================
// 7. TÌM KIẾM KHÁCH HÀNG (Lọc Client-side toàn bộ trường)
// ==========================================
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keyup', function () {
        const keyword = this.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#bangKhachHang tr');

        rows.forEach(row => {
            // Lấy toàn bộ nội dung text của cả dòng thay vì từng cột lẻ
            const rowData = row.textContent.toLowerCase();

            // Ẩn/hiện dòng dựa trên từ khóa tìm kiếm
            if (rowData.includes(keyword)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}