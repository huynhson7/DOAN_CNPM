const apiUrl = 'https://localhost:5129'; // THAY ĐỔI PORT CHO ĐÚNG VỚI BACKEND CỦA BẠN
let countdownInterval;

async function guiMaOTP() {
    const email = document.getElementById('txtEmail').value;
    if (!email) {
        alert("Vui lòng nhập email!");
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/api/Auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            // Hiện khu vực nhập OTP, khóa ô nhập email lại
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('txtEmail').disabled = true;
            document.getElementById('btnSendOtp').disabled = true;
            
            batDauDemNguoc();
        } else {
            alert("Lỗi: " + result.message);
        }
    } catch (error) {
        alert("Lỗi kết nối đến server!");
    }
}

function batDauDemNguoc() {
    let timeLeft = 60;
    document.getElementById('btnResend').style.display = 'none';
    document.getElementById('timerText').style.display = 'inline';
    document.getElementById('countdown').innerText = timeLeft;

    countdownInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('countdown').innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            // Hết 60s -> Hiện nút Gửi lại, ẩn chữ đếm ngược
            document.getElementById('timerText').style.display = 'none';
            document.getElementById('btnResend').style.display = 'inline-block';
        }
    }, 1000);
}

function guiLaiOTP() {
    // Xóa interval cũ nếu có và gọi lại hàm gửi OTP
    clearInterval(countdownInterval);
    guiMaOTP(); 
}

async function xacNhanOTP() {
    const email = document.getElementById('txtEmail').value;
    const otp = document.getElementById('txtOtp').value;

    if (!otp) {
        alert("Vui lòng nhập mã OTP!");
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/api/Auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, otp: otp })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            // Lưu tạm email vào LocalStorage để trang sau sử dụng
            localStorage.setItem("resetEmail", email);
            // CHUYỂN HƯỚNG SANG TRANG ĐẶT LẠI MẬT KHẨU
            window.location.href = "reset-password.html";
        } else {
            alert("Lỗi: " + result.message);
        }
    } catch (error) {
        alert("Lỗi kết nối đến server!");
    }
}