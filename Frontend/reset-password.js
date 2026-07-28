const apiUrl = 'https://localhost:5129'; // THAY ĐỔI PORT CHO ĐÚNG

// Khi trang vừa load lên, lấy email từ bộ nhớ tạm
const emailCanReset = localStorage.getItem("resetEmail");

window.onload = function() {
    if (!emailCanReset) {
        alert("Không tìm thấy thông tin xác thực. Vui lòng quay lại trang Quên mật khẩu.");
        window.location.href = "forgot-password.html";
    } else {
        document.getElementById('lblEmail').innerText = emailCanReset;
    }
}

async function datLaiMatKhau() {
    const newPassword = document.getElementById('txtNewPassword').value;
    const confirmPassword = document.getElementById('txtConfirmPassword').value;

    if (!newPassword || !confirmPassword) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Mật khẩu nhập lại không khớp!");
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/api/Auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: emailCanReset, 
                newPassword: newPassword 
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert("Đổi mật khẩu thành công! Chuyển về trang đăng nhập.");
            // Xóa email lưu tạm vì đã đổi xong
            localStorage.removeItem("resetEmail");
            // CHUYỂN VỀ TRANG LOGIN CỦA BẠN
            window.location.href = "login.html"; 
        } else {
            alert("Lỗi: " + result.message);
        }
    } catch (error) {
        alert("Lỗi kết nối đến server!");
    }
}