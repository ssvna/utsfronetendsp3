/**
 * DATA SERVICE
 * Satu-satunya modul yang mengakses penyimpanan (localStorage).
 * Tidak menyentuh DOM. Semua method async agar mudah diganti ke API/fetch.
 */
const STORAGE_KEY = 'katalog-umkm-tani:v1';

export const KATEGORI = ['Sayuran', 'Buah', 'Beras & Serealia', 'Rempah', 'Olahan'];

const SEED = [
  { nama: 'Cabai Rawit Merah', kategori: 'Rempah', harga: 45000, stok: 30, satuan: 'kg', penjual: 'Tani Makmur Kaliurang', kontak: '081234567801', deskripsi: 'Cabai rawit segar dipetik pagi hari, pedas mantap.' },
  { nama: 'Beras Menthik Wangi', kategori: 'Beras & Serealia', harga: 16500, stok: 120, satuan: 'kg', penjual: 'Kelompok Tani Bantul', kontak: '081234567802', deskripsi: 'Beras pulen beraroma wangi, panen musim ini.' },
  { nama: 'Pisang Raja Nangka', kategori: 'Buah', harga: 28000, stok: 0, satuan: 'ikat', penjual: 'Kebun Bu Sri', kontak: '081234567803', deskripsi: 'Pisang matang pohon, manis dan legit.' },
  { nama: 'Bayam Hijau Organik', kategori: 'Sayuran', harga: 4000, stok: 80, satuan: 'ikat', penjual: 'Organik Sleman', kontak: '081234567804', deskripsi: 'Tanpa pestisida kimia, ditanam sistem hidroponik.' },
  { nama: 'Keripik Singkong Pedas', kategori: 'Olahan', harga: 15000, stok: 45, satuan: 'pak', penjual: 'Dapur Desa Gunungkidul', kontak: '081234567805', deskripsi: 'Camilan renyah dari singkong lokal, 250 gram.' },
];

const wait = () => new Promise((r) => setTimeout(r, 0));
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

function write(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* storage penuh/diblokir */ }
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* data rusak -> pakai seed */ }
  const seeded = SEED.map((p, i) => ({ ...p, id: newId(), createdAt: Date.now() - i * 1000 }));
  write(seeded);
  return seeded;
}

export const dataService = {
  async getAll() { await wait(); return read(); },

  async getById(id) { return (await this.getAll()).find((p) => p.id === id) ?? null; },

  async create(data) {
    const item = { ...data, id: newId(), createdAt: Date.now() };
    write([item, ...read()]);
    return item;
  },

  async update(id, data) {
    const list = read();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Produk tidak ditemukan.');
    list[idx] = { ...list[idx], ...data, id };
    write(list);
    return list[idx];
  },

  async remove(id) { write(read().filter((p) => p.id !== id)); },

  /** Cari, saring, dan urutkan (logika data, bukan tampilan). */
  query(list, { keyword = '', kategori = '', urutan = 'terbaru' } = {}) {
    const k = keyword.trim().toLowerCase();
    const hasil = list.filter((p) =>
      (!kategori || p.kategori === kategori) &&
      (!k || `${p.nama} ${p.penjual}`.toLowerCase().includes(k)));
    const sorter = {
      'terbaru': (a, b) => b.createdAt - a.createdAt,
      'harga-asc': (a, b) => a.harga - b.harga,
      'harga-desc': (a, b) => b.harga - a.harga,
      'nama-asc': (a, b) => a.nama.localeCompare(b.nama, 'id'),
    }[urutan];
    return sorter ? hasil.sort(sorter) : hasil;
  },

  summarize(list) {
    return {
      total: list.length,
      tersedia: list.filter((p) => p.stok > 0).length,
      penjual: new Set(list.map((p) => p.penjual.toLowerCase())).size,
      kategori: new Set(list.map((p) => p.kategori)).size,
    };
  },
};
