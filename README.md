# Online Shop — React + Vite + Duitku POP + Supabase

Starter project untuk **fase sandbox**: katalog produk digital, keranjang, checkout invoice Duitku, callback status pembayaran, dan halaman status pesanan. Pengiriman produk manual serta dashboard admin belum dibuat.

## Kebutuhan

- Node.js 20 atau versi LTS yang didukung Vite/Vercel
- Akun Supabase
- Akun Duitku dengan kredensial sandbox
- Akun Vercel untuk callback publik (callback Duitku tidak dapat mengakses localhost secara langsung)

## 1. Install lokal

Ekstrak ZIP, buka folder `online-shop-duitku` di terminal, lalu jalankan:

```bash
npm install
```

Salin `.env.example` menjadi `.env.local`, kemudian isi nilai Supabase dan Duitku sandbox. Jangan commit `.env.local`.

## 2. Setup Supabase

1. Buat project Supabase.
2. Buka SQL Editor.
3. Jalankan isi `supabase/schema.sql`.
4. Buka Table Editor → `products` → Insert row.
5. Isi `name`, `slug` unik, `description`, `price_idr` (angka Rupiah), `product_type = manual`, dan `is_active = true`.
6. Ambil Project URL dan publishable key dari dashboard Supabase. Secret key hanya untuk backend.

Contoh `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_URL=https://PROJECT_ID.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
DUITKU_MERCHANT_CODE=DXXXX
DUITKU_API_KEY=API_KEY_SANDBOX
DUITKU_BASE_URL=https://api-sandbox.duitku.com
APP_BASE_URL=https://YOUR-VERCEL-DEPLOYMENT.vercel.app
```

`APP_BASE_URL` harus berupa URL publik HTTPS ketika ingin callback Duitku mencapai aplikasi. Saat development, gunakan URL deployment Preview untuk menguji callback sungguhan. Untuk sekadar menguji UI, alamat localhost cukup, tetapi transaksi/callback end-to-end tidak akan berhasil tanpa URL publik.

## 3. Jalankan frontend

```bash
npm run dev
```

Vite akan menampilkan URL lokal, biasanya `http://localhost:5173`. Mode ini hanya untuk UI; folder `api/` tidak dijalankan oleh Vite sendiri.

## 4. Jalankan frontend + API lokal

```bash
npm run dev:full
```

Perintah ini menggunakan `vercel dev` dan biasanya menyajikan project pada `http://localhost:3000`. Ikuti prompt CLI untuk login/link project jika diminta. Untuk transaksi sandbox yang callback-nya harus masuk, deploy ke Vercel Preview dan set `APP_BASE_URL` ke URL Preview tersebut.

## 5. Deploy ke Vercel

1. Push repository ke GitHub dan import project ke Vercel.
2. Tambahkan environment variables dari `.env.local` di Vercel Project Settings → Environment Variables.
3. Untuk Preview gunakan kredensial sandbox dan `DUITKU_BASE_URL=https://api-sandbox.duitku.com`.
4. Set `APP_BASE_URL` ke URL deployment yang menerima callback.
5. Deploy ulang setelah mengubah environment variables.

Vercel akan membangun frontend Vite dan mengenali endpoint JavaScript di folder `api/` sebagai Functions.

## Endpoint

- `POST /api/checkout` — validasi produk/harga dari database dan buat invoice Duitku.
- `POST /api/duitku-callback` — verifikasi signature callback Duitku dan memperbarui status.
- `GET /api/order-status?order=ORD-...` — mengembalikan status publik minimal untuk halaman status.

## Referensi resmi

- Duitku POP: https://docs.duitku.com/pop/id/
- Supabase secure data: https://supabase.com/docs/guides/database/secure-data
- Vercel Node.js Functions: https://vercel.com/docs/functions/runtimes/node-js

## Batasan keamanan — baca sebelum production

Starter ini dibuat untuk pengembangan sandbox, bukan langsung untuk pembayaran live. Sebelum production, tambahkan rate limiting/bot protection, validasi schema yang lebih ketat, strategi idempotensi dan transaksi database untuk membuat order/items, penanganan kegagalan/kompensasi invoice, expiry/reconciliation, dan proteksi akses status pesanan dengan token acak atau autentikasi. Jangan mengirimkan secret key ke frontend atau menggunakan `VITE_` untuk secret.
