/*==============================================================*/
/* DBMS name:      Microsoft SQL Server 2017                    */
/* Created on:     7/17/2026 12:07:09 AM                        */
/*==============================================================*/
CREATE DATABASE HTQLCHBNT;
GO

USE HTQLCHBNT;
GO

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('CHITIETHOADON') and o.name = 'FK_CHITIETH_THUOC_HOADON')
alter table CHITIETHOADON
   drop constraint FK_CHITIETH_THUOC_HOADON
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('CHITIETHOADON') and o.name = 'FK_CHITIETH_XUAT_HIEN_SANPHAM')
alter table CHITIETHOADON
   drop constraint FK_CHITIETH_XUAT_HIEN_SANPHAM
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('HOADON') and o.name = 'FK_HOADON_DUOC_CAP_KHACHHAN')
alter table HOADON
   drop constraint FK_HOADON_DUOC_CAP_KHACHHAN
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('HOADON') and o.name = 'FK_HOADON_LAP_NHANVIEN')
alter table HOADON
   drop constraint FK_HOADON_LAP_NHANVIEN
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('SANPHAM') and o.name = 'FK_SANPHAM_CHUA_NHOMSANP')
alter table SANPHAM
   drop constraint FK_SANPHAM_CHUA_NHOMSANP
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('SANPHAM') and o.name = 'FK_SANPHAM_CO_MUCDICHS')
alter table SANPHAM
   drop constraint FK_SANPHAM_CO_MUCDICHS
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('cung_cap') and o.name = 'FK_CUNG_CAP_CUNG_CAP_NHACUNGC')
alter table cung_cap
   drop constraint FK_CUNG_CAP_CUNG_CAP_NHACUNGC
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('cung_cap') and o.name = 'FK_CUNG_CAP_CUNG_CAP2_SANPHAM')
alter table cung_cap
   drop constraint FK_CUNG_CAP_CUNG_CAP2_SANPHAM
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('lam_nen') and o.name = 'FK_LAM_NEN_LAM_NEN_VATLIEU')
alter table lam_nen
   drop constraint FK_LAM_NEN_LAM_NEN_VATLIEU
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('lam_nen') and o.name = 'FK_LAM_NEN_LAM_NEN2_SANPHAM')
alter table lam_nen
   drop constraint FK_LAM_NEN_LAM_NEN2_SANPHAM
go

if exists (select 1
            from  sysobjects
           where  id = object_id('CHITIETHOADON')
            and   type = 'U')
   drop table CHITIETHOADON
go

if exists (select 1
            from  sysobjects
           where  id = object_id('HOADON')
            and   type = 'U')
   drop table HOADON
go

if exists (select 1
            from  sysobjects
           where  id = object_id('KHACHHANG')
            and   type = 'U')
   drop table KHACHHANG
go

if exists (select 1
            from  sysobjects
           where  id = object_id('MUCDICHSUDUNG')
            and   type = 'U')
   drop table MUCDICHSUDUNG
go

if exists (select 1
            from  sysobjects
           where  id = object_id('NHACUNGCAP')
            and   type = 'U')
   drop table NHACUNGCAP
go

if exists (select 1
            from  sysobjects
           where  id = object_id('NHANVIEN')
            and   type = 'U')
   drop table NHANVIEN
go

if exists (select 1
            from  sysobjects
           where  id = object_id('NHOMSANPHAM')
            and   type = 'U')
   drop table NHOMSANPHAM
go

if exists (select 1
            from  sysobjects
           where  id = object_id('SANPHAM')
            and   type = 'U')
   drop table SANPHAM
go

if exists (select 1
            from  sysobjects
           where  id = object_id('VATLIEU')
            and   type = 'U')
   drop table VATLIEU
go

if exists (select 1
            from  sysobjects
           where  id = object_id('cung_cap')
            and   type = 'U')
   drop table cung_cap
go

if exists (select 1
            from  sysobjects
           where  id = object_id('lam_nen')
            and   type = 'U')
   drop table lam_nen
go

/*==============================================================*/
/* Table: CHITIETHOADON                                         */
/*==============================================================*/
create table CHITIETHOADON (
   MaHD                 varchar(15)          not null,
   MaChiTietHD          varchar(20)          not null,
   MaSP                 varchar(15)          not null,
   SoLuongBan           int                  null,
   DonGiaBan            decimal(18,2)        null,
   ThanhTien            decimal(18,2)        null,
   GiamGia              decimal(5,2)         null,
   constraint PK_CHITIETHOADON primary key (MaHD, MaChiTietHD)
)
go

/*==============================================================*/
/* Table: HOADON                                                */
/*==============================================================*/
create table HOADON (
   MaHD                 varchar(15)          not null,
   MaNV                 varchar(15)          not null,
   MaKhachHang          varchar(15)          not null,
   NgayLapHD            datetime             null,
   NgayGiaoHang         datetime             null,
   TrangThaiGiaoHang    nvarchar(50)         null,
   constraint PK_HOADON primary key (MaHD)
)
go

/*==============================================================*/
/* Table: KHACHHANG                                             */
/*==============================================================*/
create table KHACHHANG (
   MaKhachHang          varchar(15)          not null,
   TenDangNhap          varchar(50)          null,
   MatKhau              varchar(100)         null,
   TenKhachHang         nvarchar(100)        null,
   SDTKhachHang         nvarchar(15)         null,
   DiaChiKhachHang      nvarchar(255)        null,
   TrangThai            int                  null,
   constraint PK_KHACHHANG primary key (MaKhachHang)
)
go

