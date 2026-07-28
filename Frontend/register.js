document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    
    const btnSubmit = this.querySelector('button[type="submit"]');

    if (!fullname || !phone || !email || !username || !password) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = "Đang xử lý...";

    try {
        const response = await fetch('http://localhost:5129/api/Auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                TenKhachHang: fullname,
                SDTKhachHang: phone,
                Email: email,
                TenDangNhap: username,
                MatKhau: password
            })
        });

        // Đọc dữ liệu trả về dưới dạng văn bản trước để tránh lỗi parse JSON khi server báo lỗi 500
        const responseText = await response.text();
        let data;

        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error("Lỗi từ server (không phải JSON):", responseText);
            alert("Lỗi hệ thống Backend: Vui lòng kiểm tra Console (F12) để xem chi tiết lỗi từ C#.");
            return;
        }

        if (response.ok) {
            alert(data.message || "Đăng ký thành công! Vui lòng đăng nhập.");
            window.location.href = 'login.html';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Lỗi mạng/Kết nối:", error);
        alert("Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại Backend (Port có đúng không)!");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Đăng Ký";
    }
});