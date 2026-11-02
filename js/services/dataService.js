/**
 * DATA SERVICE
 * Satu-satunya modul yang mengakses penyimpanan (localStorage): produk & pesanan.
 * Tidak menyentuh DOM. Semua method async agar mudah diganti ke API/fetch.
 */
const KEY_PRODUK = 'katalog-umkm-tani:v1';
const KEY_PESANAN = 'katalog-umkm-tani:pesanan:v1';

export const KATEGORI = ['Sayuran', 'Buah', 'Beras & Serealia', 'Rempah', 'Olahan'];
const STATUS = ['Menunggu', 'Dikirim', 'Selesai'];
export const STOK_MENIPIS = 10;

const SEED = [
  { nama: 'Cabai Rawit Merah', kategori: 'Rempah', harga: 45000, stok: 30, satuan: 'kg', penjual: 'Tani Makmur Kaliurang', kontak: '081234567801', deskripsi: 'Cabai rawit segar dipetik pagi hari, pedas mantap.' },
  { nama: 'Beras Menthik Wangi', kategori: 'Beras & Serealia', harga: 16500, stok: 120, satuan: 'kg', penjual: 'Kelompok Tani Bantul', kontak: '081234567802', deskripsi: 'Beras pulen beraroma wangi, panen musim ini.' },
  { nama: 'Pisang Raja Nangka', kategori: 'Buah', harga: 28000, stok: 0, satuan: 'ikat', penjual: 'Kebun Bu Sri', kontak: '081234567803', deskripsi: 'Pisang matang pohon, manis dan legit.' },
  { nama: 'Bayam Hijau Organik', kategori: 'Sayuran', harga: 4000, stok: 80, satuan: 'ikat', penjual: 'Organik Sleman', kontak: '081234567804', deskripsi: 'Tanpa pestisida kimia, ditanam sistem hidroponik.' },
  { nama: 'Keripik Singkong Pedas', kategori: 'Olahan', harga: 15000, stok: 45, satuan: 'pak', penjual: 'Dapur Desa Gunungkidul', kontak: '081234567805', deskripsi: 'Camilan renyah dari singkong lokal, 250 gram.' },
];

const wait = () => new Promise((r) => setTimeout(r, 0));
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage penuh/diblokir */ }
}
function load(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function readProduk() {
  const data = load(KEY_PRODUK);
  if (data) return data;
  const seeded = SEED.map((p, i) => ({ ...p, id: newId(), createdAt: Date.now() - i * 1000 }));
  save(KEY_PRODUK, seeded);
  return seeded;
}
const readPesanan = () => load(KEY_PESANAN) ?? [];

export const dataService = {
  /* ----- Produk ----- */
  async getAll() { await wait(); return readProduk(); },
  async getById(id) { return (await this.getAll()).find((p) => p.id === id) ?? null; },

  async create(data) {
    const item = { ...data, id: newId(), createdAt: Date.now() };
    save(KEY_PRODUK, [item, ...readProduk()]);
    return item;
  },

  async update(id, data) {
    const list = readProduk();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Produk tidak ditemukan.');
    list[idx] = { ...list[idx], ...data, id };
    save(KEY_PRODUK, list);
    return list[idx];
  },

  async remove(id) { save(KEY_PRODUK, readProduk().filter((p) => p.id !== id)); },

  /* ----- Pesanan ----- */
  async getOrders() { await wait(); return readPesanan(); },

  /** Buat pesanan + kurangi stok secara atomik. Melempar error jika stok tidak cukup. */
  async createOrder({ productId, jumlah, pembeli }) {
    const list = readProduk();
    const idx = list.findIndex((p) => p.id === productId);
    if (idx === -1) throw new Error('Produk tidak ditemukan atau sudah dihapus.');
    const p = list[idx];
    if (jumlah > p.stok) throw new Error(`Stok tidak cukup. Sisa ${p.stok} ${p.satuan}.`);

    list[idx] = { ...p, stok: p.stok - jumlah };
    const order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      tanggal: Date.now(),
      produkId: p.id, namaProduk: p.nama, satuan: p.satuan, harga: p.harga,
      jumlah, total: p.harga * jumlah,
      nama: pembeli.nama, email: pembeli.email, alamat: pembeli.alamat, metode: pembeli.metode,
      status: STATUS[0],
    };
    save(KEY_PRODUK, list);
    save(KEY_PESANAN, [order, ...readPesanan()]);
    return order;
  },

  nextStatus(status) { return STATUS[STATUS.indexOf(status) + 1] ?? null; },

  async advanceOrder(id) {
    const orders = readPesanan();
    const o = orders.find((x) => x.id === id);
    const next = o && this.nextStatus(o.status);
    if (!next) return;
    o.status = next;
    save(KEY_PESANAN, orders);
  },

  /* ----- Query & ringkasan ----- */
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

  summarize(list, orders) {
    return {
      total: list.length,
      menipis: list.filter((p) => p.stok < STOK_MENIPIS).length,
      pesanan: orders.length,
      pendapatan: orders.reduce((s, o) => s + o.total, 0),
    };
  },
};