/*==============================================================*/
/* Table: MUCDICHSUDUNG                                         */
/*==============================================================*/
create table MUCDICHSUDUNG (
   MaMD                 varchar(15)          not null,
   TenMD                nvarchar(50)         null,
   MoTaMD               nvarchar(500)        null,
   constraint PK_MUCDICHSUDUNG primary key (MaMD)
)
go

/*==============================================================*/
/* Table: NHACUNGCAP                                            */
/*==============================================================*/
create table NHACUNGCAP (
   MaNcc                nvarchar(255)        not null,
   TenNcc               nvarchar(100)        null,
   MoTaNcc              nvarchar(500)        null,
   constraint PK_NHACUNGCAP primary key (MaNcc)
)
go

/*==============================================================*/
/* Table: NHANVIEN                                              */
/*==============================================================*/
create table NHANVIEN (
   MaNV                 varchar(15)          not null,
   TenDangNhap          varchar(50)          null,
   MatKhau              varchar(100)         null,
   TenNV                nvarchar(50)         null,
   NgaySinh             datetime             null,
   GioiTinh             nvarchar(10)         null,
   SoDT                 varchar(15)          null,
   DiaChiNV             nvarchar(255)        null,
   VaiTroKhuVucPhuTrach nvarchar(100)        null,
   TrangThaiLamViec     nvarchar(150)        null,
   TrangThai            int                  null,
   constraint PK_NHANVIEN primary key (MaNV)
)
go

/*==============================================================*/
/* Table: NHOMSANPHAM                                           */
/*==============================================================*/
create table NHOMSANPHAM (
   MaNhomSP             varchar(15)          not null,
   TenNhomSP            nvarchar(100)        null,
   TrangThai            int                  null,
   constraint PK_NHOMSANPHAM primary key (MaNhomSP)
)
go

/*==============================================================*/
/* Table: SANPHAM                                               */
/*==============================================================*/
create table SANPHAM (
   MaSP                 varchar(15)          not null,
   MaMD                 varchar(15)          not null,
   MaNhomSP             varchar(15)          not null,
   TenSP                nvarchar(100)        null,
   DonViTinh            nvarchar(50)         null,
   SoLuongTon           int                  null,
   GiaBan               decimal(18,2)        null,
   MoTa                 nvarchar(200)        null,
   HinhAnh              varchar(500)         null,
   TrangThai            int                  null,
   constraint PK_SANPHAM primary key (MaSP)
)
go

/*==============================================================*/
/* Table: VATLIEU                                               */
/*==============================================================*/
create table VATLIEU (
   MaVL                 varchar(15)          not null,
   TenVL                nvarchar(100)        null,
   constraint PK_VATLIEU primary key (MaVL)
)
go

/*==============================================================*/
/* Table: cung_cap                                              */
/*==============================================================*/
create table cung_cap (
   MaNcc                nvarchar(255)        not null,
   MaSP                 varchar(15)          not null,
   constraint PK_CUNG_CAP primary key (MaNcc, MaSP)
)
go

/*==============================================================*/
/* Table: lam_nen                                               */
/*==============================================================*/
create table lam_nen (
   MaVL                 varchar(15)          not null,
   MaSP                 varchar(15)          not null,
   constraint PK_LAM_NEN primary key (MaVL, MaSP)
)
go

alter table CHITIETHOADON
   add constraint FK_CHITIETH_THUOC_HOADON foreign key (MaHD)
      references HOADON (MaHD)
go

alter table CHITIETHOADON
   add constraint FK_CHITIETH_XUAT_HIEN_SANPHAM foreign key (MaSP)
      references SANPHAM (MaSP)
go

alter table HOADON
   add constraint FK_HOADON_DUOC_CAP_KHACHHAN foreign key (MaKhachHang)
      references KHACHHANG (MaKhachHang)
go

alter table HOADON
   add constraint FK_HOADON_LAP_NHANVIEN foreign key (MaNV)
      references NHANVIEN (MaNV)
go

alter table SANPHAM
   add constraint FK_SANPHAM_CHUA_NHOMSANP foreign key (MaNhomSP)
      references NHOMSANPHAM (MaNhomSP)
go

alter table SANPHAM
   add constraint FK_SANPHAM_CO_MUCDICHS foreign key (MaMD)
      references MUCDICHSUDUNG (MaMD)
go

alter table cung_cap
   add constraint FK_CUNG_CAP_CUNG_CAP_NHACUNGC foreign key (MaNcc)
      references NHACUNGCAP (MaNcc)
go

alter table cung_cap
   add constraint FK_CUNG_CAP_CUNG_CAP2_SANPHAM foreign key (MaSP)
      references SANPHAM (MaSP)
go

alter table lam_nen
   add constraint FK_LAM_NEN_LAM_NEN_VATLIEU foreign key (MaVL)
      references VATLIEU (MaVL)
go

alter table lam_nen
   add constraint FK_LAM_NEN_LAM_NEN2_SANPHAM foreign key (MaSP)
      references SANPHAM (MaSP)
go


USE HTQLCHBNT;
GO

/* ========================================================= */
/* 1. NHẬP LIỆU BẢNG DANH MỤC (MASTER DATA)                  */
/* ========================================================= */

-- 1.1. Bảng Nhóm Sản Phẩm
INSERT INTO NHOMSANPHAM (MaNhomSP, TenNhomSP, TrangThai) VALUES 
('NSP01', N'Sofa & Salon', 1),
('NSP02', N'Bàn', 1),
('NSP03', N'Ghế', 1),
('NSP04', N'Giường ngủ', 1),
('NSP05', N'Tủ & Kệ', 1);
GO

