/**
 * UI RENDERER
 * Hanya mengurus tampilan/DOM. Tidak ada logika bisnis atau akses data.
 * Memakai createElement + textContent (bukan innerHTML) agar aman dari XSS.
 */
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const tanggal = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
export const formatRupiah = (n) => rupiah.format(n);

function el(tag, { className, text, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  children.forEach((c) => node.append(c));
  return node;
}
const btn = (text, className, label, onClick, disabled = false) => {
  const b = el('button', { className: `btn btn-small ${className}`, text, attrs: { type: 'button', 'aria-label': label } });
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
};
const td = (...children) => el('td', {}, children.map((c) => (typeof c === 'string' ? document.createTextNode(c) : c)));
const emptyRow = (cols, text) => el('tr', {}, [el('td', { className: 'cell-empty', text, attrs: { colspan: String(cols) } })]);

function waLink(kontak, nama) {
  const nomor = kontak.replace(/^\+/, '').replace(/^0/, '62');
  return `https://wa.me/${nomor}?text=${encodeURIComponent(`Halo, saya tertarik dengan ${nama}.`)}`;
}

/* ---------- Kartu produk (mode toko) ---------- */
function createCard(p, { onBuy }) {
  const habis = p.stok <= 0;
  const beli = el('button', { className: 'btn btn-primary btn-small', text: habis ? 'Stok habis' : 'Beli', attrs: { type: 'button', 'aria-label': `Beli ${p.nama}` } });
  beli.disabled = habis;
  beli.addEventListener('click', () => onBuy(p.id));
  const wa = el('a', { className: 'btn btn-small', text: 'Hubungi', attrs: { href: waLink(p.kontak, p.nama), target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Hubungi penjual ${p.penjual} via WhatsApp` } });

  return el('article', { className: 'card' }, [
    el('div', { className: 'card-body' }, [
      el('span', { className: 'badge', text: p.kategori }),
      el('h3', { text: p.nama }),
      el('p', { className: 'price' }, [document.createTextNode(rupiah.format(p.harga)), el('small', { text: ` / ${p.satuan}` })]),
      el('p', { className: `meta ${habis ? 'stok-habis' : ''}`, text: habis ? 'Stok habis' : `Stok: ${p.stok} ${p.satuan}` }),
      el('p', { className: 'meta', text: `Penjual: ${p.penjual}` }),
      el('p', { className: 'meta', text: p.deskripsi || 'Belum ada deskripsi.' }),
    ]),
    el('div', { className: 'card-actions' }, [beli, wa]),
  ]);
}

export const ui = {
  /* ---------- Mode ---------- */
  setMode(mode) {
    const admin = mode === 'admin';
    document.getElementById('view-client').hidden = admin;
    document.getElementById('view-admin').hidden = !admin;
    const b = document.getElementById('btn-mode');
    b.textContent = admin ? 'Kembali ke toko' : 'Admin';
    b.setAttribute('aria-pressed', String(admin));
    document.getElementById('tagline').textContent = admin
      ? 'Mode admin — kelola produk, stok, dan pesanan'
      : 'Hasil bumi segar langsung dari UMKM pertanian lokal';
    document.title = admin ? 'Admin — Pasar Tani' : 'Pasar Tani — Katalog Produk UMKM Pertanian';
  },

  /* ---------- Toko ---------- */
  renderProducts(container, products, handlers) {
    container.replaceChildren();
    if (products.length === 0) {
      container.append(el('p', { className: 'empty', text: 'Tidak ada produk yang cocok. Coba ubah kata kunci atau kategori.' }));
      return;
    }
    const frag = document.createDocumentFragment();
    products.forEach((p) => frag.append(createCard(p, handlers)));
    container.append(frag);
  },

  renderResultInfo(node, shown, total) {
    node.textContent = shown === total ? `Menampilkan ${total} produk.` : `Menampilkan ${shown} dari ${total} produk.`;
  },

  renderOptions(select, options, placeholder) {
    select.replaceChildren(el('option', { text: placeholder, attrs: { value: '' } }),
      ...options.map((o) => el('option', { text: o, attrs: { value: o } })));
  },

  /* ---------- Admin ---------- */
  renderSummary(container, s) {
    const items = [['Total produk', s.total], ['Stok menipis', s.menipis], ['Pesanan', s.pesanan], ['Pendapatan', rupiah.format(s.pendapatan)]];
    container.replaceChildren(...items.map(([label, val]) =>
      el('div', {}, [el('dt', { text: label }), el('dd', { text: String(val) })])));
  },

  renderInventory(tbody, products, { onEdit, onDelete, stokMenipis }) {
    tbody.replaceChildren();
    if (!products.length) return tbody.append(emptyRow(5, 'Belum ada produk. Tambahkan lewat formulir.'));
    products.forEach((p) => {
      const rendah = p.stok < stokMenipis;
      tbody.append(el('tr', {}, [
        td(el('strong', { text: p.nama }), el('small', { text: p.penjual })),
        td(p.kategori),
        td(`${rupiah.format(p.harga)} / ${p.satuan}`),
        td(el('span', { className: rendah ? 'stok-rendah' : '', text: `${p.stok} ${p.satuan}` }), rendah ? el('small', { text: p.stok === 0 ? 'Habis' : 'Menipis' }) : ''),
        td(el('div', { className: 'row-actions' }, [
          btn('Ubah', '', `Ubah ${p.nama}`, () => onEdit(p.id)),
          btn('Hapus', 'btn-danger', `Hapus ${p.nama}`, () => onDelete(p)),
        ])),
      ]));
    });
  },

  renderOrders(tbody, orders, { onAdvance, nextStatus }) {
    tbody.replaceChildren();
    if (!orders.length) return tbody.append(emptyRow(7, 'Belum ada pesanan masuk.'));
    orders.forEach((o) => {
      const next = nextStatus(o.status);
      tbody.append(el('tr', {}, [
        td(el('strong', { text: o.id }), el('small', { text: tanggal.format(o.tanggal) })),
        td(el('strong', { text: o.nama }), el('small', { text: o.email }), el('small', { text: o.alamat })),
        td(`${o.namaProduk} × ${o.jumlah} ${o.satuan}`),
        td(rupiah.format(o.total)),
        td(o.metode),
        td(el('span', { className: 'status', text: o.status, attrs: { 'data-status': o.status } })),
        td(next ? btn(`Tandai ${next.toLowerCase()}`, '', `Tandai pesanan ${o.id} ${next}`, () => onAdvance(o.id)) : ''),
      ]));
    });
  },

  setProductFormMode(form, editing) {
    document.getElementById('judul-form-produk').textContent = editing ? 'Ubah produk' : 'Tambah produk';
    document.getElementById('btn-simpan').textContent = editing ? 'Simpan perubahan' : 'Tambah produk';
    document.getElementById('btn-batal-ubah').hidden = !editing;
  },

  fillForm(form, data = {}) {
    form.reset();
    ['id', 'nama', 'kategori', 'satuan', 'harga', 'stok', 'penjual', 'kontak', 'deskripsi']
      .forEach((k) => { if (form.elements[k]) form.elements[k].value = data[k] ?? ''; });
    this.clearErrors(form);
    this.updateCounter(form);
  },

  updateCounter(form) { form.querySelector('#hitung').textContent = form.elements.deskripsi.value.length; },

  /* ---------- Checkout ---------- */
  fillCheckout(form, p) {
    form.reset();
    this.clearErrors(form);
    form.elements.productId.value = p.id;
    form.elements.jumlah.max = String(p.stok);
    form.elements.jumlah.value = '1';
    document.getElementById('ringkasan-beli').textContent =
      `${p.nama} — ${rupiah.format(p.harga)} / ${p.satuan} (stok ${p.stok} ${p.satuan})`;
    this.updateTotal(form, p);
  },

  updateTotal(form, p) {
    const n = Number(form.elements.jumlah.value);
    document.getElementById('total-beli').textContent = rupiah.format(Number.isFinite(n) && n > 0 ? n * p.harga : 0);
  },

  showSuccess(order) {
    document.getElementById('sukses-teks').textContent =
      `Terima kasih, ${order.nama}. Kode pesanan ${order.id} (${order.namaProduk} × ${order.jumlah} ${order.satuan}, total ${rupiah.format(order.total)}) ` +
      `akan dikirim ke alamat Anda. Konfirmasi dikirim ke ${order.email}.`;
    document.getElementById('dialog-sukses').showModal();
  },

  /* ---------- Error & toast ---------- */
  showFieldError(form, name, message) {
    const field = form.elements[name];
    const slot = form.querySelector(`[data-error-for="${name}"]`);
    if (!field || !slot) return;
    slot.textContent = message;
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) { slot.id = `err-${form.id}-${name}`; field.setAttribute('aria-describedby', slot.id); }
    else field.removeAttribute('aria-describedby');
  },

  showErrors(form, errors) {
    Object.keys(errors).forEach((k) => this.showFieldError(form, k, errors[k]));
    const first = Object.keys(errors)[0];
    if (first) form.elements[first].focus();
  },

  clearErrors(form) {
    form.querySelectorAll('[data-error-for]').forEach((s) => this.showFieldError(form, s.dataset.errorFor, ''));
  },

  toast(message, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = message;
    t.dataset.type = type;
    t.hidden = false;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => { t.hidden = true; }, 2800);
  },
};
