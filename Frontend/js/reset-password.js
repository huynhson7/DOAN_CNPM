const API_BASE_URL = "http://localhost:5129/api";

const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordChecklistBox = document.getElementById('passwordChecklist');
const confirmPasswordErrorBox = document.getElementById('confirmPasswordError');
const messageBox = document.getElementById('formMessage');

attachPasswordChecklist(newPasswordInput, passwordChecklistBox);
const checkConfirmPassword = attachConfirmPasswordCheck(newPasswordInput, confirmPasswordInput, confirmPasswordErrorBox);

// Lấy Token từ query string của link trong email: reset-password.html?token=xxxx
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');

if (!resetToken) {
    messageBox.style.color = '#c0392b';
    messageBox.textContent = 'Liên kết không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu lại từ đầu.';
    document.getElementById('resetPasswordForm').querySelector('button[type="submit"]').disabled = true;
}

document.getElementById('resetPasswordForm').addEventListener('submit', async function (e) {
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
        const response = await fetch(`${API_BASE_URL}/Auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Token: resetToken,
                NewPassword: newPasswordInput.value,
                ConfirmPassword: confirmPasswordInput.value
            })
        });

        const data = await response.json();

        if (response.ok) {
            messageBox.style.color = '#27ae60';
            messageBox.textContent = data.message || 'Đặt lại mật khẩu thành công. Đang chuyển đến trang đăng nhập...';
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } else {
            messageBox.style.color = '#c0392b';
            messageBox.textContent = data.message || 'Đặt lại mật khẩu thất bại.';
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Đặt lại mật khẩu';
        }
    } catch (error) {
        console.error('Lỗi đặt lại mật khẩu:', error);
        messageBox.style.color = '#c0392b';
        messageBox.textContent = 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.';
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Đặt lại mật khẩu';
    }
});
