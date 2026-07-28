// ============================================================
// validators.js
// Dùng chung cho các Form: Đăng ký, Thêm Nhân viên, Đổi mật khẩu, Reset mật khẩu.
// LOGIC PHẢI KHỚP với Backend/Helpers/PasswordPolicy.cs để tránh sai lệch FE/BE.
// ============================================================

const USERNAME_REGEX = /^[a-zA-Z0-9_]{4,20}$/;

function isValidUsername(username) {
    return typeof username === 'string' && USERNAME_REGEX.test(username);
}

/**
 * Trả về object các tiêu chí mật khẩu (true = đạt, false = chưa đạt).
 * Dùng để hiển thị checklist real-time (✓ / ✗), KHÔNG dùng alert/popup.
 */
function getPasswordChecklist(password) {
    password = password || '';
    return {
        length: password.length >= 8 && password.length <= 20 && !/\s/.test(password),
        lower: /[a-z]/.test(password),
        upper: /[A-Z]/.test(password),
        digit: /[0-9]/.test(password),
        special: /[^a-zA-Z0-9]/.test(password) && !/\s/.test(password)
    };
}

function isPasswordValid(password) {
    const c = getPasswordChecklist(password);
    return c.length && c.lower && c.upper && c.digit && c.special;
}

/**
 * Vẽ checklist mật khẩu real-time vào 1 phần tử container (không dùng Alert/Popup).
 * @param {HTMLInputElement} passwordInput
 * @param {HTMLElement} checklistContainer - phần tử rỗng để render danh sách ✓/✗
 */
function attachPasswordChecklist(passwordInput, checklistContainer) {
    const items = [
        { key: 'length', label: 'Từ 8 đến 20 ký tự, không khoảng trắng' },
        { key: 'lower', label: 'Có ít nhất 1 chữ thường' },
        { key: 'upper', label: 'Có ít nhất 1 chữ in hoa' },
        { key: 'digit', label: 'Có ít nhất 1 chữ số' },
        { key: 'special', label: 'Có ít nhất 1 ký tự đặc biệt' }
    ];

    checklistContainer.classList.add('password-checklist');
    checklistContainer.innerHTML = items
        .map(i => `<div class="check-item" data-key="${i.key}"><span class="check-icon">✗</span> ${i.label}</div>`)
        .join('');

    const render = () => {
        const result = getPasswordChecklist(passwordInput.value);
        items.forEach(i => {
            const el = checklistContainer.querySelector(`[data-key="${i.key}"]`);
            const icon = el.querySelector('.check-icon');
            if (result[i.key]) {
                el.classList.add('valid');
                icon.textContent = '✓';
            } else {
                el.classList.remove('valid');
                icon.textContent = '✗';
            }
        });
    };

    passwordInput.addEventListener('input', render);
    render();
}

/**
 * Gắn validate real-time cho Confirm Password: hiển thị lỗi ngay bên dưới nếu không khớp.
 * @param {HTMLInputElement} passwordInput
 * @param {HTMLInputElement} confirmInput
 * @param {HTMLElement} errorContainer - phần tử để hiển thị thông báo lỗi
 */
function attachConfirmPasswordCheck(passwordInput, confirmInput, errorContainer) {
    const render = () => {
        if (confirmInput.value.length === 0) {
            errorContainer.textContent = '';
            return true;
        }
        if (confirmInput.value !== passwordInput.value) {
            errorContainer.textContent = 'Mật khẩu xác nhận không khớp.';
            return false;
        }
        errorContainer.textContent = '';
        return true;
    };

    confirmInput.addEventListener('input', render);
    passwordInput.addEventListener('input', render);
    return render;
}

/**
 * Gắn validate real-time cho Username: hiển thị lỗi ngay bên dưới nếu sai định dạng.
 * @param {HTMLInputElement} usernameInput
 * @param {HTMLElement} errorContainer
 */
function attachUsernameCheck(usernameInput, errorContainer) {
    const render = () => {
        if (usernameInput.value.length === 0) {
            errorContainer.textContent = '';
            return true;
        }
        if (!isValidUsername(usernameInput.value)) {
            errorContainer.textContent = 'Tên đăng nhập chỉ gồm chữ, số, dấu gạch dưới (_), độ dài 4-20 ký tự.';
            return false;
        }
        errorContainer.textContent = '';
        return true;
    };

    usernameInput.addEventListener('input', render);
    return render;
}
