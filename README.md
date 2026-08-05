# DOAN_CNPM
- ra thư mục gốc không cần cd Backend 
- Mở docker lên trước
- git clone dự án về
- cp .env.example .env 
- Mở .env vừa tạo dán vào: 
	SA_PASSWORD=YourStrong@Passw0rd
	USE_BACKUP=true
- docker compose up -d --build
- Muốn chạy vào docker desktop ấn vào 2 link frontend, backend chạy
- Muốn tắt:
	docker compose down