document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // ĐÃ SỬA: Lấy giá trị từ thẻ <select> thay vì input radio
    const role = document.getElementById('role').value;
    
    // Tạm thời làm chức năng chuyển trang giả lập (chưa qua API/SQL)
    if (role === 'customer') {
        window.location.href = 'index.html'; // Chuyển sang trang chủ mua sắm (mặc định)
    } else {
        // ĐÃ SỬA: Đổi tên file đích thành quantri.html
        window.location.href = 'quantri.html'; 
    }
});