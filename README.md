# Pasar Tani — Katalog Produk UMKM Pertanian

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