-- 1.2. Bảng Mục Đích Sử Dụng
INSERT INTO MUCDICHSUDUNG (MaMD, TenMD, MoTaMD) VALUES 
('MD01', N'Nội thất Phòng khách', N'Các sản phẩm dành cho không gian phòng khách, tiếp khách'),
('MD02', N'Nội thất Phòng ngủ', N'Các sản phẩm dành cho không gian nghỉ ngơi cá nhân'),
('MD03', N'Nội thất Phòng ăn', N'Thiết bị, bàn ghế cho nhà bếp và phòng ăn gia đình'),
('MD04', N'Nội thất Văn phòng', N'Bàn ghế làm việc, tủ hồ sơ, thiết bị văn phòng công ty');
GO

-- 1.3. Bảng Vật Liệu
INSERT INTO VATLIEU (MaVL, TenVL) VALUES 
('VL01', N'Gỗ sồi tự nhiên'),
('VL02', N'Gỗ MDF chống ẩm'),
('VL03', N'Da bò thật cao cấp'),
('VL04', N'Vải nỉ Hàn Quốc'),
('VL05', N'Kính cường lực 10mm'),
('VL06', N'Khung thép sơn tĩnh điện'),
('VL07', N'Nhựa Composite'),
('VL08', N'Đá cẩm thạch (Marble)');
GO

-- 1.4. Bảng Nhà Cung Cấp
INSERT INTO NHACUNGCAP (MaNcc, TenNcc, MoTaNcc) VALUES 
('NCC01', N'Nội thất Hòa Phát', N'Nhà cung cấp nội thất văn phòng và gia đình hàng đầu Việt Nam'),
('NCC02', N'IKEA Việt Nam', N'Đối tác cung cấp nội thất phong cách Bắc Âu, lắp ráp thông minh'),
('NCC03', N'Hoàng Anh Gia Lai', N'Chuyên cung cấp đồ gỗ tự nhiên nguyên khối cao cấp'),
('NCC04', N'JYSK Đan Mạch', N'Thương hiệu nội thất phong cách Scandinavian tinh tế'),
('NCC05', N'Uma Furniture', N'Đồ trang trí và nội thất hiện đại cho chung cư');
GO

/* ========================================================= */
/* 2. NHẬP LIỆU BẢNG NGƯỜI DÙNG (NHÂN VIÊN & KHÁCH HÀNG)     */
/* ========================================================= */

-- 2.1. Bảng Nhân Viên
INSERT INTO NHANVIEN (MaNV, TenDangNhap, MatKhau, TenNV, NgaySinh, GioiTinh, SoDT, DiaChiNV, VaiTroKhuVucPhuTrach, TrangThaiLamViec, TrangThai) VALUES 
('NV01', 'admin_son', '123456', N'Phạm Huỳnh Thiên Sơn', '1995-03-12', N'Nam', '0903998877', N'12 Lê Lợi, Quận 1, TP.HCM', N'Quản trị Hệ thống', N'Đang làm việc', 1),
('NV02', 'sale_anh', '123456', N'Nguyễn Thị Ngọc Anh', '1998-07-22', N'Nữ', '0918776655', N'45 Nguyễn Huệ, Quận 1, TP.HCM', N'Trưởng phòng Kinh doanh', N'Đang làm việc', 1),
('NV03', 'sale_duy', '123456', N'Trần Minh Duy', '1999-11-05', N'Nam', '0933445566', N'88 Cách Mạng Tháng 8, Quận 3, TP.HCM', N'Nhân viên bán hàng', N'Đang làm việc', 1),
('NV04', 'kho_phuong', '123456', N'Lê Minh Phương', '1996-02-14', N'Nữ', '0977112233', N'234 Phạm Văn Đồng, Thủ Đức, TP.HCM', N'Quản lý kho', N'Đang nghỉ phép', 1),
('NV05', 'cskh_tuan', '123456', N'Hoàng Anh Tuấn', '2000-09-30', N'Nam', '0944556677', N'15 Nguyễn Duy Trinh, Quận 2, TP.HCM', N'Chăm sóc khách hàng', N'Đang làm việc', 1);
GO

-- 2.2. Bảng Khách Hàng
INSERT INTO KHACHHANG (MaKhachHang, TenDangNhap, MatKhau, TenKhachHang, SDTKhachHang, DiaChiKhachHang, TrangThai) VALUES 
('KH01', 'thang_nguyen', '123456', N'Nguyễn Văn Thắng', '0909123456', N'102 Pasteur, Phường Bến Nghé, Quận 1, TP.HCM', 1),
('KH02', 'lan_hoang', '123456', N'Hoàng Thị Lan', '0912345678', N'25 Võ Văn Kiệt, Phường 1, Quận 5, TP.HCM', 1),
('KH03', 'hung_pham', '123456', N'Phạm Quốc Hùng', '0933888999', N'77 Lê Văn Sỹ, Phường 13, Quận Tân Bình, TP.HCM', 1),
('KH04', 'mai_do', '123456', N'Đỗ Thị Mai', '0977222333', N'15 Hùng Vương, Phường 4, Quận 10, TP.HCM', 1),
('KH05', 'tung_vu', '123456', N'Vũ Thanh Tùng', '0988444555', N'90 Điện Biên Phủ, Phường 17, Bình Thạnh, TP.HCM', 1),
('KH06', 'huong_bui', '123456', N'Bùi Thanh Hương', '0908112233', N'Khu Đô Thị Sala, Phường An Lợi Đông, TP Thủ Đức', 1),
('KH07', 'kien_trinh', '123456', N'Trịnh Trung Kiên', '0934555666', N'Tòa nhà Landmark 81, Vinhomes Central Park, Bình Thạnh', 1);
GO

/* ========================================================= */
/* 3. NHẬP LIỆU BẢNG TRUNG TÂM (CORE DATA) - 50 SẢN PHẨM     */
/* ========================================================= */

