document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id"); // vd: SP01
  document.getElementById("product-detail").innerHTML = 
    `<p>Đang tải chi tiết sản phẩm mã: ${productId}...</p>`;
  // Task sau (gọi API GET /products/:id) sẽ render đầy đủ TenSP, DonGia, MoTa, HinhAnh
});