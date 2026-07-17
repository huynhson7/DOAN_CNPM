async function apiRequest(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("accessToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}