// ==========================================================
// nhomsanpham.js
// Trang: quantri.html (Quản Lý Nhóm Sản Phẩm)
//
// Chức năng:
// - Hiển thị danh sách nhóm sản phẩm (lấy từ bảng NHOMSANPHAM)
// - Tìm kiếm
// - Thêm
// - Sửa
// - Xóa
//
// Ghi chú:
// Trước đây trang này bị gắn nhầm file "admin_sanpham.js" (dùng
// chung id "bangDuLieu"), khiến bảng hiển thị dữ liệu SẢN PHẨM
// thay vì dữ liệu NHÓM SẢN PHẨM. File này thay thế "admin_sanpham.js"
// trong quantri.html để lấy đúng dữ liệu từ API nhom-san-pham.
// ==========================================================



// ==========================================================
// 1. CẤU HÌNH API
// ==========================================================

const API_BASE = "http://localhost:5129/api";
const API_NHOM_SP = `${API_BASE}/nhom-san-pham`;



// ==========================================================
// 1b. HÀM HỖ TRỢ LẤY TOKEN ĐĂNG NHẬP (JWT)
// ==========================================================

function getAuthHeaders() {

    const token = localStorage.getItem("token");

    return {

        "Content-Type": "application/json",

        "Authorization": `Bearer ${token}`

    };

}

function handleUnauthorized() {

    alert("Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại.");

    window.location.href = "login.html";

}

// Đọc JSON an toàn (tránh lỗi "Unexpected end of JSON input"
// khi response không có nội dung)
async function parseJsonSafe(response) {

    const text = await response.text();

    if (!text || text.trim() === "") {

        return null;

    }

    try {

        return JSON.parse(text);

    }

    catch (error) {

        console.error("Không thể parse JSON:", error, text);

        return null;

    }

}



// ==========================================================
// 2. BIẾN TOÀN CỤC
// ==========================================================

let allGroups = [];
let filteredGroups = [];

let isEditMode = false;
let editingId = null;



// ==========================================================
// 3. LẤY CÁC THÀNH PHẦN HTML
// ==========================================================

const tableBody = document.getElementById("bangDuLieu");

const searchInputEl = document.getElementById("searchInput");

const modalNhom = document.getElementById("nhomSanPhamModal");

const modalTitleNhom = document.querySelector("#nhomSanPhamModal .modal-header h3");

const formNhom = document.getElementById("nhomSanPhamForm");

const txtMaNhom = document.getElementById("maNhomSP_form");

const txtTenNhom = document.getElementById("tenNhomSP_form");

const selectTrangThai = document.getElementById("trangThaiNhom");

const btnSaveNhom = document.querySelector('#nhomSanPhamModal button[form="nhomSanPhamForm"]');



// ==========================================================
// 4. KHỞI TẠO TRANG
// ==========================================================

document.addEventListener("DOMContentLoaded", init);

async function init() {

    bindEvents();

    await loadGroups();

}



// ==========================================================
// 5. ĐĂNG KÝ SỰ KIỆN
// ==========================================================

function bindEvents() {

    // Nút "Thêm Nhóm Mới" đã gọi sẵn openModal() qua onclick trong HTML,
    // ở đây ta chỉ cần đảm bảo openModal() reset đúng chế độ Thêm.
    const btnAdd = document.querySelector('.page-header .btn-primary[onclick="openModal()"]');

    if (btnAdd) {

        btnAdd.addEventListener("click", prepareAddModal);

    }

    // Submit Form Thêm/Sửa
    if (formNhom) {

        formNhom.addEventListener("submit", saveGroup);

    }

    // Tìm kiếm realtime (dùng chung ô tìm kiếm trên header)
    if (searchInputEl) {

        searchInputEl.addEventListener("input", function () {

            const keyword = this.value.trim().toLowerCase();

            filterData(keyword);

        });

    }

    // Event Delegation cho nút Sửa/Xóa trong bảng
    if (tableBody) {

        tableBody.addEventListener("click", handleTableClick);

    }

}



// ==========================================================
// 6. LOAD DỮ LIỆU TỪ API
// ==========================================================

async function loadGroups() {

    showLoadingRow();

    try {

        const response = await fetch(API_NHOM_SP, {

            method: "GET",

            headers: getAuthHeaders()

        });

        if (response.status === 401) {

            handleUnauthorized();

            return;

        }

        if (!response.ok) {

            throw new Error("Không thể tải dữ liệu nhóm sản phẩm.");

        }

        allGroups = await parseJsonSafe(response) || [];

        filteredGroups = [...allGroups];

        renderTable(filteredGroups);

    }

    catch (error) {

        console.error(error);

        showErrorRow("Không thể kết nối máy chủ.");

    }

}



