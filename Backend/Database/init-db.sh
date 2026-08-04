#!/bin/bash
# Script này chạy trong container tạm "db-init" (xem docker-compose.yml).
# Nhiệm vụ: đợi SQL Server sẵn sàng, rồi:
#   - Nếu USE_BACKUP=true  -> phục hồi database từ file .bak (restore-db.sql)
#   - Nếu USE_BACKUP=false -> tạo database mới bằng SqlCNPM.sql (dữ liệu mẫu)
# An toàn khi chạy lại nhiều lần.

set -e

SQLCMD="/opt/mssql-tools18/bin/sqlcmd"

echo ">> Đang chờ SQL Server tại $DB_HOST khởi động..."
for i in $(seq 1 60); do
  if $SQLCMD -S "$DB_HOST" -U sa -P "$SA_PASSWORD" -C -Q "SELECT 1" > /dev/null 2>&1; then
    echo ">> SQL Server đã sẵn sàng."
    break
  fi
  echo "   ... chưa sẵn sàng, thử lại (${i}/60)"
  sleep 3
done

if [ "$USE_BACKUP" = "true" ]; then
  echo ">> USE_BACKUP=true -> Đang phục hồi database HTQLCHBNT từ file backup .bak..."
  $SQLCMD -S "$DB_HOST" -U sa -P "$SA_PASSWORD" -C -i /scripts/restore-db.sql
else
  echo ">> USE_BACKUP=false -> Đang chạy SqlCNPM.sql để khởi tạo database HTQLCHBNT..."
  $SQLCMD -S "$DB_HOST" -U sa -P "$SA_PASSWORD" -C -i /scripts/SqlCNPM.sql
fi

echo ">> Hoàn tất khởi tạo database."