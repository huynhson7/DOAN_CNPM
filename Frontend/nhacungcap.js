// ==========================================
// 1. CÁC HÀM XỬ LÝ GIAO DIỆN (UI) VÀ TRẠNG THÁI
// ==========================================
const nccModal = document.getElementById("nccModal");
let isEditMode = false; // Biến theo dõi trạng thái đang Thêm hay Sửa

// Mở Modal cho chức năng THÊM MỚI
function openNccModal() {
    isEditMode = false;
    document.getElementById('nccForm').reset(); // Xóa sạch dữ liệu cũ

    // Mở khóa ô Mã NCC và đặt lại chữ cho nút
    document.getElementById('maNCC').readOnly = false;
    document.querySelector('button[form="nccForm"]').innerText = "Lưu Nhà Cung Cấp";

    nccModal.style.display = "flex";
}

function closeNccModal() {
    nccModal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target === nccModal) {
        closeNccModal();
    }
}

// ==========================================
// 2. CẤU HÌNH API
// ==========================================
const API_NHA_CUNG_CAP = "http://localhost:5129/api/nha-cung-cap";

// ==========================================
// 3. HÀM LẤY VÀ HIỂN THỊ DANH SÁCH (GET)
// ==========================================
async function loadDanhSachNhaCungCap() {
    try {
        const response = await fetch(API_NHA_CUNG_CAP);
        if (!response.ok) throw new Error("Lỗi mạng khi tải dữ liệu");

        const danhSachNCC = await response.json();
        const tbody = document.getElementById('bangNhaCungCap');
        tbody.innerHTML = ""; // Xóa dữ liệu cũ

        danhSachNCC.forEach(ncc => {
            const row = `
                <tr>
                    <td>${ncc.maNcc}</td>
                    <td>${ncc.tenNcc}</td>
                    <td>${ncc.moTaNcc || ''}</td>
                    <td>
                        <button class="btn-action edit" title="Sửa" onclick="openEditModal('${ncc.maNcc}')"><i class="fas fa-pen"></i></button>
                        <button class="btn-action delete" title="Xóa" onclick="deleteNhaCungCap('${ncc.maNcc}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Không thể tải danh sách nhà cung cấp từ máy chủ!");
    }
}

// Chạy hàm load danh sách ngay khi trang web tải xong
document.addEventListener("DOMContentLoaded", loadDanhSachNhaCungCap);

// ==========================================
// 4. HÀM MỞ MODAL ĐỂ SỬA NHÀ CUNG CẤP (GET BY ID)
// ==========================================
async function openEditModal(maNcc) {
    try {
        // Lấy thông tin chi tiết từ Server
        const response = await fetch(`${API_NHA_CUNG_CAP}/${maNcc}`);
        if (!response.ok) throw new Error("Không thể lấy thông tin nhà cung cấp.");

        const ncc = await response.json();

        // Điền dữ liệu vào form (Lưu ý: Map chính xác với thuộc tính từ API trả về)
        document.getElementById('maNCC').value = ncc.maNcc;
        document.getElementById('maNCC').readOnly = true; // Khóa không cho sửa Mã NCC

        document.getElementById('tenNCC').value = ncc.tenNcc;
        document.getElementById('moTaNCC').value = ncc.moTaNcc || '';

        // Chuyển trạng thái sang Cập nhật và đổi chữ trên nút
        isEditMode = true;
        document.querySelector('button[form="nccForm"]').innerText = "Lưu thay đổi";

        // Mở Modal
        nccModal.style.display = "flex";
    } catch (error) {
        console.error("Lỗi lấy dữ liệu sửa:", error);
        alert("Có lỗi xảy ra khi tải thông tin nhà cung cấp này!");
    }
}

// ==========================================
// 5. HÀM XÓA NHÀ CUNG CẤP (DELETE)
// ==========================================
async function deleteNhaCungCap(maNcc) {
    const xacNhan = confirm("Bạn có chắc chắn muốn xóa nhà cung cấp này?");

    if (xacNhan) {
        try {
            const response = await fetch(`${API_NHA_CUNG_CAP}/${maNcc}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || "Xóa nhà cung cấp thành công!");
                loadDanhSachNhaCungCap(); // Tải lại bảng sau khi xóa
            } else {
                alert(data.message || "Lỗi khi xóa nhà cung cấp");
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
const formNhaCungCap = document.getElementById('nccForm');

formNhaCungCap.addEventListener('submit', async function (event) {
    event.preventDefault(); // Chặn tải lại trang

    // Gom dữ liệu vào Object (Khớp chính xác từng chữ hoa/thường với Model C#)
    const payload = {
        maNcc: document.getElementById('maNCC').value.trim(),
        tenNcc: document.getElementById('tenNCC').value.trim(),
        moTaNcc: document.getElementById('moTaNCC').value.trim()
    };

    const btnLuu = document.querySelector('button[form="nccForm"]');

    // Xác định URL và Phương thức gọi API dựa trên chế độ Thêm hay Sửa
    const apiUrl = isEditMode ? `${API_NHA_CUNG_CAP}/${payload.maNcc}` : API_NHA_CUNG_CAP;
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

        const data = await response.json();

        if (response.ok) {
            alert(isEditMode ? (data.message || "Cập nhật thành công!") : "Thêm nhà cung cấp thành công!");
            formNhaCungCap.reset();
            closeNccModal();
            loadDanhSachNhaCungCap();
        } else {
            alert(data.message || "Có lỗi xảy ra, vui lòng kiểm tra lại dữ liệu.");
        }
    } catch (error) {
        console.error("Lỗi gửi dữ liệu:", error);
        alert("Lỗi kết nối tới Server. Hãy đảm bảo API đang chạy!");
    } finally {
        // Phục hồi lại trạng thái nút bấm
        btnLuu.disabled = false;
        btnLuu.innerText = isEditMode ? "Lưu thay đổi" : "Lưu Nhà Cung Cấp";
    }
});

// ==========================================
// 7. HÀM TÌM KIẾM NHÀ CUNG CẤP (TÌM TRỰC TIẾP TRÊN BẢNG)
// ==========================================
const searchInput = document.getElementById('timKiemNCC');

if (searchInput) {
    searchInput.addEventListener('input', function () {
        const keyword = this.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#bangNhaCungCap tr');

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