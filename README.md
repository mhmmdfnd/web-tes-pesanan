# FFZ Order Panel

Panel web sederhana untuk proses topup manual melalui FFZ Store Reseller API.

## Fitur
- Game/kategori otomatis dari FFZ Store.
- Produk, SKU, harga otomatis dari FFZ Store.
- Form User ID dan Server/Zone ID sesuai kebutuhan kategori.
- Reference ID otomatis/idempotency.
- Proses order melalui `POST /orders`.
- Cek status order dari FFZ Store.
- Riwayat order lokal di browser.
- Cek saldo reseller.
- API key hanya berada di server/Vercel environment.

## Deploy Vercel
1. Upload folder ini ke GitHub.
2. Import repository ke Vercel.
3. Tambahkan Environment Variables:
   - `FFZ_API_KEY` = API key FFZ Store.
   - `APP_URL` = URL deployment, contoh `https://nama-project.vercel.app`.
4. Deploy.
5. Pastikan API key FFZ Store sudah mempunyai IP allowlist sesuai dokumentasi FFZ Store.

## Catatan keamanan
Jangan memasukkan API key ke `public/index.html`. API key dipakai hanya oleh `api/index.js`.

## Catatan data
Riwayat order pada versi ini disimpan di localStorage browser. Data transaksi sebenarnya tetap berada di FFZ Store dan dapat diambil melalui endpoint orders.
