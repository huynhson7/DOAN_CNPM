-- Script này phục hồi (RESTORE) database HTQLCHBNT từ file backup .bak
-- thay vì tạo database rỗng rồi chạy SqlCNPM.sql.
-- Tự động dò "Logical Name" của file dữ liệu (.mdf) và file log (.ldf) bên trong
-- file .bak - vì tên logical này do máy tạo ra file backup đặt, có thể khác nhau
-- tuỳ máy, không đoán được trước.

IF DB_ID('HTQLCHBNT') IS NOT NULL
BEGIN
    PRINT '>> Database HTQLCHBNT đã tồn tại - bỏ qua bước RESTORE (an toàn khi chạy lại nhiều lần).';
END
ELSE
BEGIN
    DECLARE @BackupFile NVARCHAR(500) = N'/var/opt/mssql/backup/BAK';
    DECLARE @DataDir NVARCHAR(500) = N'/var/opt/mssql/data/';

    IF OBJECT_ID('tempdb..#FileList') IS NOT NULL DROP TABLE #FileList;

    CREATE TABLE #FileList
    (
        LogicalName NVARCHAR(128), PhysicalName NVARCHAR(260), [Type] CHAR(1),
        FileGroupName NVARCHAR(128), Size NUMERIC(20,0), MaxSize NUMERIC(20,0),
        FileId BIGINT, CreateLSN NUMERIC(25,0), DropLSN NUMERIC(25,0),
        UniqueId UNIQUEIDENTIFIER, ReadOnlyLSN NUMERIC(25,0), ReadWriteLSN NUMERIC(25,0),
        BackupSizeInBytes BIGINT, SourceBlockSize INT, FileGroupId INT,
        LogGroupGUID UNIQUEIDENTIFIER, DifferentialBaseLSN NUMERIC(25,0),
        DifferentialBaseGUID UNIQUEIDENTIFIER, IsReadOnly BIT, IsPresent BIT,
        TDEThumbprint VARBINARY(32), SnapshotUrl NVARCHAR(360)
    );

    DECLARE @sqlFileList NVARCHAR(MAX) = N'RESTORE FILELISTONLY FROM DISK = N''' + @BackupFile + N'''';
    INSERT INTO #FileList
    EXEC(@sqlFileList);

    DECLARE @DataLogicalName NVARCHAR(128) = (SELECT TOP 1 LogicalName FROM #FileList WHERE [Type] = 'D' ORDER BY FileId);
    DECLARE @LogLogicalName  NVARCHAR(128) = (SELECT TOP 1 LogicalName FROM #FileList WHERE [Type] = 'L' ORDER BY FileId);

    IF @DataLogicalName IS NULL OR @LogLogicalName IS NULL
    BEGIN
        RAISERROR('Không đọc được danh sách file trong HTQLCHBNT.bak. Kiểm tra lại file backup có đúng định dạng SQL Server .bak không.', 16, 1);
        RETURN;
    END

    PRINT '>> Logical data file: ' + @DataLogicalName;
    PRINT '>> Logical log file:  ' + @LogLogicalName;

    DECLARE @sqlRestore NVARCHAR(MAX) = N'
    RESTORE DATABASE HTQLCHBNT
    FROM DISK = N''' + @BackupFile + N'''
    WITH MOVE N''' + @DataLogicalName + N''' TO N''' + @DataDir + N'HTQLCHBNT.mdf'',
         MOVE N''' + @LogLogicalName + N''' TO N''' + @DataDir + N'HTQLCHBNT_log.ldf'',
         REPLACE, STATS = 10;';

    EXEC(@sqlRestore);

    PRINT '>> Phục hồi database HTQLCHBNT từ file backup thành công.';
END
GO