// ==========================================================
// 7. TÌM KIẾM REALTIME
// ==========================================================

function filterData(keyword) {

    if (keyword === "") {

        filteredGroups = [...allGroups];

    }

    else {

        filteredGroups = allGroups.filter(item => {

            const ma = getMaNhomSP(item).toLowerCase();
            const ten = getTenNhomSP(item).toLowerCase();

            return ma.includes(keyword) || ten.includes(keyword);

        });

    }

    renderTable(filteredGroups);

}



// ==========================================================
// 8. HIỂN THỊ DANH SÁCH
// ==========================================================

function renderTable(data) {

    if (!tableBody) return;

    if (!data || data.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;">
                    Không có nhóm sản phẩm nào.
                </td>
            </tr>
        `;

        return;

    }

    tableBody.innerHTML = data.map(item => {

        const maNhomSP = getMaNhomSP(item);
        const tenNhomSP = getTenNhomSP(item);
        const trangThai = getTrangThai(item);

        const isActive = trangThai === 1 || trangThai === "1";

        const badgeClass = isActive ? "badge-active" : "badge-inactive";
        const badgeText = isActive ? "Hoạt động" : "Tạm ngưng";

        return `
            <tr>
                <td>${escapeHtml(maNhomSP)}</td>
                <td>${escapeHtml(tenNhomSP)}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td>
                    <button class="btn-action edit" data-id="${maNhomSP}" title="Sửa">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-action delete" data-id="${maNhomSP}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;

    }).join("");

}



// ==========================================================
// 9. EVENT DELEGATION (Sửa / Xóa)
// ==========================================================

function handleTableClick(e) {

    const editButton = e.target.closest(".edit");

    if (editButton) {

        openEditModal(editButton.dataset.id);

        return;

    }

    const deleteButton = e.target.closest(".delete");

    if (deleteButton) {

        deleteGroup(deleteButton.dataset.id);

    }

}



// ==========================================================
// 10. MỞ MODAL THÊM
// ==========================================================

function prepareAddModal() {

    isEditMode = false;

    editingId = null;

    if (modalTitleNhom) {

        modalTitleNhom.textContent = "Thêm Nhóm Sản Phẩm Mới";

    }

    if (formNhom) {

        formNhom.reset();

    }

    if (txtMaNhom) {

        txtMaNhom.disabled = false;

    }

    if (btnSaveNhom) {

        btnSaveNhom.textContent = "Lưu Thay Đổi";

    }

}



// ==========================================================
// 11. MỞ MODAL SỬA
// ==========================================================

function openEditModal(id) {

    const item = allGroups.find(x => getMaNhomSP(x) === id);

    if (!item) {

        alert("Không tìm thấy dữ liệu.");

        return;

    }

    isEditMode = true;

    editingId = id;

    if (modalTitleNhom) {

        modalTitleNhom.textContent = "Cập Nhật Nhóm Sản Phẩm";

    }

    txtMaNhom.value = getMaNhomSP(item);

    txtTenNhom.value = getTenNhomSP(item);

    const trangThai = getTrangThai(item);

    selectTrangThai.value = (trangThai === 1 || trangThai === "1") ? "1" : "0";

    txtMaNhom.disabled = true;

    if (btnSaveNhom) {

        btnSaveNhom.textContent = "Cập Nhật";

    }

    if (modalNhom) {

        modalNhom.style.display = "flex";

    }

}



// ==========================================================
// 12. VALIDATE
// ==========================================================

function validateGroupForm() {

    const maNhomSP = txtMaNhom.value.trim();
    const tenNhomSP = txtTenNhom.value.trim();

    if (maNhomSP === "") {

        alert("Vui lòng nhập mã nhóm sản phẩm.");
        txtMaNhom.focus();
        return false;

    }

    if (tenNhomSP === "") {

        alert("Vui lòng nhập tên nhóm sản phẩm.");
        txtTenNhom.focus();
        return false;

    }

    if (maNhomSP.length > 15) {

        alert("Mã nhóm sản phẩm tối đa 15 ký tự.");
        txtMaNhom.focus();
        return false;

    }

    if (tenNhomSP.length > 100) {

        alert("Tên nhóm sản phẩm tối đa 100 ký tự.");
        txtTenNhom.focus();
        return false;

    }

    return true;

}



