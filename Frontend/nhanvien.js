// 0. BẢO MẬT TRUY CẬP (FRONTEND ROUTE GUARD)
// ==========================================
(function checkAccess() {
    const userRole = localStorage.getItem('userRole');
    // Nếu chưa đăng nhập, hoặc vai trò không chứa chữ "quản trị" / "admin"
    if (!userRole || (!userRole.toLowerCase().includes('quản trị') && !userRole.toLowerCase().includes('admin'))) {
        alert("Bạn không có quyền truy cập vào trang Quản lý Nhân Viên!");
        window.location.href = 'hoadon.html';
    }
})();
// ==========================================
// 1. CÁC HÀM XỬ LÝ GIAO DIỆN (UI) VÀ TRẠNG THÁI
// ==========================================
const nvModal = document.getElementById("nvModal");
let isEditMode = false;

function openNvModal() {
    isEditMode = false;
    document.getElementById('nvForm').reset();
    document.getElementById('maNV').readOnly = false;
    document.getElementById('nvPassword').required = true;
    document.getElementById('nvConfirmPassword').required = true;
    document.querySelector('button[form="nvForm"]').innerText = "Lưu Nhân Viên";
    nvModal.style.display = "flex";
}

function closeNvModal() {
    nvModal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target === nvModal) {
        closeNvModal();
    }
}

