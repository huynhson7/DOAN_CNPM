// ==========================================================
// mucdichsudung.js
// Trang: mucdichsudung.html
//
// Quản lý Mục Đích Sử Dụng
//
// Chức năng:
// - Hiển thị danh sách
// - Tìm kiếm
// - Thêm
// - Sửa
// - Xóa
//
// Sử dụng:
// - Vanilla JavaScript
// - Fetch API
// - ASP.NET Core Web API
// ==========================================================



// ==========================================================
// 1. CẤU HÌNH API
// ==========================================================

const API_BASE = "http://localhost:5129/api";
const API_MUC_DICH = `${API_BASE}/muc-dich-su-dung`;



// ==========================================================
// 1b. HÀM HỖ TRỢ LẤY TOKEN ĐĂNG NHẬP (JWT)
// Gắn kèm vào header Authorization cho mọi request cần xác thực
// ==========================================================

function getAuthHeaders() {

    const token = localStorage.getItem("token");

    return {

        "Content-Type": "application/json",

        "Authorization": `Bearer ${token}`

    };

}



// ==========================================================
// 1c. XỬ LÝ KHI HẾT PHIÊN / CHƯA ĐĂNG NHẬP (401)
// ==========================================================

function handleUnauthorized() {

    alert("Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại.");

    window.location.href = "login.html";

}



// ==========================================================
// 2. BIẾN TOÀN CỤC
// ==========================================================

// Danh sách gốc lấy từ API
let allPurposes = [];

// Danh sách sau khi tìm kiếm
let filteredPurposes = [];

// true = đang sửa
// false = đang thêm
let isEditMode = false;

// Mã đang sửa
let editingId = null;



// ==========================================================
// 3. LẤY CÁC THÀNH PHẦN HTML
// ==========================================================

const tableBody = document.getElementById("mdTableBody");

const messageBox = document.getElementById("messageBox");

const searchInput = document.getElementById("searchInput");

const btnAdd = document.getElementById("btnAdd");

const modal = document.getElementById("mdModal");

const modalTitle = document.getElementById("modalTitle");

const mdForm = document.getElementById("mdForm");

const txtMaMD = document.getElementById("txtMaMD");

const txtTenMD = document.getElementById("txtTenMD");

const txtMoTaMD = document.getElementById("txtMoTaMD");

const btnSave = document.getElementById("btnSave");

const btnCancel = document.getElementById("btnCancel");

const btnCloseModal = document.getElementById("btnCloseModal");



// ==========================================================
// 4. KHỞI TẠO TRANG
// ==========================================================

document.addEventListener("DOMContentLoaded", init);

async function init() {

    bindEvents();

    await loadPurposes();

}



// ==========================================================
// 5. ĐĂNG KÝ SỰ KIỆN
// ==========================================================

function bindEvents() {

    //-------------------------------------------------------
    // Nút thêm
    //-------------------------------------------------------

    btnAdd.addEventListener("click", openAddModal);



    //-------------------------------------------------------
    // Submit Form
    //-------------------------------------------------------

    mdForm.addEventListener("submit", savePurpose);



    //-------------------------------------------------------
    // Đóng modal
    //-------------------------------------------------------

    btnCancel.addEventListener("click", closeModal);

    btnCloseModal.addEventListener("click", closeModal);



    //-------------------------------------------------------
    // Tìm kiếm realtime
    //-------------------------------------------------------

    searchInput.addEventListener("input", function () {

        const keyword = this.value
            .trim()
            .toLowerCase();

        filterData(keyword);

    });



    //-------------------------------------------------------
    // Event Delegation
    //-------------------------------------------------------

    tableBody.addEventListener("click", handleTableClick);

}



// ==========================================================
// 6. LOAD DỮ LIỆU TỪ API
// ==========================================================

async function loadPurposes() {

    showLoading();

    try {

        const response = await fetch(API_MUC_DICH, {

            method: "GET",

            headers: getAuthHeaders()

        });

        if (response.status === 401) {

            handleUnauthorized();

            return;

        }

        if (!response.ok) {

            throw new Error("Không thể tải dữ liệu.");

        }

        allPurposes = await response.json();

        filteredPurposes = [...allPurposes];

        renderTable(filteredPurposes);

    }

    catch (error) {

        console.error(error);

        showError("Không thể kết nối máy chủ.");

    }

}



// ==========================================================
// 7. TÌM KIẾM REALTIME
// ==========================================================

function filterData(keyword) {

    if (keyword === "") {

        filteredPurposes = [...allPurposes];

    }

    else {

        filteredPurposes = allPurposes.filter(item => {

            const ma = (item.maMD || item.MaMD || "")
                .toLowerCase();

            const ten = (item.tenMD || item.TenMD || "")
                .toLowerCase();

            const mota = (item.moTaMD || item.MoTaMD || "")
                .toLowerCase();

            return (

                ma.includes(keyword)

                ||

                ten.includes(keyword)

                ||

                mota.includes(keyword)

            );

        });

    }

    renderTable(filteredPurposes);

}
// ==========================================================
// 8. HIỂN THỊ DANH SÁCH
// ==========================================================

