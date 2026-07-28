const API_BASE_URL = "http://localhost:5129/api";

document.getElementById('forgotPasswordForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const messageBox = document.getElementById('formMessage');
    const btnSubmit = this.querySelector('button[type="submit"]');

    messageBox.style.color = '';
    messageBox.textContent = '';

    if (!email) return;

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang gửi...';

    try {
        const response = await fetch(`${API_BASE_URL}/Auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Email: email })
        });

        const data = await response.json();

        // Backend LUÔN trả về cùng 1 thông báo dù Email có tồn tại hay không
        // (tránh lộ thông tin tài khoản nào tồn tại trong hệ thống).
        messageBox.style.color = '#27ae60';
        messageBox.textContent = data.message || 'Nếu Email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.';
        this.reset();
    } catch (error) {
        console.error('Lỗi quên mật khẩu:', error);
        messageBox.style.color = '#c0392b';
        messageBox.textContent = 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Gửi liên kết đặt lại mật khẩu';
    }
});
