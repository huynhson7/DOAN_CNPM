async function loadLayout() {
  const headerRes = await fetch("/components/header.html");
  document.getElementById("header-placeholder").innerHTML = await headerRes.text();

  const footerRes = await fetch("/components/footer.html");
  document.getElementById("footer-placeholder").innerHTML = await footerRes.text();

  const token = localStorage.getItem("accessToken");
  const authLink = document.getElementById("auth-link");
  if (token && authLink) {
    authLink.textContent = "Đăng xuất";
    authLink.href = "#";
    authLink.onclick = () => {
      localStorage.removeItem("accessToken");
      window.location.href = "/index.html";
    };
  }
}

document.addEventListener("DOMContentLoaded", loadLayout);