// ==========================================
// 1. CẤU HÌNH API
// ==========================================
const API_VAT_LIEU = "http://localhost:5129/api/vat-lieu";

// ==========================================
// 2. THAM CHIẾU CÁC PHẦN TỬ TRÊN GIAO DIỆN
// ==========================================
const vlModal = document.getElementById("vlModal");
const vlModalTitle = document.getElementById("vlModalTitle");
const vlForm = document.getElementById("vlForm");
const vlMaCode = document.getElementById("vlMaCode");
const vlTenVL = document.getElementById("vlTenVL");
const vlMoTa = document.getElementById("vlMoTa");
const searchInput = document.getElementById("searchVatLieuInput");
const vlTableBody = document.getElementById("vlTableBody");
const vlNoResultRow = document.getElementById("vlNoResultRow");
const btnLuuVL = document.querySelector('button[form="vlForm"]');

let isEditMode = false; // false = đang Thêm mới, true = đang Sửa

// ==========================================
// 3. HÀM HỖ TRỢ: GẮN TOKEN ĐĂNG NHẬP (NẾU CÓ) VÀO REQUEST
// Backend đang yêu cầu quyền Admin/Manager (JWT) cho Thêm/Sửa/Xóa
// (xem VatLieuController.cs). Khi module Đăng nhập lưu token thật vào
// localStorage với key "token", các request bên dưới sẽ tự động đính kèm.
// ==========================================
function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

// ==========================================
// 4. MỞ / ĐÓNG MODAL
// ==========================================
function openAddVlModal() {
    isEditMode = false;
    vlForm.reset();
    vlMaCode.readOnly = false;
    vlModalTitle.innerHTML = '<i class="fas fa-cubes"></i> Thông Tin Vật Liệu';
    btnLuuVL.innerText = "Lưu Thông Tin";
    vlModal.style.display = "flex";
}

async function openEditVlModal(maVL) {
    try {
        const response = await fetch(`${API_VAT_LIEU}/${maVL}`);
        if (!response.ok) throw new Error("Không thể lấy thông tin vật liệu.");

        const item = await response.json();

        vlMaCode.value = item.maVL;
        vlMaCode.readOnly = true; // Khóa không cho sửa Mã VL (khóa chính)
        vlTenVL.value = item.tenVL;
        // Lưu ý: bảng VATLIEU trong CSDL hiện chỉ có 2 cột MaVL, TenVL,
        // chưa có cột lưu mô tả nên không có dữ liệu để điền ở đây.
        vlMoTa.value = "";

        isEditMode = true;
        vlModalTitle.innerHTML = '<i class="fas fa-cubes"></i> Sửa Vật Liệu';
        btnLuuVL.innerText = "Lưu Thay Đổi";

        vlModal.style.display = "flex";
    } catch (error) {
        console.error("Lỗi lấy dữ liệu sửa:", error);
        alert("Có lỗi xảy ra khi tải thông tin vật liệu này!");
    }
}

function closeVlModal() {
    vlModal.style.display = "none";
    vlForm.reset();
    vlMaCode.readOnly = false;
}

window.onclick = function (event) {
    if (event.target === vlModal) closeVlModal();
};