// ==========================================================
// 13. LƯU DỮ LIỆU (THÊM / SỬA)
// ==========================================================

async function saveGroup(e) {

    e.preventDefault();

    if (!validateGroupForm()) {

        return;

    }

    const model = {

        maNhomSP: txtMaNhom.value.trim(),

        tenNhomSP: txtTenNhom.value.trim(),

        trangThai: parseInt(selectTrangThai.value, 10)

    };

    if (isEditMode) {

        await updateGroup(model);

    }

    else {

        await createGroup(model);

    }

}



// ==========================================================
// 14. THÊM NHÓM SẢN PHẨM
// ==========================================================

async function createGroup(model) {

    try {

        if (btnSaveNhom) btnSaveNhom.disabled = true;

        const response = await fetch(API_NHOM_SP, {

            method: "POST",

            headers: getAuthHeaders(),

            body: JSON.stringify(model)

        });

        if (response.status === 401) {

            handleUnauthorized();

            return;

        }

        const result = await parseJsonSafe(response);

        if (!response.ok) {

            const message =
                (result && (result.message || result.title)) ||
                `Không thể thêm nhóm sản phẩm (mã lỗi ${response.status}).`;

            throw new Error(message);

        }

        closeModal();

        await loadGroups();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

    finally {

        if (btnSaveNhom) btnSaveNhom.disabled = false;

    }

}



// ==========================================================
// 15. CẬP NHẬT NHÓM SẢN PHẨM
// ==========================================================

async function updateGroup(model) {

    try {

        if (btnSaveNhom) btnSaveNhom.disabled = true;

        const response = await fetch(`${API_NHOM_SP}/${editingId}`, {

            method: "PUT",

            headers: getAuthHeaders(),

            body: JSON.stringify(model)

        });

        if (response.status === 401) {

            handleUnauthorized();

            return;

        }

        const result = await parseJsonSafe(response);

        if (!response.ok) {

            const message =
                (result && (result.message || result.title)) ||
                `Không thể cập nhật nhóm sản phẩm (mã lỗi ${response.status}).`;

            throw new Error(message);

        }

        closeModal();

        await loadGroups();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

    finally {

        if (btnSaveNhom) btnSaveNhom.disabled = false;

    }

}



// ==========================================================
// 16. XÓA NHÓM SẢN PHẨM
// ==========================================================

async function deleteGroup(id) {

    const confirmDelete = confirm("Bạn có chắc chắn muốn xóa nhóm sản phẩm này?");

    if (!confirmDelete) {

        return;

    }

    try {

        const response = await fetch(`${API_NHOM_SP}/${id}`, {

            method: "DELETE",

            headers: getAuthHeaders()

        });

        if (response.status === 401) {

            handleUnauthorized();

            return;

        }

        const result = await parseJsonSafe(response);

        if (!response.ok) {

            const message =
                (result && (result.message || result.title)) ||
                `Không thể xóa nhóm sản phẩm (mã lỗi ${response.status}).`;

            throw new Error(message);

        }

        await loadGroups();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}



// ==========================================================
// 17. ĐÓNG MODAL (ghi đè closeModal() khai báo trong quantri.html
// để reset lại form mỗi khi đóng)
// ==========================================================

const originalCloseModal = window.closeModal;

window.closeModal = function () {

    if (typeof originalCloseModal === "function") {

        originalCloseModal();

    }

    if (formNhom) formNhom.reset();

    if (txtMaNhom) txtMaNhom.disabled = false;

    isEditMode = false;

    editingId = null;

};



// ==========================================================
// 18. TRẠNG THÁI TẢI / LỖI
// ==========================================================

function showLoadingRow() {

    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center;">
                <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...
            </td>
        </tr>
    `;

}

function showErrorRow(message) {

    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center; color:#c0392b;">
                ${escapeHtml(message)}
            </td>
        </tr>
    `;

}



// ==========================================================
// 19. ESCAPE HTML (CHỐNG XSS)
// ==========================================================

function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = text ?? "";

    return div.innerHTML;

}



// ==========================================================
// 20. CHUẨN HÓA DỮ LIỆU API (hỗ trợ cả camelCase và PascalCase)
// ==========================================================

function getMaNhomSP(item) {

    return item.maNhomSP || item.MaNhomSP || "";

}

function getTenNhomSP(item) {

    return item.tenNhomSP || item.TenNhomSP || "";

}

function getTrangThai(item) {

    const value = item.trangThai !== undefined ? item.trangThai : item.TrangThai;

    return value !== undefined && value !== null ? value : 1;

}