function renderTable(data) {

    hideMessage();

    if (!data || data.length === 0) {

        tableBody.innerHTML = "";

        showEmpty("Không có mục đích sử dụng.");

        return;
    }

    tableBody.innerHTML = data.map(item => {

        const maMD = item.maMD || item.MaMD || "";
        const tenMD = item.tenMD || item.TenMD || "";
        const moTaMD = item.moTaMD || item.MoTaMD || "";

        return `
            <tr>

                <td>
                    <strong>${escapeHtml(maMD)}</strong>
                </td>

                <td class="purpose-title">
                    ${escapeHtml(tenMD)}
                </td>

                <td>
                    ${escapeHtml(moTaMD)}
                </td>

                <td style="text-align:center;">

                    <button
                        class="btn-action edit"
                        data-id="${maMD}"
                        title="Sửa">

                        <i class="fas fa-pen"></i>

                    </button>

                    <button
                        class="btn-action delete"
                        data-id="${maMD}"
                        title="Xóa">

                        <i class="fas fa-trash"></i>

                    </button>

                </td>

            </tr>
        `;

    }).join("");

}



// ==========================================================
// 9. EVENT DELEGATION
// ==========================================================

function handleTableClick(e) {

    const editButton = e.target.closest(".edit");

    if (editButton) {

        openEditModal(editButton.dataset.id);

        return;

    }

    const deleteButton = e.target.closest(".delete");

    if (deleteButton) {

        deletePurpose(deleteButton.dataset.id);

    }

}



// ==========================================================
// 10. MỞ MODAL THÊM
// ==========================================================

function openAddModal() {

    isEditMode = false;

    editingId = null;

    modalTitle.innerHTML =
        '<i class="fas fa-plus-circle"></i> Thêm Mục Đích Sử Dụng';

    mdForm.reset();

    txtMaMD.disabled = false;

    modal.style.display = "flex";

    txtMaMD.focus();

}



// ==========================================================
// 11. MỞ MODAL SỬA
// ==========================================================

function openEditModal(id) {

    const item = allPurposes.find(x => {

        return (x.maMD || x.MaMD) === id;

    });

    if (!item) {

        alert("Không tìm thấy dữ liệu.");

        return;

    }

    isEditMode = true;

    editingId = id;

    modalTitle.innerHTML =
        '<i class="fas fa-edit"></i> Cập Nhật Mục Đích Sử Dụng';

    txtMaMD.value = item.maMD || item.MaMD || "";

    txtTenMD.value = item.tenMD || item.TenMD || "";

    txtMoTaMD.value = item.moTaMD || item.MoTaMD || "";

    txtMaMD.disabled = true;

    modal.style.display = "flex";

    txtTenMD.focus();

}



// ==========================================================
// 12. ĐÓNG MODAL
// ==========================================================

function closeModal() {

    modal.style.display = "none";

    mdForm.reset();

    txtMaMD.disabled = false;

    isEditMode = false;

    editingId = null;

}



// ==========================================================
// 13. VALIDATE
// ==========================================================

function validateForm() {

    const maMD = txtMaMD.value.trim();

    const tenMD = txtTenMD.value.trim();

    if (maMD === "") {

        alert("Vui lòng nhập mã mục đích.");

        txtMaMD.focus();

        return false;

    }

    if (tenMD === "") {

        alert("Vui lòng nhập tên mục đích.");

        txtTenMD.focus();

        return false;

    }

    if (maMD.length > 15) {

        alert("Mã mục đích tối đa 15 ký tự.");

        txtMaMD.focus();

        return false;

    }

    if (tenMD.length > 50) {

        alert("Tên mục đích tối đa 50 ký tự.");

        txtTenMD.focus();

        return false;

    }

    if (txtMoTaMD.value.length > 500) {

        alert("Mô tả tối đa 500 ký tự.");

        txtMoTaMD.focus();

        return false;

    }

    return true;

}



// ==========================================================
// 14. LƯU DỮ LIỆU (THÊM / SỬA)
// ==========================================================

async function savePurpose(e) {

    e.preventDefault();

    if (!validateForm()) {

        return;

    }

    const model = {

        maMD: txtMaMD.value.trim(),

        tenMD: txtTenMD.value.trim(),

        moTaMD: txtMoTaMD.value.trim()

    };

    if (isEditMode) {

        await updatePurpose(model);

    }

    else {

        await createPurpose(model);

    }

}
// ==========================================================
// 14b. ĐỌC JSON AN TOÀN
// Một số API trả về Response không có nội dung (204 No Content,
// hoặc body rỗng) => response.json() sẽ ném lỗi
// "Unexpected end of JSON input". Hàm này đọc dạng text trước,
// chỉ parse JSON khi có nội dung thực sự.
// ==========================================================

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
// 15. THÊM MỤC ĐÍCH SỬ DỤNG
// ==========================================================