INSERT INTO SANPHAM (MaSP, MaMD, MaNhomSP, TenSP, DonViTinh, SoLuongTon, GiaBan, MoTa, HinhAnh, TrangThai) VALUES
-- SOFA & SALON (10 Sản phẩm)
('SP01', 'MD01', 'NSP01', N'Sofa Góc Chữ L Da Bò Ý', N'Bộ', 15, 12500000.00, N'Sofa góc cao cấp bọc da thật, nệm mút êm ái, chống xẹp lún.', 'sofa_01.jpg', 1),
('SP02', 'MD01', 'NSP01', N'Sofa Văng 3 Chỗ Bọc Nỉ', N'Cái', 20, 8500000.00, N'Sofa văng vải nỉ phong cách Bắc Âu hiện đại, dễ vệ sinh.', 'sofa_02.jpg', 1),
('SP03', 'MD01', 'NSP01', N'Sofa Đơn Thư Giãn Khung Thép', N'Cái', 30, 4200000.00, N'Sofa đơn nỉ khung thép tĩnh điện, thích hợp góc đọc sách.', 'sofa_03.jpg', 1),
('SP04', 'MD04', 'NSP01', N'Sofa Tiếp Khách Giám Đốc', N'Bộ', 10, 18500000.00, N'Bộ sofa da tĩnh điện lịch sự, bề thế cho phòng giám đốc.', 'sofa_04.jpg', 1),
('SP05', 'MD01', 'NSP01', N'Sofa Giường Thông Minh Cao Cấp', N'Cái', 25, 9800000.00, N'Sofa tích hợp thanh ray trượt kéo ra thành giường tiện lợi.', 'sofa_05.jpg', 1),
('SP06', 'MD01', 'NSP01', N'Bộ Salon Gỗ Tràm Tân Cổ Điển', N'Bộ', 5, 25000000.00, N'Salon chạm khắc tinh xảo, gỗ tràm nguyên khối sơn PU.', 'sofa_06.jpg', 1),
('SP07', 'MD01', 'NSP01', N'Sofa Băng Vải Canvas Xám', N'Cái', 12, 7200000.00, N'Chất liệu vải Canvas dày dặn, thân thiện với thú cưng.', 'sofa_07.jpg', 1),
('SP08', 'MD01', 'NSP01', N'Sofa Đôn Tròn Đa Năng', N'Cái', 50, 600000.00, N'Đôn nhỏ gọn có thể làm bàn trà mini hoặc gác chân.', 'sofa_08.jpg', 1),
('SP09', 'MD03', 'NSP01', N'Sofa Phòng Ăn Độc Lạ', N'Cái', 6, 5500000.00, N'Ghế sofa băng dài thay thế ghế ăn truyền thống.', 'sofa_09.jpg', 1),
('SP10', 'MD01', 'NSP01', N'Sofa Lười Hạt Xốp Size L', N'Cái', 45, 1200000.00, N'Ghế lười hạt xốp ôm trọn cơ thể, có thể tháo rời vỏ bọc.', 'sofa_10.jpg', 1),

-- BÀN (10 Sản phẩm)
('SP11', 'MD01', 'NSP02', N'Bàn Trà Mặt Kính Cường Lực', N'Cái', 40, 2100000.00, N'Bàn trà sofa mặt kính đen chân sắt viền vàng.', 'ban_01.jpg', 1),
('SP12', 'MD01', 'NSP02', N'Bàn Trà Gỗ Sồi Chữ Nhật', N'Cái', 35, 3500000.00, N'Bàn sofa vân gỗ tự nhiên, thiết kế có ngăn kéo.', 'ban_02.jpg', 1),
('SP13', 'MD03', 'NSP02', N'Bàn Ăn 6 Ghế Gỗ Sồi Nga', N'Bộ', 12, 11500000.00, N'Bộ bàn ăn gia đình tiêu chuẩn 6 người, mặt bàn phủ bóng.', 'ban_03.jpg', 1),
('SP14', 'MD03', 'NSP02', N'Bàn Ăn Thông Minh Gấp Gọn', N'Cái', 18, 5600000.00, N'Bàn mở rộng cánh bướm tiết kiệm diện tích cho chung cư nhỏ.', 'ban_04.jpg', 1),
('SP15', 'MD04', 'NSP02', N'Bàn Làm Việc Nhân Viên Chân Sắt', N'Cái', 50, 1200000.00, N'Bàn gỗ MDF khung sắt chữ K chắc chắn, chống rung lắc.', 'ban_05.jpg', 1),
('SP16', 'MD04', 'NSP02', N'Bàn Giám Đốc Chữ L Cao Cấp', N'Cái', 8, 8500000.00, N'Bàn lãnh đạo kích thước lớn, tích hợp tủ phụ đi kèm.', 'ban_06.jpg', 1),
('SP17', 'MD03', 'NSP02', N'Bàn Ăn Tròn Mặt Đá Cẩm Thạch', N'Cái', 22, 6800000.00, N'Bàn tròn chân côn mạ titan sang trọng cho phòng ăn.', 'ban_07.jpg', 1),
('SP18', 'MD04', 'NSP02', N'Bàn Học Liền Kệ Sách Đa Năng', N'Cái', 18, 2400000.00, N'Combo bàn làm việc thông minh kết hợp giá sách cao đụng trần.', 'ban_08.jpg', 1),
('SP19', 'MD03', 'NSP02', N'Bàn Bar Chân Sắt Lắp Ráp', N'Cái', 12, 1900000.00, N'Bàn đảo bếp, quầy bar khung sắt mặt gỗ công nghiệp.', 'ban_09.jpg', 1),
('SP20', 'MD04', 'NSP02', N'Bàn Họp Văn Phòng 2m4 Oval', N'Cái', 4, 6500000.00, N'Bàn họp chân sắt lớn, có hệ thống luồn dây điện thông minh.', 'ban_10.jpg', 1),

