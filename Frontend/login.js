document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const btnSubmit = this.querySelector('button[type="submit"]');

    if (!usernameInput || !passwordInput) {
        alert("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = "Đang kiểm tra...";

    try {
        const response = await fetch('http://localhost:5129/api/Auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                Username: usernameInput, 
                Password: passwordInput 
            })
        });

        if (response.ok) {
            const data = await response.json();
            
            // 1. Lưu thông tin xác thực vào LocalStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role); 
            localStorage.setItem('hoTen', data.hoTen);
            localStorage.setItem('userId', data.maUser);
            
            // 2. Điều hướng an toàn dựa trên role trả về từ Token
            const role = data.role.toLowerCase();
            
            // Trường hợp 1: CHỈ Quản trị hệ thống -> Vào bảng điều khiển
            if (role.includes('quản trị') || role.includes('admin')) {
                window.location.href = 'bangdieukhien.html'; 
            } 
            // Trường hợp 2: Định danh chính xác Khách hàng -> Về trang chủ mua sắm
            else if (role === 'khách hàng') {
                window.location.href = 'index.html'; 
            } 
            // Trường hợp 3: Gom TẤT CẢ nhân viên còn lại (Trưởng phòng, Bán hàng, CSKH, v.v.) -> Vào trang hóa đơn
            else {
                window.location.href = 'hoadon.html'; 
            }
            
        } else {
            const err = await response.json();
            alert(err.message || "Tên đăng nhập hoặc mật khẩu không đúng!");
        }
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        alert("Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại Backend đang chạy hay chưa.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Đăng Nhập";
    }
});