async function createPurpose(model) {

    try {

        btnSave.disabled = true;

        const response = await fetch(API_MUC_DICH, {

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
                `Không thể thêm dữ liệu (mã lỗi ${response.status}).`;

            throw new Error(message);

        }

        closeModal();

        showSuccess("Thêm mục đích sử dụng thành công.");

        await loadPurposes();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

    finally {

        btnSave.disabled = false;

    }

}



// ==========================================================
// 16. CẬP NHẬT MỤC ĐÍCH SỬ DỤNG
// ==========================================================

async function updatePurpose(model) {

    try {

        btnSave.disabled = true;

        const response = await fetch(`${API_MUC_DICH}/${editingId}`, {

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
                `Không thể cập nhật (mã lỗi ${response.status}).`;

            throw new Error(message);

        }

        closeModal();

        showSuccess("Cập nhật mục đích sử dụng thành công.");

        await loadPurposes();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

    finally {

        btnSave.disabled = false;

    }

}



// ==========================================================
// 17. XÓA MỤC ĐÍCH SỬ DỤNG
// ==========================================================

async function deletePurpose(id) {

    const confirmDelete = confirm(
        "Bạn có chắc chắn muốn xóa mục đích sử dụng này?"
    );

    if (!confirmDelete) {

        return;

    }

    try {

        const response = await fetch(`${API_MUC_DICH}/${id}`, {

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
                `Không thể xóa (mã lỗi ${response.status}).`;

            throw new Error(message);

        }

        showSuccess("Xóa thành công.");

        await loadPurposes();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}



// ==========================================================
// 18. HIỂN THỊ LOADING
// ==========================================================

function showLoading() {

    messageBox.style.display = "block";

    messageBox.className = "message-box loading";

    messageBox.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Đang tải dữ liệu...
    `;

    tableBody.innerHTML = "";

}



// ==========================================================
// 19. THÔNG BÁO THÀNH CÔNG
// ==========================================================

function showSuccess(message) {

    messageBox.style.display = "block";

    messageBox.className = "message-box success";

    messageBox.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;

    setTimeout(() => {

        hideMessage();

    }, 2500);

}



// ==========================================================
// 20. THÔNG BÁO LỖI
// ==========================================================

function showError(message) {

    messageBox.style.display = "block";

    messageBox.className = "message-box error";

    messageBox.innerHTML = `
        <i class="fas fa-times-circle"></i>
        ${message}
    `;

}



// ==========================================================
// 21. KHÔNG CÓ DỮ LIỆU
// ==========================================================

function showEmpty(message) {

    messageBox.style.display = "block";

    messageBox.className = "message-box empty";

    messageBox.innerHTML = `
        <i class="fas fa-folder-open"></i>
        ${message}
    `;

}



// ==========================================================
// 22. ẨN THÔNG BÁO
// ==========================================================

function hideMessage() {

    messageBox.style.display = "none";

    messageBox.innerHTML = "";

}
// ==========================================================
// 23. ESCAPE HTML (CHỐNG XSS)
// ==========================================================

function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = text ?? "";

    return div.innerHTML;

}



// ==========================================================
// 24. CHUẨN HÓA DỮ LIỆU API
// Hỗ trợ cả PascalCase và camelCase
// ==========================================================

function getMaMD(item) {

    return item.maMD || item.MaMD || "";

}

function getTenMD(item) {

    return item.tenMD || item.TenMD || "";

}

function getMoTaMD(item) {

    return item.moTaMD || item.MoTaMD || "";

}



// ==========================================================
// 25. CLICK RA NGOÀI MODAL ĐỂ ĐÓNG
// ==========================================================

window.addEventListener("click", function (e) {

    if (e.target === modal) {

        closeModal();

    }

});



// ==========================================================
// 26. NHẤN ESC ĐỂ ĐÓNG MODAL
// ==========================================================

document.addEventListener("keydown", function (e) {

    if (e.key === "Escape") {

        if (modal.style.display === "flex") {

            closeModal();

        }

    }

});



// ==========================================================
// 27. ENTER TRONG Ô TÌM KIẾM
// ==========================================================

searchInput.addEventListener("keydown", function (e) {

    if (e.key === "Enter") {

        e.preventDefault();

        filterData(this.value.trim().toLowerCase());

    }

});



// ==========================================================
// 28. RESET FORM
// ==========================================================

function resetForm() {

    mdForm.reset();

    txtMaMD.disabled = false;

    editingId = null;

    isEditMode = false;

}



// ==========================================================
// 29. REFRESH DỮ LIỆU
// ==========================================================

async function refreshData() {

    searchInput.value = "";

    await loadPurposes();

}
// ==========================================================
// 30. DEBUG (Có thể xóa khi Release)
// ==========================================================

console.log("====================================");

console.log("Luxury Furniture Admin");

console.log("Module: Mục Đích Sử Dụng");

console.log("API:", API_MUC_DICH);

console.log("====================================");