-- GHẾ (10 Sản phẩm)
('SP21', 'MD03', 'NSP03', N'Ghế Đẩu Quầy Bar Chân Gỗ', N'Cái', 60, 850000.00, N'Ghế bar chân trụ gỗ tự nhiên, mặt nhựa đúc bọc nỉ.', 'ghe_01.jpg', 1),
('SP22', 'MD03', 'NSP03', N'Ghế Ăn Đệm Da Chân Sắt', N'Cái', 100, 1100000.00, N'Ghế ngồi bàn ăn lót da PU, dễ lau chùi.', 'ghe_02.jpg', 1),
('SP23', 'MD04', 'NSP03', N'Ghế Xoay Lưới Công Thái Học', N'Cái', 80, 1850000.00, N'Ghế nhân viên lưng lưới thoáng mát, hỗ trợ cột sống.', 'ghe_03.jpg', 1),
('SP24', 'MD04', 'NSP03', N'Ghế Chân Quỳ Phòng Họp Bọc Nỉ', N'Cái', 40, 950000.00, N'Ghế chân thép mạ chorme tĩnh điện, đệm nệm dày.', 'ghe_04.jpg', 1),
('SP25', 'MD04', 'NSP03', N'Ghế Giám Đốc Da Bò Khung Gỗ', N'Cái', 15, 4500000.00, N'Ghế lãnh đạo xoay bọc da bò 100%, tay ốp gỗ tự nhiên.', 'ghe_05.jpg', 1),
('SP26', 'MD01', 'NSP03', N'Ghế Bành Đọc Sách Thư Giãn', N'Cái', 8, 3200000.00, N'Thiết kế ngả lưng sâu, có kèm đôn gác chân tiện lợi.', 'ghe_06.jpg', 1),
('SP27', 'MD04', 'NSP03', N'Ghế Gaming Ergonomic Pro RGB', N'Cái', 25, 5500000.00, N'Ghế cho game thủ và Coder, ngả 180 độ, kê tay 4D.', 'ghe_07.jpg', 1),
('SP28', 'MD03', 'NSP03', N'Ghế Ăn Gỗ Uốn Tựa Lưng Cong', N'Cái', 40, 850000.00, N'Kiểu dáng tối giản phong cách Hàn Quốc.', 'ghe_08.jpg', 1),
('SP29', 'MD01', 'NSP03', N'Ghế Nhựa Xếp Chồng Trong Suốt', N'Cái', 120, 450000.00, N'Ghế decor bằng nhựa Acrylic đúc nguyên khối.', 'ghe_09.jpg', 1),
('SP30', 'MD04', 'NSP03', N'Ghế Trưởng Phòng Lưng Trung', N'Cái', 35, 2200000.00, N'Thiết kế sang trọng, nệm da simili bọc mút D40.', 'ghe_10.jpg', 1),

-- GIƯỜNG NGỦ (10 Sản phẩm)
('SP31', 'MD02', 'NSP04', N'Giường Ngủ MDF Vân Gỗ 1m6', N'Cái', 20, 4800000.00, N'Giường phong cách tối giản Bắc Âu, ráp mộng chắc chắn.', 'giuong_01.jpg', 1),
('SP32', 'MD02', 'NSP04', N'Giường Đôi Gỗ Sồi Chạm Trổ 1m8', N'Cái', 15, 8200000.00, N'Giường gỗ thịt nguyên tấm chịu lực cực tốt.', 'giuong_02.jpg', 1),
('SP33', 'MD02', 'NSP04', N'Giường Bọc Da Đầu Giường Hoàng Gia', N'Cái', 10, 12500000.00, N'Giường sang trọng bọc da toàn bộ khung, vạt phản.', 'giuong_03.jpg', 1),
('SP34', 'MD02', 'NSP04', N'Giường Tầng Trẻ Em Tích Hợp Tủ', N'Cái', 12, 6500000.00, N'Giường 2 tầng có cầu thang hộp tích hợp ngăn kéo đồ.', 'giuong_04.jpg', 1),
('SP35', 'MD02', 'NSP04', N'Giường Phản Bệt Kiểu Nhật', N'Cái', 18, 5500000.00, N'Giường gầm thấp không chân, an toàn cho trẻ nhỏ.', 'giuong_05.jpg', 1),
('SP36', 'MD02', 'NSP04', N'Giường Gấp Thông Minh Âm Tường', N'Cái', 5, 14000000.00, N'Giường có hệ thống pít-tông nâng hạ lên thành tủ.', 'giuong_06.jpg', 1),
('SP37', 'MD02', 'NSP04', N'Giường Ngủ Bọc Nỉ Nhung Xám', N'Cái', 7, 10500000.00, N'Thiết kế đầu giường cao, bọc nhung tạo cảm giác ấm áp.', 'giuong_07.jpg', 1),
('SP38', 'MD02', 'NSP04', N'Giường Tre Ép Thân Thiện', N'Cái', 10, 3500000.00, N'Chất liệu tre công nghiệp xử lý chống mối mọt.', 'giuong_08.jpg', 1),
('SP39', 'MD02', 'NSP04', N'Giường Nệm Lò Xo Khách Sạn 2m', N'Cái', 12, 9500000.00, N'Bao gồm khung Divan và nệm lò xo túi độc lập 25cm.', 'giuong_09.jpg', 1),
('SP40', 'MD02', 'NSP04', N'Giường Sắt Mỹ Thuật Lắp Ráp', N'Cái', 25, 2800000.00, N'Khung sắt ống uốn hoa văn, sơn tĩnh điện trắng chống rỉ.', 'giuong_10.jpg', 1),

