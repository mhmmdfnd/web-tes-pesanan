const BASE_URL = "https://api.ffzstore.id/api/v1";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function ffz(path, options = {}) {
  const key = process.env.FFZ_API_KEY;
  if (!key) throw new Error("FFZ_API_KEY belum diatur di Vercel Environment Variables.");

  const headers = {
    "X-API-Key": key,
    "Accept": "application/json",
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();

  let data;
  try { data = JSON.parse(text); }
  catch { data = { success: false, message: text || `HTTP ${response.status}` }; }

  if (!response.ok || data.success === false) {
    const err = new Error(data.message || `FFZ API HTTP ${response.status}`);
    err.status = response.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function clean(v, max = 512) {
  return String(v ?? "").trim().slice(0, max);
}

function makeReference() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `WEB-${stamp}-${rnd}`;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname.replace(/^\/api/, "") || "/";

    if (req.method === "GET" && path === "/health") {
      return json(res, 200, { success: true, message: "FFZ Order Panel online" });
    }

    if (req.method === "GET" && path === "/catalog") {
      const data = await ffz("/products/all");
      return json(res, 200, data);
    }

    if (req.method === "GET" && path === "/categories") {
      const withProducts = url.searchParams.get("with_products") || "true";
      const data = await ffz(`/categories?with_products=${encodeURIComponent(withProducts)}`);
      return json(res, 200, data);
    }

    if (req.method === "GET" && path === "/account") {
      const data = await ffz("/account/me");
      return json(res, 200, data);
    }

    if (req.method === "GET" && path === "/orders") {
      const params = new URLSearchParams();
      for (const name of ["status", "reference_id", "from", "to", "page", "per_page"]) {
        const value = url.searchParams.get(name);
        if (value) params.set(name, value);
      }
      const data = await ffz(`/orders${params.toString() ? "?" + params.toString() : ""}`);
      return json(res, 200, data);
    }

    const orderMatch = path.match(/^\/orders\/([^/]+)$/);
    if (req.method === "GET" && orderMatch) {
      const data = await ffz(`/orders/${encodeURIComponent(orderMatch[1])}`);
      return json(res, 200, data);
    }

    const refMatch = path.match(/^\/orders\/by-reference\/([^/]+)$/);
    if (req.method === "GET" && refMatch) {
      const data = await ffz(`/orders/by-reference/${encodeURIComponent(refMatch[1])}`);
      return json(res, 200, data);
    }

    if (req.method === "POST" && path === "/orders") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      const product_sku = clean(body.product_sku, 64);
      const user_id = clean(body.user_id, 128);
      const server_id = clean(body.server_id, 128);
      const reference_id = clean(body.reference_id, 128) || makeReference();

      if (!product_sku) return json(res, 400, { success: false, message: "Produk wajib dipilih." });
      if (!user_id) return json(res, 400, { success: false, message: "User ID wajib diisi." });

      const customer = { user_id };
      if (server_id) customer.server_id = server_id;

      const payload = {
        product_sku,
        customer,
        reference_id
      };

      // Callback hanya dikirim jika APP_URL sudah diisi.
      if (process.env.APP_URL) {
        payload.callback_url = `${process.env.APP_URL.replace(/\/$/, "")}/api/callback`;
      }

      const data = await ffz("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      return json(res, 200, data);
    }

    // Endpoint callback disediakan agar mudah diaktifkan untuk sinkronisasi
    // lanjutan. Untuk panel ini, status order tetap diambil langsung dari FFZ.
    if (req.method === "POST" && path === "/callback") {
      return json(res, 200, { success: true, message: "Callback received" });
    }

    return json(res, 404, { success: false, message: "Endpoint tidak ditemukan." });
  } catch (err) {
    console.error(err);
    return json(res, err.status || 500, {
      success: false,
      message: err.message || "Terjadi kesalahan server.",
      error: err.payload?.error || null
    });
  }
}
