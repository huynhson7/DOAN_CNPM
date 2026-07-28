const API_BASE_URL = "http://localhost:5129/api";

// Yêu cầu đăng nhập trước khi vào trang này
const existingToken = localStorage.getItem('token');
if (!existingToken) {
    window.location.href = 'login.html';
}

const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordChecklistBox = document.getElementById('passwordChecklist');
const confirmPasswordErrorBox = document.getElementById('confirmPasswordError');
const messageBox = document.getElementById('formMessage');

attachPasswordChecklist(newPasswordInput, passwordChecklistBox);
const checkConfirmPassword = attachConfirmPasswordCheck(newPasswordInput, confirmPasswordInput, confirmPasswordErrorBox);

document.getElementById('changePasswordForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    messageBox.style.color = '';
    messageBox.textContent = '';

    const isConfirmOk = checkConfirmPassword();
    const isPasswordOk = isPasswordValid(newPasswordInput.value);

    if (!isPasswordOk) {
        messageBox.style.color = '#c0392b';
        messageBox.textContent = 'Mật khẩu chưa đáp ứng đủ các tiêu chí bên trên.';
        return;
    }
    if (!isConfirmOk) return;

    const btnSubmit = this.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang xử lý...';

    try {
        const response = await fetch(`${API_BASE_URL}/Auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                NewPassword: newPasswordInput.value,
                ConfirmPassword: confirmPasswordInput.value
            })
        });

        const data = await response.json();

        if (response.ok) {
            messageBox.style.color = '#27ae60';
            messageBox.textContent = data.message || 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.';
            // JWT hiện tại đã bị thu hồi ở Backend (SecurityStamp mới) -> bắt buộc đăng nhập lại
            setTimeout(() => { logout(); }, 1500);
        } else if (response.status === 401) {
            messageBox.style.color = '#c0392b';
            messageBox.textContent = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            setTimeout(() => { logout(); }, 1500);
        } else {
            messageBox.style.color = '#c0392b';
            messageBox.textContent = data.message || 'Đổi mật khẩu thất bại.';
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Đổi mật khẩu';
        }
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        messageBox.style.color = '#c0392b';
        messageBox.textContent = 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.';
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Đổi mật khẩu';
    }
});