-- TỦ & KỆ (10 Sản phẩm)
('SP41', 'MD02', 'NSP05', N'Tủ Quần Áo Cửa Lùa 3 Buồng MDF', N'Cái', 25, 6500000.00, N'Tủ áo cánh lùa trượt mượt mà, tiết kiệm diện tích mở.', 'tu_01.jpg', 1),
('SP42', 'MD02', 'NSP05', N'Tủ Quần Áo Gỗ Sồi Tự Nhiên 4 Cánh', N'Cái', 8, 14500000.00, N'Tủ lớn 4 buồng vững chãi, chia nhiều ngăn xếp đồ.', 'tu_02.jpg', 1),
('SP43', 'MD01', 'NSP05', N'Kệ Tivi Treo Tường Gỗ Công Nghiệp', N'Cái', 35, 2200000.00, N'Kệ TV thiết kế treo tường thông minh, dài 2m.', 'ke_01.jpg', 1),
('SP44', 'MD01', 'NSP05', N'Kệ Trang Trí Dán Tường Lục Giác', N'Bộ', 50, 450000.00, N'Combo 3 kệ lục giác gỗ dán tường siêu chịu lực.', 'ke_02.jpg', 1),
('SP45', 'MD04', 'NSP05', N'Tủ Hồ Sơ Giám Đốc Cao Cấp', N'Cái', 10, 7500000.00, N'Tủ gỗ kính cường lực trưng bày tài liệu, kỷ niệm chương.', 'tu_03.jpg', 1),
('SP46', 'MD03', 'NSP05', N'Tủ Bếp Trên Dưới Gỗ An Cường', N'Cái', 5, 18000000.00, N'Tủ bếp thi công sẵn theo modul tiêu chuẩn chữ I.', 'tu_04.jpg', 1),
('SP47', 'MD01', 'NSP05', N'Tủ Rượu Âm Tường Cánh Kính', N'Cái', 3, 12000000.00, N'Thiết kế sang trọng có đèn LED chạy dọc các tầng.', 'tu_05.jpg', 1),
('SP48', 'MD01', 'NSP05', N'Tủ Tủ Giày Thông Minh Có Nệm Ngồi', N'Cái', 28, 1600000.00, N'Tủ giày cánh lật 3 tầng sức chứa 15 đôi, có ghế ngồi.', 'tu_06.jpg', 1),
('SP49', 'MD02', 'NSP05', N'Tủ Đầu Giường (Tab Đầu Giường) Mini', N'Cái', 30, 750000.00, N'Kệ tab nhỏ 2 ngăn kéo để đèn ngủ và điện thoại.', 'tu_07.jpg', 1),
('SP50', 'MD04', 'NSP05', N'Kệ Sách Đứng 5 Tầng Chân Sắt', N'Cái', 40, 1100000.00, N'Thiết kế xương cá ziczac tối ưu diện tích lưu trữ.', 'ke_03.jpg', 1);
GO

/* ========================================================= */
/* 4. NHẬP LIỆU BẢNG TRUNG GIAN (MAPPING DATA)               */
/* ========================================================= */

-- 4.1. Bảng Cung Cấp (Sản phẩm - Nhà cung cấp)
INSERT INTO cung_cap (MaNcc, MaSP) VALUES 
('NCC01', 'SP15'), ('NCC01', 'SP16'), ('NCC01', 'SP20'), ('NCC01', 'SP23'), ('NCC01', 'SP24'), ('NCC01', 'SP25'), ('NCC01', 'SP27'), ('NCC01', 'SP45'), -- Hòa Phát (Văn phòng)
('NCC02', 'SP02'), ('NCC02', 'SP05'), ('NCC02', 'SP08'), ('NCC02', 'SP14'), ('NCC02', 'SP21'), ('NCC02', 'SP29'), ('NCC02', 'SP34'), ('NCC02', 'SP41'), ('NCC02', 'SP48'), -- IKEA (Hiện đại, lắp ráp)
('NCC03', 'SP06'), ('NCC03', 'SP12'), ('NCC03', 'SP13'), ('NCC03', 'SP32'), ('NCC03', 'SP42'), ('NCC03', 'SP47'), -- HAGL (Gỗ thật, sang trọng)
('NCC04', 'SP01'), ('NCC04', 'SP07'), ('NCC04', 'SP17'), ('NCC04', 'SP31'), ('NCC04', 'SP39'), ('NCC04', 'SP50'), -- JYSK
('NCC05', 'SP10'), ('NCC05', 'SP26'), ('NCC05', 'SP43'), ('NCC05', 'SP44'), ('NCC05', 'SP49'); -- Uma
GO

-- 4.2. Bảng Làm Nền (Sản phẩm - Vật liệu)
INSERT INTO lam_nen (MaVL, MaSP) VALUES 
('VL03', 'SP01'), ('VL01', 'SP01'), -- Sofa Ý (Da thật + Gỗ sồi)
('VL04', 'SP02'), ('VL02', 'SP02'), -- Sofa Nỉ (Nỉ + MDF)
('VL05', 'SP11'), ('VL06', 'SP11'), -- Bàn Trà (Kính + Thép)
('VL01', 'SP13'),                   -- Bàn Ăn Gỗ Sồi
('VL02', 'SP15'), ('VL06', 'SP15'), -- Bàn NV (MDF + Thép)
('VL08', 'SP17'), ('VL06', 'SP17'), -- Bàn Tròn Đá (Đá Cẩm Thạch + Thép)
('VL07', 'SP29'),                   -- Ghế Nhựa (Nhựa Composite)
('VL02', 'SP41'),                   -- Tủ MDF
('VL01', 'SP42');                   -- Tủ Gỗ Sồi
GO

