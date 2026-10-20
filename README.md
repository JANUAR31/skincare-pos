# Skincare POS Complete Final

Sistem kasir toko skincare final lengkap berbasis Next.js, TypeScript, Prisma 7, dan MySQL.

## Fitur

- Login admin dan kasir
- Pencarian produk cepat berdasarkan nama atau kode
- Gambar produk
- Diskon per item
- Diskon per transaksi
- Cetak struk / nota 58mm
- Stok masuk dan stok keluar
- Stock opname
- Riwayat pergerakan stok
- Penyesuaian stok karena rusak atau hilang
- Nomor batch produk
- Tanggal kedaluwarsa
- Laporan stok akan expired
- Penjualan harian, mingguan, bulanan
- Produk terlaris
- Produk kurang laku
- Laba rugi
- Omset per kategori
- Stok saat ini
- Stok menipis
- Produk expired
- Pengaturan nama toko dan catatan nota

## Akun awal

Admin: admin / admin123
Kasir: kasir / kasir123

## Cara menjalankan

1. Jalankan `npm.cmd install`
2. Copy `.env.example` menjadi `.env`
3. Import `skincare_pos_complete_final.sql` lewat phpMyAdmin
4. Jalankan `npx.cmd prisma generate`
5. Jalankan `npm.cmd run dev`
6. Buka `http://localhost:3000`
