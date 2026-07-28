const API_BASE_URL = "http://localhost:5129/api";

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value; // Không trim password - có thể chứa khoảng trắng dự định (dù chính sách không cho phép)
    const btnSubmit = this.querySelector('button[type="submit"]');
    const errorBox = document.getElementById('loginError');

    if (errorBox) errorBox.textContent = '';

    if (!usernameInput || !passwordInput) {
        showLoginError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = "Đang kiểm tra...";

    try {
        const response = await fetch(`${API_BASE_URL}/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Username: usernameInput,
                Password: passwordInput
            })
        });

        const data = await response.json();

        if (response.ok) {
            saveSessionAndRedirect(data);
        } else {
            showLoginError(data.message || "Tên đăng nhập hoặc mật khẩu không đúng!");
        }
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        showLoginError("Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại Backend đang chạy hay chưa.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Đăng Nhập";
    }
});

function showLoginError(message) {
    const errorBox = document.getElementById('loginError');
    if (errorBox) {
        errorBox.textContent = message;
    } else {
        alert(message);
    }
}

/**
 * Lưu thông tin đăng nhập và điều hướng theo đúng 3 Role chuẩn hoá từ Backend:
 * "Quản trị Hệ thống" | "NV Bán Hàng" | "Khách hàng". Backend là nơi DUY NHẤT quyết định Role,
 * Frontend chỉ dùng Role này để hiển thị/điều hướng giao diện.
 */
function saveSessionAndRedirect(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('hoTen', data.hoTen);
    localStorage.setItem('userId', data.maUser);

    if (data.role === 'Quản trị Hệ thống' || data.role === 'NV Bán Hàng') {
        // Cùng vào /admin nhưng bangdieukhien.html tự ẩn/hiện chức năng theo Role qua auth-guard.js
        window.location.href = 'bangdieukhien.html';
    } else {
        // KhachHang -> trang chủ mua sắm
        window.location.href = 'index.html';
    }
}

// ============================================================
// GOOGLE LOGIN
// ============================================================

const GOOGLE_CLIENT_ID =
    "76373804606-5hbi96pkn7v0sjrjkarh9roous8nlmr2.apps.googleusercontent.com";

window.addEventListener("load", () => {

    if (typeof google === "undefined") {

        console.error("Google Identity Services chưa được tải.");

        return;
    }

    google.accounts.id.initialize({

        client_id: GOOGLE_CLIENT_ID,

        callback: handleGoogleCredentialResponse

    });

    google.accounts.id.renderButton(

        document.getElementById("googleSignInButton"),

        {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "pill",
            width: 320
        }

    );

});

async function handleGoogleCredentialResponse(response) {

    if (!response.credential) {

        showLoginError("Không nhận được Google ID Token.");

        return;

    }

    console.log("Google Credential:", response);

    try {

        const apiResponse = await fetch(`${API_BASE_URL}/Auth/google`, {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                IdToken: response.credential

            })

        });

        const data = await apiResponse.json();

        if (apiResponse.ok) {

            saveSessionAndRedirect(data);

        } else {

            showLoginError(data.message || "Đăng nhập Google thất bại.");

        }

    }
    catch (err) {

        console.error(err);

        showLoginError("Không thể kết nối Backend.");

    }

}