/* ========================================================= */
/* 5. NHẬP LIỆU GIAO DỊCH (HÓA ĐƠN MẪU ĐỂ TEST API)          */
/* ========================================================= */

-- 5.1. Bảng Hóa Đơn
INSERT INTO HOADON (MaHD, MaNV, MaKhachHang, NgayLapHD, NgayGiaoHang, TrangThaiGiaoHang) VALUES 
('HD001', 'NV02', 'KH01', '2026-07-15 08:30:00', '2026-07-16 10:00:00', N'Đã giao hàng'),
('HD002', 'NV03', 'KH03', '2026-07-16 14:45:00', NULL, N'Đang xử lý'),
('HD003', 'NV02', 'KH05', '2026-07-17 09:15:00', NULL, N'Chờ thanh toán');
GO

-- 5.2. Bảng Chi Tiết Hóa Đơn
INSERT INTO CHITIETHOADON (MaHD, MaChiTietHD, MaSP, SoLuongBan, DonGiaBan, ThanhTien, GiamGia) VALUES 
('HD001', 'CT01_01', 'SP01', 1, 12500000.00, 12000000.00, 500.00), -- Khách mua 1 bộ Sofa Góc (Giảm giá 500k)
('HD001', 'CT01_02', 'SP11', 1, 2100000.00, 2100000.00, 0.00),    -- Mua kèm 1 bàn kính
('HD002', 'CT02_01', 'SP15', 5, 1200000.00, 6000000.00, 0.00),    -- Khách cty mua 5 bàn NV
('HD002', 'CT02_02', 'SP23', 5, 18500000.00, 92500000.00, 0.00),  -- Kèm 5 ghế xoay
('HD003', 'CT03_01', 'SP41', 1, 6500000.00, 6500000.00, 0.00);    -- Mua 1 tủ MDF
GO

USE HTQLCHBNT;
GO

-- Lệnh thay đổi kiểu dữ liệu của cột MoTa từ text sang nvarchar(200)
ALTER TABLE SANPHAM 
ALTER COLUMN MoTa nvarchar(200);
GO

USE HTQLCHBNT;
GO

-- Cập nhật mô tả Sofa & Salon
UPDATE SANPHAM SET MoTa = N'Sofa góc cao cấp bọc da thật, nệm mút êm ái, chống xẹp lún.' WHERE MaSP = 'SP01';
UPDATE SANPHAM SET MoTa = N'Sofa văng vải nỉ phong cách Bắc Âu hiện đại, dễ vệ sinh.' WHERE MaSP = 'SP02';
UPDATE SANPHAM SET MoTa = N'Sofa đơn nỉ khung thép tĩnh điện, thích hợp góc đọc sách.' WHERE MaSP = 'SP03';
UPDATE SANPHAM SET MoTa = N'Bộ sofa da tĩnh điện lịch sự, bề thế cho phòng giám đốc.' WHERE MaSP = 'SP04';
UPDATE SANPHAM SET MoTa = N'Sofa tích hợp thanh ray trượt kéo ra thành giường tiện lợi.' WHERE MaSP = 'SP05';
UPDATE SANPHAM SET MoTa = N'Salon chạm khắc tinh xảo, gỗ tràm nguyên khối sơn PU.' WHERE MaSP = 'SP06';
UPDATE SANPHAM SET MoTa = N'Chất liệu vải Canvas dày dặn, thân thiện với thú cưng.' WHERE MaSP = 'SP07';
UPDATE SANPHAM SET MoTa = N'Đôn nhỏ gọn có thể làm bàn trà mini hoặc gác chân.' WHERE MaSP = 'SP08';
UPDATE SANPHAM SET MoTa = N'Ghế sofa băng dài thay thế ghế ăn truyền thống.' WHERE MaSP = 'SP09';
UPDATE SANPHAM SET MoTa = N'Ghế lười hạt xốp ôm trọn cơ thể, có thể tháo rời vỏ bọc.' WHERE MaSP = 'SP10';

-- Cập nhật mô tả Bàn
UPDATE SANPHAM SET MoTa = N'Bàn trà sofa mặt kính đen chân sắt viền vàng.' WHERE MaSP = 'SP11';
UPDATE SANPHAM SET MoTa = N'Bàn sofa vân gỗ tự nhiên, thiết kế có ngăn kéo.' WHERE MaSP = 'SP12';
UPDATE SANPHAM SET MoTa = N'Bộ bàn ăn gia đình tiêu chuẩn 6 người, mặt bàn phủ bóng.' WHERE MaSP = 'SP13';
UPDATE SANPHAM SET MoTa = N'Bàn mở rộng cánh bướm tiết kiệm diện tích cho chung cư nhỏ.' WHERE MaSP = 'SP14';
UPDATE SANPHAM SET MoTa = N'Bàn gỗ MDF khung sắt chữ K chắc chắn, chống rung lắc.' WHERE MaSP = 'SP15';
UPDATE SANPHAM SET MoTa = N'Bàn lãnh đạo kích thước lớn, tích hợp tủ phụ đi kèm.' WHERE MaSP = 'SP16';
UPDATE SANPHAM SET MoTa = N'Bàn tròn chân côn mạ titan sang trọng cho phòng ăn.' WHERE MaSP = 'SP17';
UPDATE SANPHAM SET MoTa = N'Combo bàn làm việc thông minh kết hợp giá sách cao đụng trần.' WHERE MaSP = 'SP18';
UPDATE SANPHAM SET MoTa = N'Bàn đảo bếp, quầy bar khung sắt mặt gỗ công nghiệp.' WHERE MaSP = 'SP19';
UPDATE SANPHAM SET MoTa = N'Bàn họp chân sắt lớn, có hệ thống luồn dây điện thông minh.' WHERE MaSP = 'SP20';

