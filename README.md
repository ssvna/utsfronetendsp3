# Pasar Tani — Katalog Produk UMKM Pertanian

Mini Project UTS. Dibangun dengan **Vanilla JavaScript (ES6+ Modules)**, **HTML5 semantik**, dan **CSS murni**
(tanpa Bootstrap, Tailwind, jQuery, React, atau library eksternal lain).

## Fitur
- Daftar produk (kartu) + ringkasan statistik
- Cari (nama/penjual), saring kategori, urutkan (terbaru, harga, nama)
- CRUD: tambah, ubah, hapus produk (dialog `<dialog>` native)
- Validasi form real-time dan saat submit, pesan error aksesibel (`aria-invalid`, `aria-describedby`)
- Tombol "Hubungi" ke WhatsApp penjual
- Data tersimpan di `localStorage`, responsif, mendukung dark mode & keyboard

## Struktur
```
katalog-umkm-tani/
├── index.html
├── css/style.css
└── js/
    ├── main.js                    # orkestrator (event & alur aplikasi)
    ├── services/dataService.js    # DATA SERVICE: CRUD, query, localStorage
    ├── validators/formValidator.js# FORM VALIDATOR: aturan validasi & sanitasi
    └── ui/uiRenderer.js           # UI RENDERER: manipulasi DOM, toast, error
```

| Modul | Tanggung jawab | Boleh menyentuh DOM? | Boleh akses storage? |
|---|---|---|---|
| `dataService` | Data & logika query | Tidak | Ya |
| `formValidator` | Validasi input | Tidak | Tidak |
| `uiRenderer` | Tampilan | Ya | Tidak |

## Cara menjalankan
ES Modules **tidak bisa** dibuka lewat `file://`. Jalankan server statis lokal:
```bash
python -m http.server 8000     # lalu buka http://localhost:8000
# atau di VS Code: ekstensi "Live Server"
```
