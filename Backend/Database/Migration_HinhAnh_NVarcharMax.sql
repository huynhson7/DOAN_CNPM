/*==============================================================*/
/* Migration: mở rộng cột SANPHAM.HinhAnh sang NVARCHAR(MAX)     */
/*                                                                */
/* Chạy 1 lần trên MỖI máy đã có sẵn Database HTQLCHBNT (đã có   */
/* dữ liệu) để cột HinhAnh đủ chỗ lưu ảnh dạng Base64 (data URI). */
/* Nếu bạn tạo Database MỚI hoàn toàn từ SqlCNPM.sql thì không    */
/* cần chạy file này vì SqlCNPM.sql đã được cập nhật sẵn.         */
/*==============================================================*/

USE HTQLCHBNT;
GO

ALTER TABLE SANPHAM
    ALTER COLUMN HinhAnh NVARCHAR(MAX) NULL;
GO