// ==========================================
// 5. TẢI DANH SÁCH VẬT LIỆU TỪ SERVER (GET)
// ==========================================
async function loadDanhSachVatLieu() {
    try {
        const response = await fetch(API_VAT_LIEU);
        if (!response.ok) throw new Error("Lỗi mạng khi tải dữ liệu");

        const danhSachVL = await response.json();
        renderVlTable(danhSachVL);
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Không thể tải danh mục vật liệu từ máy chủ! Hãy đảm bảo Backend (http://localhost:5129) đang chạy.");
    }
}

function renderVlTable(list) {
    // Xóa các dòng dữ liệu cũ, giữ lại dòng "Không tìm thấy"
    vlTableBody.querySelectorAll("tr.vl-row").forEach(row => row.remove());

    list.forEach(item => {
        const tr = document.createElement("tr");
        tr.className = "vl-row";
        tr.dataset.id = item.maVL;
        tr.innerHTML = `
            <td><strong>${item.maVL}</strong></td>
            <td><span class="material-name"><i class="fas fa-cube"></i> ${item.tenVL}</span></td>
            <td style="text-align: center;">
                <button class="btn-action edit" title="Sửa" onclick="openEditVlModal('${item.maVL}')"><i class="fas fa-pen"></i></button>
                <button class="btn-action delete" title="Xóa" onclick="deleteVatLieu('${item.maVL}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        vlTableBody.insertBefore(tr, vlNoResultRow);
    });

    vlNoResultRow.style.display = list.length === 0 ? "" : "none";
}

// Chạy hàm tải danh sách ngay khi trang web tải xong
document.addEventListener("DOMContentLoaded", loadDanhSachVatLieu);

// ==========================================
// 6. XÓA VẬT LIỆU (DELETE)
// ==========================================
async function deleteVatLieu(maVL) {
    const xacNhan = confirm(`Bạn có chắc chắn muốn xóa vật liệu "${maVL}"?`);
    if (!xacNhan) return;

    try {
        const response = await fetch(`${API_VAT_LIEU}/${maVL}`, {
            method: "DELETE",
            headers: {
                ...getAuthHeaders()
            }
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            alert(data.message || "Xóa vật liệu thành công!");
            loadDanhSachVatLieu(); // Tải lại bảng sau khi xóa
        } else if (response.status === 401 || response.status === 403) {
            alert("Bạn không có quyền xóa vật liệu (cần đăng nhập với quyền Admin/Manager).");
        } else {
            alert(data.message || "Lỗi khi xóa vật liệu (có thể vật liệu này đang được dùng làm nền cho sản phẩm khác).");
        }
    } catch (error) {
        console.error("Lỗi xóa dữ liệu:", error);
        alert("Lỗi kết nối đến máy chủ!");
    }
}

// ==========================================
// 7. XỬ LÝ SỰ KIỆN SUBMIT FORM (CHO CẢ THÊM MỚI - POST và SỬA - PUT)
// ==========================================
vlForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Chặn tải lại trang

    // Gom dữ liệu vào Object, khớp chính xác với Model VATLIEU.cs (MaVL, TenVL)
    const payload = {
        maVL: vlMaCode.value.trim(),
        tenVL: vlTenVL.value.trim()
        // Lưu ý: bảng VATLIEU trong CSDL hiện chưa có cột lưu mô tả,
        // nên trường "Đặc Tính / Mô Tả" tạm thời chưa gửi lên server.
    };

    if (!payload.maVL || !payload.tenVL) return;

    const apiUrl = isEditMode ? `${API_VAT_LIEU}/${payload.maVL}` : API_VAT_LIEU;
    const apiMethod = isEditMode ? "PUT" : "POST";

    try {
        btnLuuVL.disabled = true;
        btnLuuVL.innerText = "Đang xử lý...";

        const response = await fetch(apiUrl, {
            method: apiMethod,
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders()
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            alert(isEditMode ? (data.message || "Cập nhật thành công!") : "Thêm vật liệu thành công!");
            closeVlModal();
            loadDanhSachVatLieu(); // Tải lại danh sách mới nhất từ CSDL
        } else if (response.status === 401 || response.status === 403) {
            alert("Bạn không có quyền thực hiện thao tác này (cần đăng nhập với quyền Admin/Manager).");
        } else {
            alert(data.message || "Có lỗi xảy ra, vui lòng kiểm tra lại dữ liệu.");
        }
    } catch (error) {
        console.error("Lỗi gửi dữ liệu:", error);
        alert("Lỗi kết nối tới Server. Hãy đảm bảo API đang chạy!");
    } finally {
        btnLuuVL.disabled = false;
        btnLuuVL.innerText = isEditMode ? "Lưu Thay Đổi" : "Lưu Thông Tin";
    }
});

// ==========================================
// 8. TÌM KIẾM VẬT LIỆU (LỌC THEO MÃ VL / TÊN / MÔ TẢ NGAY TRÊN BẢNG ĐÃ TẢI)
// ==========================================
function removeVietnameseTones(str) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .trim();
}

if (searchInput) {
    searchInput.addEventListener("input", function () {
        const keyword = removeVietnameseTones(this.value);
        const rows = vlTableBody.querySelectorAll("tr.vl-row");
        let visibleCount = 0;

        rows.forEach(row => {
            const rowText = removeVietnameseTones(row.textContent);
            if (rowText.includes(keyword)) {
                row.style.display = "";
                visibleCount++;
            } else {
                row.style.display = "none";
            }
        });

        vlNoResultRow.style.display = visibleCount === 0 ? "" : "none";
    });
}
