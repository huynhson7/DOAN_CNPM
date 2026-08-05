/* =========================================================================
   nav-responsive.js
   Xử lý đóng/mở menu điều hướng (navbar) dạng "hamburger" trên điện thoại
   và máy tính bảng. File này KHÔNG đụng chạm tới bất kỳ logic nào khác của
   trang (giỏ hàng, đăng nhập, v.v...) - chỉ thêm hành vi đóng/mở menu.

   Cách hoạt động:
   - Trên màn hình rộng (> 768px): menu hiển thị bình thường như cũ, nút
     hamburger bị ẩn đi (xử lý bằng CSS trong style.css).
   - Trên màn hình hẹp (<= 768px): menu .nav-links được ẩn đi, chỉ hiện ra
     khi bấm vào nút hamburger (thêm/gỡ class "nav-open" trên thẻ <nav>).
   ========================================================================= */
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var navbar = document.querySelector('.navbar');
        var toggleBtn = document.getElementById('navToggle');

        if (!navbar || !toggleBtn) return;

        var icon = toggleBtn.querySelector('i');
        var MOBILE_BREAKPOINT = 768;

        function moMenu() {
            navbar.classList.add('nav-open');
            toggleBtn.setAttribute('aria-expanded', 'true');
            if (icon) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            }
        }

        function dongMenu() {
            navbar.classList.remove('nav-open');
            toggleBtn.setAttribute('aria-expanded', 'false');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }

        function toggleMenu() {
            if (navbar.classList.contains('nav-open')) {
                dongMenu();
            } else {
                moMenu();
            }
        }

        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMenu();
        });

        // Đóng menu khi bấm vào 1 liên kết bên trong menu (trừ mục dropdown "Sản Phẩm"
        // vì bản thân nó đã là 1 liên kết chuyển trang, việc đóng menu lúc đó là bình thường)
        var navLinks = navbar.querySelectorAll('.nav-links a');
        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                dongMenu();
            });
        });

        // Đóng menu khi bấm ra ngoài vùng navbar (chỉ áp dụng trên mobile)
        document.addEventListener('click', function (e) {
            if (window.innerWidth > MOBILE_BREAKPOINT) return;
            if (!navbar.contains(e.target)) {
                dongMenu();
            }
        });

        // Nếu người dùng xoay ngang / mở rộng cửa sổ trình duyệt vượt qua breakpoint
        // trong lúc menu đang mở trên mobile thì tự đóng lại để tránh kẹt trạng thái.
        window.addEventListener('resize', function () {
            if (window.innerWidth > MOBILE_BREAKPOINT) {
                dongMenu();
            }
        });
    });
})();