const API_BASE = "http://localhost:5129/api";
const API_SAN_PHAM = `${API_BASE}/san-pham`;
const API_HOA_DON = `${API_BASE}/hoa-don`;
const API_KHACH_HANG = `${API_BASE}/khach-hang`;

let dsSanPhamCache = [];
let dsKhachHangCache = [];
let dsHoaDonCache = [];
let bieuDoDoanhThuChart = null;
let duLieuBieuDoDoanhThu = null;

function getAuthHeaders() {
    const token = localStorage.getItem('token') || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function dinhDangTien(soTien) {
    return (soTien || 0).toLocaleString('vi-VN') + ' ₫';
}

function dinhDangNgay(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const ngay = String(d.getDate()).padStart(2, '0');
    const thang = String(d.getMonth() + 1).padStart(2, '0');
    return `${ngay}/${thang}/${d.getFullYear()}`;
}

function lopTrangThai(trangThai) {
    if (trangThai === 'Đã hủy') return 'status-cancelled';
    if (trangThai === 'Đã giao hàng' || trangThai === 'Đã thanh toán') return 'status-success';
    if (trangThai === 'Đang xử lý') return 'status-warning';
    return 'status-pending';
}

async function taiTongSanPham() {
    const el = document.getElementById('statSanPham');
    try {
        const res = await fetch(API_SAN_PHAM, { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        dsSanPhamCache = Array.isArray(data) ? data : [];
        el.textContent = dsSanPhamCache.length;
    } catch (e) {
        dsSanPhamCache = [];
        el.textContent = '0';
    }
}

async function taiTongKhachHang() {
    const el = document.getElementById('statKhachHang');
    try {
        const res = await fetch(API_KHACH_HANG, { headers: getAuthHeaders(), cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        dsKhachHangCache = Array.isArray(data) ? data : [];
        el.textContent = dsKhachHangCache.length;
    } catch (e) {
        dsKhachHangCache = [];
        el.textContent = '0';
    }
}

async function taiHoaDonVaCapNhatBangDieuKhien() {
    const elDoanhThu = document.getElementById('statDoanhThu');
    const elDonHangMoi = document.getElementById('statDonHangMoi');
    const tbody = document.getElementById('tblDonHangMoiGanDay');

    try {
        const res = await fetch(API_HOA_DON, { headers: getAuthHeaders(), cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        dsHoaDonCache = Array.isArray(data) ? data : [];

        const tongDoanhThu = dsHoaDonCache
            .filter(hd => hd.trangThaiGiaoHang !== 'Đã hủy')
            .reduce((tong, hd) => tong + (hd.tongTien || 0), 0);
        elDoanhThu.textContent = dinhDangTien(tongDoanhThu);

        const soDonHangMoi = dsHoaDonCache.filter(hd =>
            hd.trangThaiGiaoHang === 'Chờ thanh toán' || hd.trangThaiGiaoHang === 'Đang xử lý'
        ).length;
        elDonHangMoi.textContent = soDonHangMoi;

        const dsGanDay = [...dsHoaDonCache]
            .sort((a, b) => new Date(b.ngayLapHD) - new Date(a.ngayLapHD))
            .slice(0, 5);

        tbody.innerHTML = '';

        if (dsGanDay.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Chưa có đơn hàng nào.</td></tr>';
        } else {
            dsGanDay.forEach(hd => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${hd.maHD ?? ''}</strong></td>
                    <td>${hd.tenKhachHang ?? ''}</td>
                    <td>${dinhDangNgay(hd.ngayLapHD)}</td>
                    <td class="price-text">${dinhDangTien(hd.tongTien)}</td>
                    <td><span class="status-badge ${lopTrangThai(hd.trangThaiGiaoHang)}">${hd.trangThaiGiaoHang ?? ''}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }

        veBieuDoDoanhThu(dsHoaDonCache);
    } catch (e) {
        dsHoaDonCache = [];
        elDoanhThu.textContent = dinhDangTien(0);
        elDonHangMoi.textContent = '0';
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Không thể tải dữ liệu đơn hàng.</td></tr>';
        veBieuDoDoanhThu([]);
    }
}

function veBieuDoDoanhThu(dsHoaDon) {
    const soNgay = 30;
    const nhanNgay = [];
    const doanhThuTheoNgay = [];
    const homNay = new Date();
    homNay.setHours(0, 0, 0, 0);

    const mapDoanhThu = {};
    dsHoaDon
        .filter(hd => hd.trangThaiGiaoHang !== 'Đã hủy' && hd.ngayLapHD)
        .forEach(hd => {
            const d = new Date(hd.ngayLapHD);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            mapDoanhThu[key] = (mapDoanhThu[key] || 0) + (hd.tongTien || 0);
        });

    for (let i = soNgay - 1; i >= 0; i--) {
        const d = new Date(homNay);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        nhanNgay.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
        doanhThuTheoNgay.push(mapDoanhThu[key] || 0);
    }

    duLieuBieuDoDoanhThu = { nhan: nhanNgay, gia: doanhThuTheoNgay };

    const ctx = document.getElementById('bieuDoDoanhThu');
    if (!ctx) return;

    if (typeof Chart === 'undefined') {
        const wrapper = ctx.closest('.chart-canvas-wrapper');
        if (wrapper) {
            wrapper.innerHTML = '<div class="chart-load-error">Không thể tải thư viện biểu đồ (Chart.js). Vui lòng kiểm tra kết nối mạng và tải lại trang.</div>';
        }
        return;
    }

    if (bieuDoDoanhThuChart) {
        bieuDoDoanhThuChart.data.labels = nhanNgay;
        bieuDoDoanhThuChart.data.datasets[0].data = doanhThuTheoNgay;
        bieuDoDoanhThuChart.update();
        return;
    }

    bieuDoDoanhThuChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: nhanNgay,
            datasets: [{
                label: 'Doanh Thu',
                data: doanhThuTheoNgay,
                borderColor: '#b08968',
                backgroundColor: 'rgba(176, 137, 104, 0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#b08968'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => dinhDangTien(context.parsed.y)
                    }
                }
            },
            scales: {
                x: {
                    ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => Number(value).toLocaleString('vi-VN')
                    }
                }
            }
        }
    });
}

function xuatExcelDoanhThu() {
    if (typeof XLSX === 'undefined' || !duLieuBieuDoDoanhThu) return;

    const rows = duLieuBieuDoDoanhThu.nhan.map((ngay, i) => ({
        'Ngày': ngay,
        'Doanh Thu (₫)': duLieuBieuDoDoanhThu.gia[i]
    }));

    const tongDoanhThu = duLieuBieuDoDoanhThu.gia.reduce((a, b) => a + b, 0);
    rows.push({ 'Ngày': 'Tổng Cộng (30 Ngày)', 'Doanh Thu (₫)': tongDoanhThu });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 22 }, { wch: 20 }];

    for (let i = 0; i < rows.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: 1 });
        if (ws[cellRef]) ws[cellRef].z = '#,##0';
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DoanhThu30Ngay');

    const now = new Date();
    const tenFile = `BaoCaoDoanhThu_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, tenFile);
}

function timKiemToanCuc(tuKhoa) {
    const container = document.getElementById('dashboardSearchResults');
    const kw = (tuKhoa || '').trim().toLowerCase();

    if (!kw) {
        container.classList.remove('active');
        container.innerHTML = '';
        return;
    }

    const ketQuaHoaDon = dsHoaDonCache.filter(hd =>
        (hd.maHD || '').toLowerCase().includes(kw) ||
        (hd.tenKhachHang || '').toLowerCase().includes(kw)
    ).slice(0, 5);

    const ketQuaKhachHang = dsKhachHangCache.filter(kh =>
        (kh.tenKhachHang || '').toLowerCase().includes(kw) ||
        (kh.sdtKhachHang || '').toLowerCase().includes(kw) ||
        (kh.email || '').toLowerCase().includes(kw)
    ).slice(0, 5);

    const ketQuaSanPham = dsSanPhamCache.filter(sp =>
        (sp.tenSP || '').toLowerCase().includes(kw) ||
        (sp.maSP || '').toLowerCase().includes(kw)
    ).slice(0, 5);

    let html = '';

    if (ketQuaHoaDon.length > 0) {
        html += '<div class="search-results-group-title">Hóa Đơn</div>';
        ketQuaHoaDon.forEach(hd => {
            html += `
                <div class="search-result-item" data-target="hoadon.html">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <div class="search-result-main">
                        <span class="search-result-title">${hd.maHD ?? ''} - ${hd.tenKhachHang ?? ''}</span>
                        <span class="search-result-sub">${dinhDangTien(hd.tongTien)} • ${hd.trangThaiGiaoHang ?? ''}</span>
                    </div>
                </div>
            `;
        });
    }

    if (ketQuaKhachHang.length > 0) {
        html += '<div class="search-results-group-title">Khách Hàng</div>';
        ketQuaKhachHang.forEach(kh => {
            html += `
                <div class="search-result-item" data-target="khachhang.html">
                    <i class="fas fa-user"></i>
                    <div class="search-result-main">
                        <span class="search-result-title">${kh.tenKhachHang ?? ''}</span>
                        <span class="search-result-sub">${kh.sdtKhachHang ?? kh.email ?? ''}</span>
                    </div>
                </div>
            `;
        });
    }

    if (ketQuaSanPham.length > 0) {
        html += '<div class="search-results-group-title">Sản Phẩm</div>';
        ketQuaSanPham.forEach(sp => {
            html += `
                <div class="search-result-item" data-target="admin_sanpham.html">
                    <i class="fas fa-couch"></i>
                    <div class="search-result-main">
                        <span class="search-result-title">${sp.tenSP ?? ''}</span>
                        <span class="search-result-sub">${dinhDangTien(sp.giaBan)}</span>
                    </div>
                </div>
            `;
        });
    }

    if (!html) {
        html = '<div class="search-results-empty">Không tìm thấy kết quả phù hợp.</div>';
    }

    container.innerHTML = html;
    container.classList.add('active');

    container.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            window.location.href = item.getAttribute('data-target');
        });
    });
}

function khoiTaoThanhTimKiem() {
    const input = document.getElementById('dashboardSearchInput');
    const container = document.getElementById('dashboardSearchResults');
    if (!input || !container) return;

    let debounceTimer = null;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => timKiemToanCuc(input.value), 200);
    });

    input.addEventListener('focus', () => {
        if (input.value.trim()) timKiemToanCuc(input.value);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar-wrapper')) {
            container.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            container.classList.remove('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    taiTongSanPham();
    taiTongKhachHang();
    taiHoaDonVaCapNhatBangDieuKhien();
    khoiTaoThanhTimKiem();

    const btnXuatExcel = document.getElementById('btnXuatExcelDoanhThu');
    if (btnXuatExcel) btnXuatExcel.addEventListener('click', xuatExcelDoanhThu);
});
