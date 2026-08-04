FROM nginx:alpine

# Copy toàn bộ Frontend (html/, css/, js/, img/) vào thư mục gốc web của Nginx,
# GIỮ NGUYÊN cấu trúc thư mục vì các file .html đang dùng đường dẫn tương đối
# kiểu ../css/... và ../js/... (ví dụ: html/index.html -> ../css/style.css).
COPY . /usr/share/nginx/html

# Cấu hình Nginx riêng: tự chuyển hướng "/" sang "/html/index.html"
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
