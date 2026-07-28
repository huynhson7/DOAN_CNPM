const API_BASE_URL = "http://localhost:5129/api";

const fullnameInput = document.getElementById('fullname');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const usernameInput = document.getElementById('reg-username');
const passwordInput = document.getElementById('reg-password');
const confirmPasswordInput = document.getElementById('reg-confirm-password');

const usernameErrorBox = document.getElementById('usernameError');
const confirmPasswordErrorBox = document.getElementById('confirmPasswordError');
const passwordChecklistBox = document.getElementById('passwordChecklist');
const registerErrorBox = document.getElementById('registerError');

// Validate real-time: Username, Password checklist, Confirm Password (không dùng Alert/Popup)
const checkUsername = attachUsernameCheck(usernameInput, usernameErrorBox);
attachPasswordChecklist(passwordInput, passwordChecklistBox);
const checkConfirmPassword = attachConfirmPasswordCheck(passwordInput, confirmPasswordInput, confirmPasswordErrorBox);

document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    registerErrorBox.textContent = '';

    const isUsernameOk = checkUsername();
    const isConfirmOk = checkConfirmPassword();
    const isPasswordOk = isPasswordValid(passwordInput.value);

    if (!isUsernameOk || !isPasswordOk || !isConfirmOk) {
        if (!isPasswordOk) {
            registerErrorBox.textContent = 'Mật khẩu chưa đáp ứng đủ các tiêu chí bên trên.';
        }
        return;
    }

    const btnSubmit = this.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang xử lý...';

    try {
        const response = await fetch(`${API_BASE_URL}/Auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                HoTen: fullnameInput.value.trim(),
                Email: emailInput.value.trim(),
                SoDienThoai: phoneInput.value.trim(),
                Username: usernameInput.value.trim(),
                Password: passwordInput.value,
                ConfirmPassword: confirmPasswordInput.value
            })
        });

        const data = await response.json();

        if (response.ok) {
            saveSessionAndRedirect(data);
        } else {
            registerErrorBox.textContent = data.message || 'Đăng ký thất bại. Vui lòng thử lại.';
        }
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        registerErrorBox.textContent = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại Backend đang chạy hay chưa.';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Đăng Ký';
    }
});

function saveSessionAndRedirect(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('hoTen', data.hoTen);
    localStorage.setItem('userId', data.maUser);
    window.location.href = 'index.html';
}

// ============================================================
// Google Register (dùng chung endpoint /api/auth/google với Login)
// ============================================================
const GOOGLE_CLIENT_ID = "76373804606-5hbi96pkn7v0sjrjkarh9roous8nlmr2.apps.googleusercontent.com";

window.addEventListener('load', () => {
    if (typeof google === 'undefined') {
        registerErrorBox.textContent = 'Không tải được thư viện Google. Vui lòng kiểm tra kết nối mạng.';
        return;
    }

    const googleButton = document.getElementById('googleSignInButton');
    if (!googleButton) return;

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse
    });

    google.accounts.id.renderButton(googleButton, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'pill',
        width: 320
    });
});

async function handleGoogleCredentialResponse(response) {
    if (!response?.credential) {
        registerErrorBox.textContent = 'Không nhận được Google ID Token.';
        return;
    }

    try {
        const apiResponse = await fetch(`${API_BASE_URL}/Auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ IdToken: response.credential })
        });

        const data = await apiResponse.json();

        if (apiResponse.ok) {
            saveSessionAndRedirect(data);
        } else {
            registerErrorBox.textContent = data.message || 'Đăng ký Google thất bại.';
        }
    } catch (error) {
        console.error('Lỗi đăng ký Google:', error);
        registerErrorBox.textContent = 'Không thể kết nối tới máy chủ.';
    }
}
