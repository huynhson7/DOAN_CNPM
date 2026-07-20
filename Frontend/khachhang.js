// ==========================================
// 1. CÁC HÀM XỬ LÝ GIAO DIỆN (UI)
// ==========================================
const khModal = document.getElementById("khModal");
const formKhachHang = document.getElementById('khForm');
let isEditModeKH = false; 

function openKhModal() { 
    isEditModeKH = false;
    formKhachHang.reset(); 
    document.getElementById('maKhachHang').readOnly = false;
    document.getElementById('sdtError').style.display = "none"; // Ẩn lỗi cũ đi
    document.querySelector('button[form="khForm"]').innerText = "Lưu Khách Hàng";
    khModal.style.display = "flex"; 
}

function closeKhModal() { 
    khModal.style.display = "none"; 
}

window.onclick = function(event) {
    if (event.target === khModal) closeKhModal();
}

// ==========================================
// 2. CẤU HÌNH API
// ==========================================
const API_KHACH_HANG = "http://localhost:5129/api/khach-hang";

// ==========================================
// 3. HIỂN THỊ DANH SÁCH (GET)
// ==========================================
async function loadDanhSachKH() {
    try {
        const response = await fetch(API_KHACH_HANG);
        if (!response.ok) throw new Error("Lỗi mạng");
        
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
                        <button class="btn-action edit" title="Sửa" onclick="openEditModalKH('${kh.maKhachHang}')"><i class="fas fa-pen"></i></button>
                        <button class="btn-action delete" title="Xóa" onclick="deleteKhachHang('${kh.maKhachHang}')"><i class="fas fa-trash"></i></button>
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
        const response = await fetch(`${API_KHACH_HANG}/${maKH}`);
        if (!response.ok) throw new Error("Lỗi lấy thông tin");
        
        const kh = await response.json();

        // Đổ dữ liệu vào form
        document.getElementById('maKhachHang').value = kh.maKhachHang;
        document.getElementById('maKhachHang').readOnly = true; 
        
        document.getElementById('tenDangNhap').value = kh.tenDangNhap;
        document.getElementById('matKhau').value = kh.matKhau;
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
            const response = await fetch(`${API_KHACH_HANG}/${maKH}`, { method: 'DELETE' });
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

formKhachHang.addEventListener('submit', async function(event) {
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
    const payload = {
        maKhachHang: document.getElementById('maKhachHang').value.trim(),
        tenDangNhap: document.getElementById('tenDangNhap').value.trim(),
        matKhau: document.getElementById('matKhau').value.trim(),
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

        const response = await fetch(apiUrl, {
            method: apiMethod,
            headers: { 'Content-Type': 'application/json' },
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
    searchInput.addEventListener('keyup', function() {
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