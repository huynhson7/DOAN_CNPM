// ==========================================
// 1. CÁC HÀM XỬ LÝ GIAO DIỆN (UI) VÀ TRẠNG THÁI
// ==========================================
const nvModal = document.getElementById("nvModal");
let isEditMode = false; // Biến theo dõi trạng thái đang Thêm hay Sửa

// Mở Modal cho chức năng THÊM MỚI
function openNvModal() { 
    isEditMode = false;
    document.getElementById('nvForm').reset(); // Xóa sạch dữ liệu cũ
    
    // Mở khóa ô Mã NV và đặt lại chữ cho nút
    document.getElementById('maNV').readOnly = false;
    document.querySelector('button[form="nvForm"]').innerText = "Lưu Nhân Viên";
    
    nvModal.style.display = "flex"; 
}

function closeNvModal() { 
    nvModal.style.display = "none"; 
}

window.onclick = function(event) {
    if (event.target === nvModal) {
        closeNvModal();
    }
}

// Hàm Ẩn/Hiện mật khẩu
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

// ==========================================
// 3. HÀM LẤY VÀ HIỂN THỊ DANH SÁCH (GET)
// ==========================================
async function loadDanhSachNhanVien() {
    try {
        const response = await fetch(API_NHAN_VIEN);
        if (!response.ok) throw new Error("Lỗi mạng khi tải dữ liệu");
        
        const danhSachNV = await response.json();
        const tbody = document.getElementById('bangNhanVien');
        tbody.innerHTML = ""; // Xóa dữ liệu tĩnh/cũ

        danhSachNV.forEach(nv => {
            // Xử lý hiển thị CSS Badge
            let roleClass = nv.vaiTroKhuVucPhuTrach === "Quản lý Cửa hàng" ? "role-manager" : "role-staff";
            let statusClass = nv.trangThaiLamViec === "Đang làm việc" ? "badge-active" : "badge-inactive";

            // Đã đổi icon lock thành trash và gắn sự kiện onclick cho Edit và Delete
            const row = `
                <tr>
                    <td>${nv.maNV}</td>
                    <td>${nv.tenNV}</td>
                    <td>${nv.soDT}</td>
                    <td><span class="role-badge ${roleClass}">${nv.vaiTroKhuVucPhuTrach}</span></td>
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

// Chạy hàm load danh sách ngay khi trang web tải xong
document.addEventListener("DOMContentLoaded", loadDanhSachNhanVien);

// ==========================================
// 4. HÀM MỞ MODAL ĐỂ SỬA NHÂN VIÊN (GET BY ID)
// ==========================================
async function openEditModal(maNV) {
    try {
        // Lấy thông tin chi tiết của nhân viên từ Server
        const response = await fetch(`${API_NHAN_VIEN}/${maNV}`);
        if (!response.ok) throw new Error("Không thể lấy thông tin nhân viên.");
        
        const nv = await response.json();

        // Điền dữ liệu vào form
        document.getElementById('maNV').value = nv.maNV;
        document.getElementById('maNV').readOnly = true; // Khóa không cho sửa Mã NV
        
        document.getElementById('tenDangNhap').value = nv.tenDangNhap;
        document.getElementById('nvPassword').value = nv.matKhau;
        document.getElementById('tenNV').value = nv.tenNV;
        
        // Xử lý chuyển đổi ngày sinh thành định dạng YYYY-MM-DD để đưa vào thẻ input type="date"
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
        document.getElementById('vaiTroKhuVucPhuTrach').value = nv.vaiTroKhuVucPhuTrach;
        document.getElementById('trangThaiLamViec').value = nv.trangThaiLamViec;

        // Chuyển trạng thái sang Cập nhật và đổi chữ trên nút
        isEditMode = true;
        document.querySelector('button[form="nvForm"]').innerText = "Lưu thay đổi";
        
        // Mở Modal
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
    // Hàm confirm mặc định của trình duyệt sẽ hiển thị OK/Cancel (hoặc Có/Hủy tùy ngôn ngữ máy tính)
    const xacNhan = confirm("Bạn có chắc chắn muốn xóa nhân viên này!");
    
    if (xacNhan) {
        try {
            const response = await fetch(`${API_NHAN_VIEN}/${maNV}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Xóa nhân viên thành công!");
                loadDanhSachNhanVien(); // Tải lại bảng sau khi xóa
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

formNhanVien.addEventListener('submit', async function(event) {
    event.preventDefault(); // Chặn tải lại trang

    // Thu thập ngày sinh và chuyển đổi sang chuẩn ISO
    const dateInput = document.getElementById('ngaySinh').value;
    const ngaySinhISO = new Date(dateInput).toISOString();

    // Gom dữ liệu vào Object
    const payload = {
        maNV: document.getElementById('maNV').value.trim(),
        tenDangNhap: document.getElementById('tenDangNhap').value.trim(),
        matKhau: document.getElementById('nvPassword').value,
        tenNV: document.getElementById('tenNV').value.trim(),
        ngaySinh: ngaySinhISO,
        gioiTinh: document.getElementById('gioiTinh').value,
        soDT: document.getElementById('soDT').value.trim(),
        diaChiNV: document.getElementById('diaChiNV').value.trim(),
        vaiTroKhuVucPhuTrach: document.getElementById('vaiTroKhuVucPhuTrach').value,
        trangThaiLamViec: document.getElementById('trangThaiLamViec').value,
        trangThai: 0 // Giá trị mặc định
    };

    const btnLuu = document.querySelector('button[form="nvForm"]');

    // Xác định URL và Phương thức gọi API dựa trên chế độ Thêm hay Sửa
    const apiUrl = isEditMode ? `${API_NHAN_VIEN}/${payload.maNV}` : API_NHAN_VIEN;
    const apiMethod = isEditMode ? 'PUT' : 'POST';

    try {
        btnLuu.disabled = true;
        btnLuu.innerText = "Đang xử lý...";

        const response = await fetch(apiUrl, {
            method: apiMethod,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

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
        // Phục hồi lại trạng thái nút bấm
        btnLuu.disabled = false;
        btnLuu.innerText = isEditMode ? "Lưu thay đổi" : "Lưu Nhân Viên";
    }
});

// ==========================================
// 7. HÀM TÌM KIẾM NHÂN VIÊN (TÌM TRỰC TIẾP TRÊN BẢNG)
// ==========================================
const searchInput = document.getElementById('timKiemNV');

if (searchInput) {
    searchInput.addEventListener('input', function() {
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