function togglePassword() {
    const pwdInput = document.getElementById("nvPassword");
    const icon = document.querySelector(".toggle-password");
    if (pwdInput.type === "password") {
        pwdInput.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        pwdInput.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

// ==========================================
// 2. CẤU HÌNH API
// ==========================================
const API_NHAN_VIEN = "http://localhost:5129/api/nhan-vien";

// Hàm hỗ trợ lấy Token để gắn vào Header
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ==========================================
// 3. HÀM LẤY VÀ HIỂN THỊ DANH SÁCH (GET)
// ==========================================
async function loadDanhSachNhanVien() {
    try {
        const response = await fetch(API_NHAN_VIEN, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            alert("Vui lòng đăng nhập để xem danh sách nhân viên!");
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) throw new Error("Lỗi mạng khi tải dữ liệu");

        const danhSachNV = await response.json();
        const tbody = document.getElementById('bangNhanVien');
        tbody.innerHTML = "";

        danhSachNV.forEach(nv => {
            let roleClass = nv.vaiTroKhuVucPhuTrach === "Quản lý Cửa hàng" ? "role-manager" : "role-staff";
            let statusClass = nv.trangThaiLamViec === "Đang làm việc" ? "badge-active" : "badge-inactive";

            const row = `
                <tr>
                    <td>${nv.maNV}</td>
                    <td>${nv.tenNV}</td>
                    <td>${nv.soDT}</td>
                    <td><span class="role-badge ${roleClass}">${nv.vaiTro}</span></td>
                    <td><span class="badge ${statusClass}">${nv.trangThaiLamViec}</span></td>
                    <td>
                        <button class="btn-action edit" title="Sửa" onclick="openEditModal('${nv.maNV}')"><i class="fas fa-pen"></i></button>
                        <button class="btn-action delete" title="Xóa" onclick="deleteNhanVien('${nv.maNV}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Không thể tải danh sách nhân viên từ máy chủ!");
    }
}

document.addEventListener("DOMContentLoaded", loadDanhSachNhanVien);

// ==========================================
// 4. HÀM MỞ MODAL ĐỂ SỬA NHÂN VIÊN (GET BY ID)
// ==========================================
async function openEditModal(maNV) {
    try {
        const response = await fetch(`${API_NHAN_VIEN}/${maNV}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            alert("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
            return;
        }

        if (!response.ok) throw new Error("Không thể lấy thông tin nhân viên.");

        const nv = await response.json();

        document.getElementById('maNV').value = nv.maNV;
        document.getElementById('maNV').readOnly = true;

        document.getElementById('tenDangNhap').value = nv.tenDangNhap;
        document.getElementById('nvEmail').value = nv.email;

        // Mật khẩu đã mã hoá không được Backend trả về (bảo mật), nên để trống 2 ô này khi Sửa
        // và không bắt buộc nhập lại vì việc cập nhật thông tin không làm thay đổi mật khẩu.
        document.getElementById('nvPassword').value = "";
        document.getElementById('nvPassword').required = false;
        document.getElementById('nvConfirmPassword').value = "";
        document.getElementById('nvConfirmPassword').required = false;

        document.getElementById('tenNV').value = nv.tenNV;

        if (nv.ngaySinh) {
            const dateObj = new Date(nv.ngaySinh);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            document.getElementById('ngaySinh').value = `${year}-${month}-${day}`;
        }

        document.getElementById('gioiTinh').value = nv.gioiTinh;
        document.getElementById('soDT').value = nv.soDT;
        document.getElementById('diaChiNV').value = nv.diaChiNV;
        //document.getElementById('vaiTroKhuVucPhuTrach').value = nv.vaiTroKhuVucPhuTrach;
        document.getElementById('trangThaiLamViec').value = nv.trangThaiLamViec;

        isEditMode = true;
        document.querySelector('button[form="nvForm"]').innerText = "Lưu thay đổi";
        nvModal.style.display = "flex";
    } catch (error) {
        console.error("Lỗi lấy dữ liệu sửa:", error);
        alert("Có lỗi xảy ra khi tải thông tin nhân viên này!");
    }
}

// ==========================================
// 5. HÀM XÓA NHÂN VIÊN (DELETE)
// ==========================================
async function deleteNhanVien(maNV) {
    const xacNhan = confirm("Bạn có chắc chắn muốn xóa nhân viên này!");

    if (xacNhan) {
        try {
            const response = await fetch(`${API_NHAN_VIEN}/${maNV}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.status === 403) {
                alert("Từ chối truy cập: Chỉ Quản trị hệ thống mới có quyền xóa nhân viên!");
                return;
            }

            if (response.ok) {
                alert("Xóa nhân viên thành công!");
                loadDanhSachNhanVien();
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Lỗi khi xóa nhân viên");
            }
        } catch (error) {
            console.error("Lỗi xóa dữ liệu:", error);
            alert("Lỗi kết nối đến máy chủ!");
        }
    }
}

// ==========================================
// 6. XỬ LÝ SỰ KIỆN SUBMIT FORM (Cho cả THÊM và SỬA)
// ==========================================
const formNhanVien = document.getElementById('nvForm');

formNhanVien.addEventListener('submit', async function (event) {
    event.preventDefault();

    const dateInput = document.getElementById('ngaySinh').value;
    const ngaySinhISO = new Date(dateInput).toISOString();

    const payload = {
        maNV: document.getElementById('maNV').value.trim(),
        tenDangNhap: document.getElementById('tenDangNhap').value.trim(),
        email: document.getElementById('nvEmail').value.trim(),
        matKhau: document.getElementById('nvPassword').value,
        confirmMatKhau: document.getElementById('nvConfirmPassword').value,
        tenNV: document.getElementById('tenNV').value.trim(),
        ngaySinh: ngaySinhISO,
        gioiTinh: document.getElementById('gioiTinh').value,
        soDT: document.getElementById('soDT').value.trim(),
        diaChiNV: document.getElementById('diaChiNV').value.trim(),
        //vaiTroKhuVucPhuTrach: document.getElementById('vaiTroKhuVucPhuTrach').value,
        vaiTro: document.getElementById('vaiTroHeThong').value, // Vai trò phân quyền thật sự: "Quản trị Hệ thống" | "NV Bán Hàng"
        trangThaiLamViec: document.getElementById('trangThaiLamViec').value,
        trangThai: 0
    };

    const btnLuu = document.querySelector('button[form="nvForm"]');
    const apiUrl = isEditMode ? `${API_NHAN_VIEN}/${payload.maNV}` : API_NHAN_VIEN;
    const apiMethod = isEditMode ? 'PUT' : 'POST';

    try {
        btnLuu.disabled = true;
        btnLuu.innerText = "Đang xử lý...";

        const response = await fetch(apiUrl, {
            method: apiMethod,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (response.status === 403) {
            alert("Từ chối truy cập: Chỉ Quản trị hệ thống mới có quyền Thêm/Sửa nhân viên!");
            return;
        }

        if (response.ok) {
            alert(isEditMode ? "Cập nhật hồ sơ nhân viên thành công!" : "Thêm hồ sơ nhân viên thành công!");
            formNhanVien.reset();
            closeNvModal();
            loadDanhSachNhanVien();
        } else {
            const errorData = await response.json();
            alert(errorData.message);
        }
    } catch (error) {
        console.error("Lỗi gửi dữ liệu:", error);
        alert("Lỗi kết nối tới Server. Hãy đảm bảo API đang chạy!");
    } finally {
        btnLuu.disabled = false;
        btnLuu.innerText = isEditMode ? "Lưu thay đổi" : "Lưu Nhân Viên";
    }
});

// ==========================================
// 7. HÀM TÌM KIẾM NHÂN VIÊN (TÌM TRỰC TIẾP TRÊN BẢNG)
// ==========================================
const searchInput = document.getElementById('timKiemNV');

if (searchInput) {
    searchInput.addEventListener('input', function () {
        const keyword = this.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#bangNhanVien tr');

        rows.forEach(row => {
            const rowData = row.textContent.toLowerCase();

            if (rowData.includes(keyword)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    });
}