-- Cập nhật mô tả Ghế
UPDATE SANPHAM SET MoTa = N'Ghế bar chân trụ gỗ tự nhiên, mặt nhựa đúc bọc nỉ.' WHERE MaSP = 'SP21';
UPDATE SANPHAM SET MoTa = N'Ghế ngồi bàn ăn lót da PU, dễ lau chùi.' WHERE MaSP = 'SP22';
UPDATE SANPHAM SET MoTa = N'Ghế nhân viên lưng lưới thoáng mát, hỗ trợ cột sống.' WHERE MaSP = 'SP23';
UPDATE SANPHAM SET MoTa = N'Ghế chân thép mạ chorme tĩnh điện, đệm nệm dày.' WHERE MaSP = 'SP24';
UPDATE SANPHAM SET MoTa = N'Ghế lãnh đạo xoay bọc da bò 100%, tay ốp gỗ tự nhiên.' WHERE MaSP = 'SP25';
UPDATE SANPHAM SET MoTa = N'Thiết kế ngả lưng sâu, có kèm đôn gác chân tiện lợi.' WHERE MaSP = 'SP26';
UPDATE SANPHAM SET MoTa = N'Ghế cho game thủ và Coder, ngả 180 độ, kê tay 4D.' WHERE MaSP = 'SP27';
UPDATE SANPHAM SET MoTa = N'Kiểu dáng tối giản phong cách Hàn Quốc.' WHERE MaSP = 'SP28';
UPDATE SANPHAM SET MoTa = N'Ghế decor bằng nhựa Acrylic đúc nguyên khối.' WHERE MaSP = 'SP29';
UPDATE SANPHAM SET MoTa = N'Thiết kế sang trọng, nệm da simili bọc mút D40.' WHERE MaSP = 'SP30';

-- Cập nhật mô tả Giường ngủ
UPDATE SANPHAM SET MoTa = N'Giường phong cách tối giản Bắc Âu, ráp mộng chắc chắn.' WHERE MaSP = 'SP31';
UPDATE SANPHAM SET MoTa = N'Giường gỗ thịt nguyên tấm chịu lực cực tốt.' WHERE MaSP = 'SP32';
UPDATE SANPHAM SET MoTa = N'Giường sang trọng bọc da toàn bộ khung, vạt phản.' WHERE MaSP = 'SP33';
UPDATE SANPHAM SET MoTa = N'Giường 2 tầng có cầu thang hộp tích hợp ngăn kéo đồ.' WHERE MaSP = 'SP34';
UPDATE SANPHAM SET MoTa = N'Giường gầm thấp không chân, an toàn cho trẻ nhỏ.' WHERE MaSP = 'SP35';
UPDATE SANPHAM SET MoTa = N'Giường có hệ thống pít-tông nâng hạ lên thành tủ.' WHERE MaSP = 'SP36';
UPDATE SANPHAM SET MoTa = N'Thiết kế đầu giường cao, bọc nhung tạo cảm giác ấm áp.' WHERE MaSP = 'SP37';
UPDATE SANPHAM SET MoTa = N'Chất liệu tre công nghiệp xử lý chống mối mọt.' WHERE MaSP = 'SP38';
UPDATE SANPHAM SET MoTa = N'Bao gồm khung Divan và nệm lò xo túi độc lập 25cm.' WHERE MaSP = 'SP39';
UPDATE SANPHAM SET MoTa = N'Khung sắt ống uốn hoa văn, sơn tĩnh điện trắng chống rỉ.' WHERE MaSP = 'SP40';

-- Cập nhật mô tả Tủ & Kệ
UPDATE SANPHAM SET MoTa = N'Tủ áo cánh lùa trượt mượt mà, tiết kiệm diện tích mở.' WHERE MaSP = 'SP41';
UPDATE SANPHAM SET MoTa = N'Tủ lớn 4 buồng vững chãi, chia nhiều ngăn xếp đồ.' WHERE MaSP = 'SP42';
UPDATE SANPHAM SET MoTa = N'Kệ TV thiết kế treo tường thông minh, dài 2m.' WHERE MaSP = 'SP43';
UPDATE SANPHAM SET MoTa = N'Combo 3 kệ lục giác gỗ dán tường siêu chịu lực.' WHERE MaSP = 'SP44';
UPDATE SANPHAM SET MoTa = N'Tủ gỗ kính cường lực trưng bày tài liệu, kỷ niệm chương.' WHERE MaSP = 'SP45';
UPDATE SANPHAM SET MoTa = N'Tủ bếp thi công sẵn theo modul tiêu chuẩn chữ I.' WHERE MaSP = 'SP46';
UPDATE SANPHAM SET MoTa = N'Thiết kế sang trọng có đèn LED chạy dọc các tầng.' WHERE MaSP = 'SP47';
UPDATE SANPHAM SET MoTa = N'Tủ giày cánh lật 3 tầng sức chứa 15 đôi, có ghế ngồi.' WHERE MaSP = 'SP48';
UPDATE SANPHAM SET MoTa = N'Kệ tab nhỏ 2 ngăn kéo để đèn ngủ và điện thoại.' WHERE MaSP = 'SP49';
UPDATE SANPHAM SET MoTa = N'Thiết kế xương cá ziczac tối ưu diện tích lưu trữ.' WHERE MaSP = 'SP50';
GO